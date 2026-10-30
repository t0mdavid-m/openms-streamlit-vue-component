import { describe, expect, it } from 'vitest'
import type { SequenceData } from '@/types/sequence-data'
import {
  alignSequences,
  bestChainMapping,
  fragmentSites,
  ionColor,
  mapChain,
  residuesByChain,
  type StructureResidue,
} from '../structure-mapping'

const ONE_TO_THREE: Record<string, string> = {
  A: 'ALA', R: 'ARG', N: 'ASN', D: 'ASP', C: 'CYS', Q: 'GLN', E: 'GLU', G: 'GLY', H: 'HIS',
  I: 'ILE', L: 'LEU', K: 'LYS', M: 'MET', F: 'PHE', P: 'PRO', S: 'SER', T: 'THR', W: 'TRP',
  Y: 'TYR', V: 'VAL',
}

function residues(seq: string, firstResi = 1, chain = 'A'): StructureResidue[] {
  return [...seq].map((aa, i) => ({ chain, resi: firstResi + i, resn: ONE_TO_THREE[aa], aa, b: 90 }))
}

const DB = 'MSKGEELFTGVVPILVELDGDVNGHKFSVSGEGEGDATYGKLTLKFICTTGKLPVPWPTLVTTFSYGVQCF'

describe('mapChain', () => {
  it('uses residue numbers that follow the database sequence', () => {
    // A model with a gap (missing loop) but UniProt numbering
    const res = residues(DB).filter((r) => r.resi < 20 || r.resi > 30)
    const mapping = mapChain(DB, 'A', res)
    expect(mapping.identical).toBe(res.length)
    expect(mapping.dbToResidue[19]).toBe(-1)
    expect(mapping.dbOfResidue.get(31)).toBe(30)
  })

  it('finds a structure that covers part of the protein under its own numbering', () => {
    const res = residues(DB.slice(10, 50), 101)
    const mapping = mapChain(DB, 'A', res)
    expect(mapping.mapped).toBe(40)
    expect(mapping.dbOfResidue.get(101)).toBe(10)
  })

  it('aligns across a point mutation and a missing loop', () => {
    const mutated = DB.slice(0, 15) + 'W' + DB.slice(16, 30) + DB.slice(36)
    const mapping = mapChain(DB, 'A', residues(mutated, 501))
    expect(mapping.identical).toBe(mutated.length - 1)
    expect(mapping.dbToResidue[40]).toBe(40 - 6)
  })
})

describe('alignSequences', () => {
  it('leaves end gaps free', () => {
    const map = alignSequences('XXXX' + 'ACDEFGHIK', 'ACDEFGHIK' + 'YYYY')
    expect(map.slice(4)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8])
    expect(map.slice(0, 4)).toEqual([-1, -1, -1, -1])
  })
})

describe('residuesByChain / bestChainMapping', () => {
  it('reads CA atoms, skips ligands and picks the matching chain', () => {
    const atoms = [
      ...residues('GGGGGGGGGG', 1, 'B').map((r) => ({ ...r, atom: 'CA' })),
      ...residues(DB, 1, 'A').flatMap((r) => [
        { ...r, atom: 'N' },
        { ...r, atom: 'CA' },
      ]),
      { chain: 'A', resi: 900, resn: 'HOH', atom: 'CA', hetflag: true },
    ]
    const chains = residuesByChain(atoms)
    expect(chains.get('A')?.length).toBe(DB.length)
    const best = bestChainMapping(DB, chains)
    expect(best?.chain).toBe('A')
  })
})

describe('fragmentSites', () => {
  const entry = {
    sequence: [...'MKLVAG'],
    proteoform_start: 1,
    proteoform_end: 5,
    coverage: [],
    maxCoverage: 0,
    theoretical_mass: 0,
    fixed_modifications: [],
    fragment_masses_a: [],
    fragment_masses_b: [[100], [200], [300]],
    fragment_masses_c: [],
    fragment_masses_x: [],
    fragment_masses_y: [[150], [250]],
    fragment_masses_z: [],
  } as SequenceData

  it('uses FLASHAnnotator envelopes when present', () => {
    const sites = fragmentSites(
      {
        ...entry,
        annotated_fragments: [
          { kind: 'N', start: 1, end: 3, ion_type: 'b' },
          { kind: 'C', start: 4, end: 5, ion_type: 'z+1' },
          { kind: 'I', start: 2, end: 3 },
        ] as SequenceData['annotated_fragments'],
      },
      [100],
      ['b', 'y'],
      10
    )
    expect([...sites.nTerminal]).toEqual([3])
    expect([...sites.cTerminal]).toEqual([4])
    expect(ionColor(sites.ionTypes.get(3))).toBe('#0000ff')
    expect(ionColor(sites.ionTypes.get(4))).toBe('#ff0000')
    expect(ionColor(sites.ionTypes.get(2))).toBeUndefined()
    expect(sites.internalPieces).toEqual([[2, 3]])
    expect([...sites.internalEnds].sort()).toEqual([2, 3])
    expect(sites.internalCount).toBe(1)
  })

  it('counts each internal piece once and marks both of its cleavage sites', () => {
    const sites = fragmentSites(
      {
        ...entry,
        annotated_fragments: [
          { kind: 'I', start: 1, end: 3, charge: 1 },
          { kind: 'I', start: 1, end: 3, charge: 2 },
          { kind: 'I', start: 2, end: 4, charge: 1 },
          { kind: 'I', start: 4, end: 9, charge: 1 },
        ] as SequenceData['annotated_fragments'],
      },
      undefined,
      ['b', 'y'],
      10
    )
    expect(sites.internalPieces).toEqual([[1, 3], [2, 4]])
    expect([...sites.internalEnds].sort()).toEqual([1, 2, 3, 4])
    expect(sites.internalCount).toBe(2)
  })

  it('matches theoretical masses within the tolerance otherwise', () => {
    const sites = fragmentSites(entry, [200.001, 150.5], ['b', 'y'], 10)
    expect([...sites.nTerminal]).toEqual([2])
    expect([...sites.cTerminal]).toEqual([])
    const wide = fragmentSites(entry, [200.001, 150.5], ['b', 'y'], 5000)
    expect([...wide.cTerminal]).toEqual([5])
  })
})
