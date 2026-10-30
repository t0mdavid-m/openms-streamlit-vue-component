<template>
  <div class="d-flex justify-center">
    <h4>Structure View</h4>
  </div>

  <v-sheet class="pa-4 rounded-lg" style="max-width: 97%" :theme="theme?.base ?? 'light'" border>
    <div class="d-flex flex-wrap align-center justify-end mb-2">
      <div class="d-flex align-center">
        <v-checkbox
          v-if="sites.internalCount > 0"
          v-model="showInternal"
          label="Internal fragments"
          hide-details
          density="compact"
          class="mr-2"
        ></v-checkbox>
        <v-checkbox
          v-model="showModifications"
          label="Modifications"
          hide-details
          density="compact"
          class="mr-2"
        ></v-checkbox>
        <v-checkbox
          v-model="showUnobserved"
          label="Cleaved termini"
          hide-details
          density="compact"
        ></v-checkbox>
        <v-btn variant="text" icon="mdi-fit-to-screen-outline" size="small" :disabled="!loaded" @click="resetView">
          <v-icon>mdi-fit-to-screen-outline</v-icon>
          <v-tooltip activator="parent" location="bottom">Reset view</v-tooltip>
        </v-btn>
        <v-btn variant="text" icon="mdi-camera" size="small" :disabled="!loaded" @click="downloadImage">
          <v-icon>mdi-camera</v-icon>
          <v-tooltip activator="parent" location="bottom">Save image (PNG)</v-tooltip>
        </v-btn>
      </div>
    </div>

    <div class="structure-container">
      <div ref="viewer" class="structure-viewer" :class="{ 'structure-hidden': !loaded }"></div>
      <div v-if="!loaded" class="structure-placeholder">
        <v-alert :type="placeholderType" variant="tonal" density="comfortable" max-width="560">
          {{ placeholderText }}
        </v-alert>
      </div>
      <div v-if="loaded && hoverText" class="structure-hover">{{ hoverText }}</div>
    </div>

    <div v-if="loaded" class="d-flex flex-wrap align-center justify-space-between mt-2 text-caption">
      <div class="d-flex flex-wrap align-center">
        <template v-for="item in legend" :key="item.label">
          <span class="d-flex align-center mr-3">
            <span class="legend-chip" :class="item.chipClass" :style="item.color ? { background: item.color } : {}"></span>{{ item.label }}
          </span>
        </template>
      </div>
      <div class="text-medium-emphasis">
        <template v-if="structure?.url">
          <a :href="structure.url" target="_blank" rel="noopener">{{ sourceLabel }}</a>
        </template>
        <template v-else>{{ sourceLabel }}</template>
        · {{ mappingLabel }}
      </div>
    </div>
  </v-sheet>
</template>

<script lang="ts">
import { defineComponent, markRaw } from 'vue'
import type { Theme } from 'streamlit-component-lib'
import { useStreamlitDataStore } from '@/stores/streamlit-data'
import { useSelectionStore, type FragmentSelection } from '@/stores/selection'
import type { SequenceData } from '@/types/sequence-data'
import {
  bestChainMapping,
  fragmentSites,
  ionColor,
  ION_COLORS,
  type FragmentSites,
  residuesByChain,
  type ChainMapping,
  type StructureData,
} from './structure-mapping'

// Colours of the sequence view: fragment markers (ION_COLORS), internal
// fragment depth, modification marker, selected residue
const UNCOVERED = '#d9d9d9'
const UNOBSERVED = '#f0f0f0'
const OTHER_CHAIN = '#9e9e9e'
// The sequence view's modification marker: #444cf7 dots on #e5e5f7
const MODIFICATION_DOT = '#444cf7'
const MODIFICATION_BACKGROUND = '#e5e5f7'
const INTERNAL_BRACKET = '#8E44AD'
const SELECTED = '#F3A712'

// A hex colour mixed 70 % with white
function fade(hex: string): string {
  const n = parseInt(hex.slice(1), 16)
  const mix = (c: number) => Math.round(c + (255 - c) * 0.7)
  return `rgb(${mix((n >> 16) & 255)}, ${mix((n >> 8) & 255)}, ${mix(n & 255)})`
}

// The 3Dmol viewer and model live outside Vue's reactivity
type Viewer = any
type Model = any

export default defineComponent({
  name: 'StructureView',
  props: {
    index: {
      type: Number,
      required: true,
    },
  },
  setup() {
    const streamlitDataStore = useStreamlitDataStore()
    const selectionStore = useSelectionStore()
    return { streamlitDataStore, selectionStore }
  },
  data() {
    return {
      showInternal: true,
      showModifications: true,
      showUnobserved: true,
      loaded: false,
      loading: false,
      loadError: '' as string,
      hoverText: '' as string,
      mappingLabel: '' as string,
      viewer: undefined as Viewer | undefined,
      viewerPromise: undefined as Promise<Viewer> | undefined,
      model: undefined as Model | undefined,
      mapping: undefined as ChainMapping | undefined,
      loadedKey: '' as string,
    }
  },
  computed: {
    theme(): Theme | undefined {
      return this.streamlitDataStore.theme
    },
    proteinIndex(): number | undefined {
      return this.selectionStore.selectedProteinIndex
    },
    entry(): SequenceData | undefined {
      const pid = this.proteinIndex
      if (pid === undefined) return undefined
      return this.streamlitDataStore.sequenceData?.[pid]
    },
    structure(): StructureData | undefined {
      return this.streamlitDataStore.allDataForDrawing.structure as unknown as StructureData | undefined
    },
    structureKey(): string {
      const s = this.structure
      if (s?.status !== 'ok' || !s.data) return ''
      return `${s.accession}|${s.source}|${s.name}|${s.data.length}`
    },
    dbSequence(): string {
      return (this.entry?.sequence ?? []).join('')
    },
    observedMasses(): number[] | undefined {
      const scan = this.streamlitDataStore.allDataForDrawing.per_scan_data?.[0]
      return scan?.MonoMass as number[] | undefined
    },
    sites(): FragmentSites {
      if (this.entry === undefined) {
        return {
          nTerminal: new Set(), cTerminal: new Set(), ionTypes: new Map(),
          internalPieces: [], internalEnds: new Set(), internalCount: 0,
        }
      }
      const settings = this.streamlitDataStore.settings
      return fragmentSites(
        this.entry,
        this.observedMasses,
        settings?.ion_types ?? ['b', 'y'],
        settings?.tolerance ?? 10
      )
    },
    proteoformRange(): [number, number] {
      const length = this.entry?.sequence.length ?? 0
      const start = this.entry?.proteoform_start ?? 0
      const end = this.entry?.proteoform_end ?? length - 1
      return [start < 0 ? 0 : start, end < 0 ? length - 1 : end]
    },
    placeholderType(): 'info' | 'warning' {
      if (this.structure?.status === 'unavailable' || this.loadError) return 'warning'
      return 'info'
    },
    placeholderText(): string {
      if (this.proteinIndex === undefined || this.entry === undefined) {
        return 'Select a proteoform in the protein table to show its structure.'
      }
      if (this.loadError) return this.loadError
      if (this.structure === undefined) return 'Loading structure...'
      if (this.structure.status !== 'ok') {
        return this.structure.message ?? 'No structure available for this protein.'
      }
      return 'Loading structure...'
    },
    sourceLabel(): string {
      const s = this.structure
      if (s === undefined) return ''
      if (s.source === 'alphafold') return `AlphaFold DB model ${s.name ?? s.accession}`
      return `Uploaded structure ${s.name ?? ''}`.trim()
    },
    legend(): { label: string; color?: string; chipClass?: string }[] {
      const items: { label: string; color?: string; chipClass?: string }[] = []
      ION_COLORS.forEach((c) => {
        if (c.types.some((t) => [...this.sites.ionTypes.values()].some((types) => types.has(t)))) {
          items.push({ label: c.label, color: c.color })
        }
      })
      if (this.showInternal && this.sites.internalCount > 0) {
        items.push({
          label: `Internal fragments (${this.sites.internalCount}, both cleavage sites)`,
          color: INTERNAL_BRACKET,
        })
      }
      items.push({ label: 'No fragment', color: UNCOVERED })
      if (this.showUnobserved && this.hasTruncation) {
        items.push({ label: 'Cleaved off', color: UNOBSERVED })
      }
      if (this.showModifications && (this.entry?.modifications?.length ?? 0) > 0) {
        items.push({ label: 'Modification', chipClass: 'legend-modification' })
      }
      if (this.fragment !== undefined) {
        items.push({ label: `Selected fragment ${this.fragment.name} (rest faded)`, color: this.fragmentColor })
      }
      items.push({ label: 'Selected residue', color: SELECTED })
      return items
    },
    // Fragment selected in the sequence view, if it lies on this protein
    fragment(): FragmentSelection | undefined {
      const f = this.selectionStore.selectedFragment
      if (f === undefined || f === null) return undefined
      if (f.start < 0 || f.end >= this.dbSequence.length || f.start > f.end) return undefined
      return f
    },
    // Where the selected fragment was cleaved off: one residue for a terminal
    // ion, both ends for an internal one
    cleavageSites(): number[] {
      const f = this.fragment
      if (f === undefined) return []
      if (f.kind === 'N') return [f.end]
      if (f.kind === 'C') return [f.start]
      return f.start === f.end ? [f.start] : [f.start, f.end]
    },
    fragmentColor(): string {
      const f = this.fragment
      if (f === undefined || f.kind === 'I') return INTERNAL_BRACKET
      return ionColor(new Set([f.name.charAt(0)])) ?? INTERNAL_BRACKET
    },
    hasTruncation(): boolean {
      const [start, end] = this.proteoformRange
      return start > 0 || end < (this.entry?.sequence.length ?? 0) - 1
    },
  },
  watch: {
    structureKey() {
      this.loadStructure()
    },
    dbSequence() {
      this.loadStructure()
    },
    showModifications() {
      this.applyStyle()
    },
    showUnobserved() {
      this.applyStyle()
    },
    showInternal() {
      this.applyStyle()
    },
    sites() {
      this.applyStyle()
    },
    'selectionStore.selectedAApos'(pos: number | undefined) {
      this.applyStyle()
      this.centerOn(pos)
    },
    fragment(fragment: FragmentSelection | undefined) {
      this.applyStyle()
      const mapping = this.mapping
      if (fragment === undefined || mapping === undefined || this.viewer === undefined) return
      // Centre on the piece the fragment covers
      const span = this.residuesOf((pos) => pos >= fragment.start && pos <= fragment.end)
      if (span.length > 0) this.viewer.center({ chain: mapping.chain, resi: span }, 400)
    },
    theme() {
      this.applyStyle()
    },
  },
  mounted() {
    this.loadStructure()
  },
  beforeUnmount() {
    this.viewer?.clear()
  },
  methods: {
    ensureViewer(): Promise<Viewer> {
      // One promise, so updates that arrive while 3Dmol loads share one viewer
      // (two viewers stack their canvases and the stale one stays visible)
      if (this.viewerPromise === undefined) {
        this.viewerPromise = (async () => {
          // Loaded on first use, so the bundle only grows for pages that show a structure
          const $3Dmol = await import('3dmol')
          // Transparent, so the card's background shows in either theme
          const viewer = $3Dmol.createViewer(this.$refs.viewer as HTMLElement, {
            backgroundColor: 'white',
            backgroundAlpha: 0,
            antialias: true,
          })
          this.viewer = markRaw(viewer)
          return viewer
        })()
      }
      return this.viewerPromise
    },
    async loadStructure(): Promise<void> {
      const key = this.structureKey
      if (key === '' || this.dbSequence === '') {
        this.loaded = false
        this.loadedKey = ''
        this.loadError = ''
        this.viewer?.removeAllModels()
        this.viewer?.render()
        return
      }
      if (key === this.loadedKey && this.loaded) {
        this.applyStyle()
        return
      }
      const structure = this.structure!
      this.loadError = ''
      try {
        const viewer = await this.ensureViewer()
        // A newer selection arrived while 3Dmol was loading
        if (key !== this.structureKey) return
        viewer.removeAllModels()
        viewer.removeAllLabels()
        const model = viewer.addModel(structure.data, structure.format === 'cif' ? 'cif' : 'pdb')
        this.model = markRaw(model)
        const chains = residuesByChain(model.selectedAtoms({}))
        const mapping = bestChainMapping(this.dbSequence, chains)
        if (mapping === undefined) {
          this.loaded = false
          this.loadError = `The structure ${structure.name ?? ''} has no chain matching the sequence of ${structure.accession}.`
          viewer.removeAllModels()
          return
        }
        this.mapping = markRaw(mapping)
        this.mappingLabel = this.describeMapping(mapping, chains.size)
        model.setHoverable({}, true, this.onHover, this.onUnhover)
        model.setClickable({}, true, this.onClick)
        this.loadedKey = key
        this.loaded = true
        // The container was hidden until now: let 3Dmol pick up its size
        await this.$nextTick()
        viewer.resize()
        this.applyStyle()
        this.resetView()
      } catch (error) {
        this.loaded = false
        this.loadError = `The structure could not be read: ${error}`
      }
    },
    describeMapping(mapping: ChainMapping, chainCount: number): string {
      const length = this.dbSequence.length
      const identity = mapping.mapped > 0 ? (100 * mapping.identical) / mapping.mapped : 0
      const chain = chainCount > 1 ? `chain ${mapping.chain}, ` : ''
      return `${chain}${mapping.mapped} of ${length} residues mapped (${identity.toFixed(0)}% identical)`
    },
    // Database position of a structure atom, -1 if it is not in the mapped chain
    positionOf(atom: { chain?: string; resi?: number }): number {
      const mapping = this.mapping
      if (mapping === undefined || atom.chain !== mapping.chain) return -1
      return mapping.dbOfResidue.get(atom.resi ?? NaN) ?? -1
    },
    residueColor(pos: number): string {
      const color = this.baseColor(pos)
      // A selected fragment stands out: the rest of the protein is faded
      const f = this.fragment
      if (f !== undefined && (pos < f.start || pos > f.end)) return fade(color)
      return color
    },
    baseColor(pos: number): string {
      const [start, end] = this.proteoformRange
      if (pos < start || pos > end) return UNOBSERVED
      const ion = ionColor(this.sites.ionTypes.get(pos))
      if (ion !== undefined) return ion
      if (this.showInternal && this.sites.internalEnds.has(pos)) return INTERNAL_BRACKET
      if (this.showModifications && this.isModified(pos)) return MODIFICATION_BACKGROUND
      return UNCOVERED
    },
    applyStyle(): void {
      const viewer = this.viewer
      const mapping = this.mapping
      if (!this.loaded || viewer === undefined || mapping === undefined) return
      const [start, end] = this.proteoformRange
      viewer.removeAllLabels()
      viewer.setStyle({}, {
        cartoon: {
          colorfunc: (atom: { chain?: string; resi?: number }) => {
            const pos = this.positionOf(atom)
            if (pos < 0) return OTHER_CHAIN
            return this.residueColor(pos)
          },
        },
      })
      if (!this.showUnobserved) {
        const hidden = this.residuesOf((pos) => pos < start || pos > end)
        if (hidden.length > 0) viewer.setStyle({ chain: mapping.chain, resi: hidden }, {})
      }
      if (this.showModifications) {
        const textColor = this.theme?.textColor ?? '#000000'
        ;(this.entry?.modifications ?? []).forEach((mod) => {
          const residues = this.residuesOf((pos) => pos >= mod.start && pos <= mod.end)
          if (residues.length === 0) return
          // The sequence view's dotted pattern: the residues' cartoon in the pattern's
          // background colour (residueColor), their atoms as its dots. An
          // unlocalized mass shift covers its whole range, as in the sequence view.
          viewer.addStyle(
            { chain: mapping.chain, resi: residues },
            { sphere: { color: MODIFICATION_DOT, radius: 0.3 } }
          )
          const shift = `${mod.mass_diff >= 0 ? '+' : ''}${mod.mass_diff.toFixed(2)} Da`
          // The range of an unlocalized shift is in the hover text
          viewer.addLabel(`${mod.labels ? `${this.shortLabel(mod.labels)} ` : ''}${shift}`, {
            fontSize: 11,
            fontColor: textColor,
            backgroundColor: this.theme?.backgroundColor ?? '#ffffff',
            backgroundOpacity: 0.7,
            showBackground: true,
          }, { chain: mapping.chain, resi: residues[0], atom: 'CA' })
        })
      }
      const selected = this.selectionStore.selectedAApos
      if (selected !== undefined) {
        const r = mapping.dbToResidue[selected]
        if (r !== undefined && r >= 0) {
          const residue = mapping.residues[r]
          const selection = { chain: mapping.chain, resi: residue.resi }
          viewer.addStyle(selection, { stick: { color: SELECTED, radius: 0.3 } })
          viewer.addLabel(`${this.dbSequence[selected]}${selected + 1}`, {
            fontSize: 13,
            fontColor: '#000000',
            backgroundColor: SELECTED,
            backgroundOpacity: 0.9,
          }, { ...selection, atom: 'CA' })
        }
      }
      const f = this.fragment
      if (f !== undefined) {
        this.cleavageSites.forEach((pos) => {
          const r = mapping.dbToResidue[pos]
          if (r === undefined || r < 0) return
          const selection = { chain: mapping.chain, resi: mapping.residues[r].resi }
          viewer.addStyle(selection, { stick: { color: this.fragmentColor, radius: 0.25 } })
          const side = f.kind === 'I' ? (pos === f.start ? ' (start)' : ' (end)') : ''
          viewer.addLabel(`${f.name} · ${this.dbSequence[pos]}${pos + 1}${side}`, {
            fontSize: 12,
            fontColor: '#ffffff',
            backgroundColor: this.fragmentColor,
            backgroundOpacity: 0.9,
          }, { ...selection, atom: 'CA' })
        })
      }
      viewer.render()
    },
    isModified(pos: number): boolean {
      return (this.entry?.modifications ?? []).some((m) => pos >= m.start && pos <= m.end)
    },
    // FLASHTnT lists every explanation of a mass shift; the label shows the first
    shortLabel(labels: string): string {
      const all = labels.split(';').map((l) => l.trim()).filter((l) => l)
      if (all.length <= 1) return all[0] ?? ''
      return `${all[0]} (+${all.length - 1} more)`
    },
    // Structure residue numbers of the mapped chain whose database position passes `test`
    residuesOf(test: (pos: number) => boolean): number[] {
      const mapping = this.mapping
      if (mapping === undefined) return []
      const out: number[] = []
      mapping.dbToResidue.forEach((r, pos) => {
        if (r >= 0 && test(pos)) out.push(mapping.residues[r].resi)
      })
      return out
    },
    centerOn(pos: number | undefined): void {
      const mapping = this.mapping
      if (pos === undefined || mapping === undefined || this.viewer === undefined) return
      const r = mapping.dbToResidue[pos]
      if (r === undefined || r < 0) return
      this.viewer.center({ chain: mapping.chain, resi: mapping.residues[r].resi }, 400)
    },
    describe(pos: number): string {
      const parts = [`${this.dbSequence[pos]}${pos + 1}`]
      const [start, end] = this.proteoformRange
      if (pos < start || pos > end) {
        parts.push('cleaved off')
      } else {
        const ions: string[] = []
        const types = [...(this.sites.ionTypes.get(pos) ?? [])].sort()
        types.forEach((t) => {
          const n = ['a', 'b', 'c'].includes(t)
          ions.push(`${t}${n ? pos - start + 1 : end - pos + 1}`)
        })
        this.sites.internalPieces
          .filter(([first, last]) => pos === first || pos === last)
          .forEach(([first, last]) => ions.push(`internal ${this.dbSequence.slice(first, last + 1)} (${first + 1}-${last + 1})`))
        if (ions.length > 0) parts.push(ions.join(', '))
        const mods = (this.entry?.modifications ?? []).filter((m) => pos >= m.start && pos <= m.end)
        mods.forEach((m) => {
          const shift = `${m.mass_diff >= 0 ? '+' : ''}${m.mass_diff.toFixed(2)} Da`
          const range = m.end > m.start ? ` (residues ${m.start + 1}-${m.end + 1})` : ''
          parts.push(`${m.labels ? this.shortLabel(m.labels) + ' ' : ''}${shift}${range}`)
        })
      }
      return parts.join(' · ')
    },
    onHover(atom: { chain?: string; resi?: number; resn?: string; b?: number }): void {
      const pos = this.positionOf(atom)
      if (pos < 0) {
        this.hoverText = `${atom.resn ?? ''} ${atom.resi ?? ''} (chain ${atom.chain}, not in the protein sequence)`
        return
      }
      this.hoverText = this.describe(pos)
    },
    onUnhover(): void {
      this.hoverText = ''
    },
    onClick(atom: { chain?: string; resi?: number }): void {
      const pos = this.positionOf(atom)
      if (pos < 0) return
      // Same toggle as a click in the sequence view
      this.selectionStore.updateSelectedAA(this.selectionStore.selectedAApos === pos ? undefined : pos)
    },
    resetView(): void {
      if (this.viewer === undefined) return
      this.viewer.zoomTo(this.mapping ? { chain: this.mapping.chain } : {})
      // zoomTo fits the bounding sphere, which leaves a wide margin
      this.viewer.zoom(1.4)
      this.viewer.render()
    },
    downloadImage(): void {
      if (this.viewer === undefined) return
      const link = document.createElement('a')
      link.href = this.viewer.pngURI()
      link.download = `${this.structure?.accession ?? 'structure'}.png`
      link.click()
    },
  },
})
</script>

<style scoped>
.structure-container {
  position: relative;
  width: 100%;
  height: 480px;
}

.structure-viewer {
  position: absolute;
  inset: 0;
}

.structure-hidden {
  visibility: hidden;
}

.structure-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.structure-hover {
  position: absolute;
  left: 8px;
  top: 8px;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
  background: rgba(0, 0, 0, 0.65);
  color: #ffffff;
  pointer-events: none;
}

.legend-modification {
  background-image: radial-gradient(#676a9c 0.5px, transparent 0.5px), radial-gradient(#444cf7 0.5px, #e5e5f7 0.5px);
  background-size: 4px 4px;
  background-position: 0 0, 2px 2px;
}

.legend-chip {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 2px;
  margin-right: 4px;
  border: 1px solid rgba(128, 128, 128, 0.5);
}
</style>
