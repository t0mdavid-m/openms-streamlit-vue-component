import type { SequenceData } from '@/types/sequence-data'

export type StructureViewArgs = {
  componentName: 'StructureView'
  title?: string
}

// What Python sends for the selected protein (FLASHApp src/render/structure.py)
export type StructureData = {
  accession: string
  status: 'ok' | 'missing' | 'unavailable'
  message?: string
  format?: 'pdb' | 'cif'
  data?: string
  source?: 'alphafold' | 'upload'
  name?: string
  url?: string
}

// One residue of the structure, read from its CA atom
export type StructureResidue = {
  chain: string
  resi: number
  resn: string
  aa: string
  b: number
}

export type ChainMapping = {
  chain: string
  // Index into `residues` for every position of the database sequence, -1 if unmapped
  dbToResidue: number[]
  residues: StructureResidue[]
  // Database position of every mapped residue number
  dbOfResidue: Map<number, number>
  mapped: number
  identical: number
}

const THREE_TO_ONE: Record<string, string> = {
  ALA: 'A', ARG: 'R', ASN: 'N', ASP: 'D', CYS: 'C', GLN: 'Q', GLU: 'E', GLY: 'G',
  HIS: 'H', ILE: 'I', LEU: 'L', LYS: 'K', MET: 'M', PHE: 'F', PRO: 'P', SER: 'S',
  THR: 'T', TRP: 'W', TYR: 'Y', VAL: 'V', SEC: 'U', PYL: 'O',
  // Common modified or protonation-state residue names
  MSE: 'M', HID: 'H', HIE: 'H', HIP: 'H', HSD: 'H', HSE: 'H', HSP: 'H', CYX: 'C',
  SEP: 'S', TPO: 'T', PTR: 'Y', MLY: 'K', CSO: 'C', KCX: 'K',
}

export function oneLetter(resn: string): string {
  return THREE_TO_ONE[resn.toUpperCase()] ?? 'X'
}

type AtomLike = {
  chain?: string
  resi?: number
  resn?: string
  atom?: string
  b?: number
  hetflag?: boolean
}

// Residues per chain, in file order, from the CA atoms of a parsed model
export function residuesByChain(atoms: AtomLike[]): Map<string, StructureResidue[]> {
  const chains = new Map<string, StructureResidue[]>()
  const seen = new Set<string>()
  for (const atom of atoms) {
    if (atom.atom !== 'CA' || atom.resi === undefined || atom.resn === undefined) continue
    const aa = oneLetter(atom.resn)
    // Ligands and waters have no amino acid name; modified residues (HETATM MSE) do
    if (atom.hetflag && aa === 'X') continue
    const chain = atom.chain ?? ''
    const key = `${chain}:${atom.resi}`
    if (seen.has(key)) continue // alternate locations
    seen.add(key)
    if (!chains.has(chain)) chains.set(chain, [])
    chains.get(chain)!.push({ chain, resi: atom.resi, resn: atom.resn, aa, b: atom.b ?? 0 })
  }
  return chains
}

// Residue numbering that already follows the database sequence (AlphaFold models,
// UniProt-numbered entries): residue n is sequence position n-1.
function mapByNumbering(dbSeq: string, residues: StructureResidue[]): number[] | undefined {
  const dbToResidue = new Array<number>(dbSeq.length).fill(-1)
  let identical = 0
  residues.forEach((r, index) => {
    const pos = r.resi - 1
    if (pos >= 0 && pos < dbSeq.length && dbToResidue[pos] === -1) {
      dbToResidue[pos] = index
      if (dbSeq[pos] === r.aa) identical++
    }
  })
  if (residues.length === 0 || identical < 0.95 * residues.length) return undefined
  return dbToResidue
}

const MATCH = 3
const MISMATCH = -1
const GAP = -2
// Above this many cells the alignment is skipped (several MB of traceback)
const MAX_CELLS = 30_000_000

// Overlap alignment (no penalty for end gaps on either side): the structure may
// cover part of the protein, and the database entry may carry extra residues
// (tags, signal peptides) the structure lacks.
export function alignSequences(a: string, b: string): number[] {
  const n = a.length
  const m = b.length
  const aToB = new Array<number>(n).fill(-1)
  if (n === 0 || m === 0 || n * m > MAX_CELLS) return aToB
  // 0 diagonal, 1 up (gap in b), 2 left (gap in a)
  const trace = new Uint8Array((n + 1) * (m + 1))
  let prev = new Int32Array(m + 1)
  let curr = new Int32Array(m + 1)
  let bestScore = 0
  let bestI = 0
  let bestJ = 0
  for (let j = 1; j <= m; j++) trace[j] = 2
  for (let i = 1; i <= n; i++) {
    curr[0] = 0
    trace[i * (m + 1)] = 1
    const ai = a.charCodeAt(i - 1)
    for (let j = 1; j <= m; j++) {
      const diag = prev[j - 1] + (ai === b.charCodeAt(j - 1) ? MATCH : MISMATCH)
      const up = prev[j] + GAP
      const left = curr[j - 1] + GAP
      let score = diag
      let dir = 0
      if (up > score) { score = up; dir = 1 }
      if (left > score) { score = left; dir = 2 }
      curr[j] = score
      trace[i * (m + 1) + j] = dir
    }
    // End gaps are free: the best alignment ends in the last row or column
    if (curr[m] > bestScore) { bestScore = curr[m]; bestI = i; bestJ = m }
    const swap = prev
    prev = curr
    curr = swap
  }
  for (let j = 1; j <= m; j++) {
    if (prev[j] > bestScore) { bestScore = prev[j]; bestI = n; bestJ = j }
  }
  let i = bestI
  let j = bestJ
  while (i > 0 && j > 0) {
    const dir = trace[i * (m + 1) + j]
    if (dir === 0) {
      aToB[i - 1] = j - 1
      i--
      j--
    } else if (dir === 1) {
      i--
    } else {
      j--
    }
  }
  return aToB
}

export function mapChain(dbSeq: string, chain: string, residues: StructureResidue[]): ChainMapping {
  let dbToResidue = mapByNumbering(dbSeq, residues)
  if (dbToResidue === undefined) {
    const structSeq = residues.map((r) => r.aa).join('')
    const offset = dbSeq.indexOf(structSeq)
    if (structSeq.length > 0 && offset >= 0) {
      dbToResidue = new Array<number>(dbSeq.length).fill(-1)
      for (let k = 0; k < structSeq.length; k++) dbToResidue[offset + k] = k
    } else {
      dbToResidue = alignSequences(dbSeq, structSeq)
    }
  }
  let mapped = 0
  let identical = 0
  const dbOfResidue = new Map<number, number>()
  dbToResidue.forEach((r, pos) => {
    if (r < 0) return
    mapped++
    dbOfResidue.set(residues[r].resi, pos)
    if (residues[r].aa === dbSeq[pos]) identical++
  })
  return { chain, dbToResidue, residues, dbOfResidue, mapped, identical }
}

// The chain that matches the database sequence best
export function bestChainMapping(
  dbSeq: string,
  chains: Map<string, StructureResidue[]>
): ChainMapping | undefined {
  let best: ChainMapping | undefined
  chains.forEach((residues, chain) => {
    const mapping = mapChain(dbSeq, chain, residues)
    if (mapping.identical > 0 && (best === undefined || mapping.identical > best.identical)) {
      best = mapping
    }
  })
  return best
}

export type FragmentSites = {
  nTerminal: Set<number>
  cTerminal: Set<number>
  // Ion types (a, b, c, x, y, z) matched at each residue
  ionTypes: Map<number, Set<string>>
  internalDepth: number[]
  maxInternalDepth: number
  internalCount: number
}

// Residues (database coordinates) at which an N-terminal (a/b/c) fragment ends
// and at which a C-terminal (x/y/z) fragment starts, i.e. the cleavage sites
// the spectrum explains.
export function fragmentSites(
  entry: SequenceData,
  observedMasses: number[] | undefined,
  ionTypes: string[],
  tolerancePpm: number
): FragmentSites {
  const nTerminal = new Set<number>()
  const cTerminal = new Set<number>()
  // Internal fragments covering each residue (FLASHAnnotator only)
  const internalDepth = new Array<number>(entry.sequence.length).fill(0)
  const ionsAt = new Map<number, Set<string>>()
  const addIon = (pos: number, ion: string) => {
    if (!ionsAt.has(pos)) ionsAt.set(pos, new Set())
    ionsAt.get(pos)!.add(ion)
  }
  const sites = { nTerminal, cTerminal, ionTypes: ionsAt, internalDepth, maxInternalDepth: 0, internalCount: 0 }
  if (Array.isArray(entry.annotated_fragments)) {
    // FLASHAnnotator accepted these envelopes on the raw spectrum
    const internal = new Set<string>()
    entry.annotated_fragments.forEach((f) => {
      // z+1 / z+2 count as z, as in the sequence view
      if (f.kind === 'N') {
        nTerminal.add(f.end)
        addIon(f.end, f.ion_type.charAt(0))
      } else if (f.kind === 'C') {
        cTerminal.add(f.start)
        addIon(f.start, f.ion_type.charAt(0))
      } else if (f.kind === 'I') {
        // One piece can be reported at several charges: count it once
        const key = `${f.start}-${f.end}`
        if (internal.has(key) || f.start < 0 || f.end >= internalDepth.length) return
        internal.add(key)
        for (let r = f.start; r <= f.end; r++) internalDepth[r]++
      }
    })
    sites.internalCount = internal.size
    sites.maxInternalDepth = internalDepth.reduce((m, d) => Math.max(m, d), 0)
    return sites
  }
  if (observedMasses === undefined || observedMasses.length === 0) {
    return sites
  }
  // Older results: match theoretical fragment masses against the deconvolved
  // masses, as the sequence view does
  const startReported = entry.proteoform_start ?? 0
  const endReported = entry.proteoform_end ?? entry.sequence.length - 1
  const start = startReported < 0 ? 0 : startReported
  const end = endReported < 0 ? entry.sequence.length - 1 : endReported
  const sorted = [...observedMasses].sort((x, y) => x - y)
  const hit = (mass: number): boolean => {
    const tol = (mass * tolerancePpm) / 1e6
    let lo = 0
    let hi = sorted.length
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (sorted[mid] < mass - tol) lo = mid + 1
      else hi = mid
    }
    return lo < sorted.length && sorted[lo] <= mass + tol
  }
  ionTypes.forEach((ion) => {
    const prefix = ion === 'a' || ion === 'b' || ion === 'c'
    const suffix = ion === 'x' || ion === 'y' || ion === 'z'
    if (prefix && startReported < 0) return
    if (suffix && endReported < 0) return
    const masses = entry[`fragment_masses_${ion}` as keyof SequenceData] as number[][] | undefined
    if (!masses) return
    masses.forEach((candidates, theoIndex) => {
      if (!candidates.some(hit)) return
      if (prefix) {
        nTerminal.add(start + theoIndex)
        addIon(start + theoIndex, ion)
      }
      if (suffix) {
        cTerminal.add(end - theoIndex)
        addIon(end - theoIndex, ion)
      }
    })
  })
  return sites
}

// Fragment marker colours of the sequence view (AminoAcidCell): a/x green,
// b/y blue, c/z red. A residue with several types shows b/y over c/z over a/x.
export const ION_COLORS: { types: string[]; label: string; color: string }[] = [
  { types: ['b', 'y'], label: 'b/y ions', color: '#0000ff' },
  { types: ['c', 'z'], label: 'c/z ions', color: '#ff0000' },
  { types: ['a', 'x'], label: 'a/x ions', color: '#008000' },
]

export function ionColor(types: Set<string> | undefined): string | undefined {
  if (types === undefined) return undefined
  return ION_COLORS.find((c) => c.types.some((t) => types.has(t)))?.color
}

// Internal fragments on the sequence view's scale: rgba(142, 68, 173, 0.25 .. 1) on white
export function internalColor(depth: number, maxDepth: number): string {
  const alpha = maxDepth > 0 ? 0.25 + 0.75 * (depth / maxDepth) : 0
  const mix = (c: number) => Math.round(255 + (c - 255) * alpha)
  return `rgb(${mix(142)}, ${mix(68)}, ${mix(173)})`
}
