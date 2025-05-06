import { defineStore } from 'pinia'


export type TagData = {
  sequence : String
  nTerminal: Boolean
  masses: number[]
  selectedAA: number
  startPos: number
  endPos: number
}

// Stores selection data for heatmaps
export type HeatmapData = {
  xRange: number[], 
  yRange: number[]
}

export const useSelectionStore = defineStore('selection', {
  state: () => ({
    scanIndex: undefined as number | undefined,
    massIndex: undefined as number | undefined,
    proteinIndex: undefined as number | undefined,
    tagIndex: undefined as number | undefined,
    selectedObservedMass: undefined as number | undefined,
    AApos: undefined as number | undefined, 
    tagData: undefined as TagData | undefined, 
    counter: undefined as number | undefined,
    id: undefined as number | undefined,
    heatmap_deconv: undefined as HeatmapData | undefined,
    heatmap_raw: undefined as HeatmapData | undefined,
  }),
  getters: {
    selectedScanIndex: (state): number | undefined => state.scanIndex,
    selectedMassIndex: (state): number | undefined => state.massIndex,
    selectedProteinIndex: (state): number | undefined => state.proteinIndex,
    selectedTagIndex: (state): number | undefined => state.tagIndex,
    selectedAApos: (state): number | undefined => state.AApos,
    selectedTag: (state): TagData | undefined => state.tagData,
    selectedDeconvHeatmap: (state): HeatmapData | undefined => state.heatmap_deconv,
    selectedRawHeatmap: (state): HeatmapData | undefined => state.heatmap_raw,
    selectedObservedMassFromFragmentTable: (state): number | undefined =>
      state.selectedObservedMass,
  },
  actions: {
    updateSelectedScan(rowIndex: number) {
      this.scanIndex = rowIndex
    },
    updateSelectedMass(rowIndex?: number) {
      this.massIndex = rowIndex
    },
    updateSelectedProtein(rowIndex?: number) {
      this.proteinIndex = rowIndex
    },
    updateSelectedTag(rowIndex?: number) {
      this.tagIndex = rowIndex
    },
    selectedAminoAcid(fragmentMass?: number) {
      this.selectedObservedMass = fragmentMass
    },
    updateSelectedAA(pos?: number) {
      this.AApos = pos
    },
    updateTagData(tagData?: TagData) {
      this.tagData = tagData
    },
    updateRawHeatmapSelection(selection: HeatmapData) {
      this.heatmap_raw = selection
    },
    updateDeconvHeatmapSelection(selection: HeatmapData) {
      this.heatmap_deconv = selection
    },
  },
})
