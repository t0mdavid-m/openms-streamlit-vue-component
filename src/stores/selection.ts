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
    AApos: undefined as number | undefined,
    tagData: undefined as TagData | undefined,
    counter: undefined as number | undefined,
    id: undefined as number | undefined,
    heatmap_deconv: undefined as HeatmapData | undefined,
    heatmap_deconv2: undefined as HeatmapData | undefined,
    heatmap_raw: undefined as HeatmapData | undefined,
    heatmap_raw2: undefined as HeatmapData | undefined,
    sequenceOut: undefined as string | undefined,
  }),
  getters: {
    selectedScanIndex: (state): number | undefined => state.scanIndex,
    selectedMassIndex: (state): number | undefined => state.massIndex,
    selectedProteinIndex: (state): number | undefined => state.proteinIndex,
    selectedTagIndex: (state): number | undefined => state.tagIndex,
    selectedAApos: (state): number | undefined => state.AApos,
    selectedTag: (state): TagData | undefined => state.tagData,
    selectedDeconvMS2Heatmap: (state): HeatmapData | undefined => state.heatmap_deconv2,
    selectedDeconvHeatmap: (state): HeatmapData | undefined => state.heatmap_deconv,
    selectedRawHeatmap: (state): HeatmapData | undefined => state.heatmap_raw,
    selectedRawMS2Heatmap: (state): HeatmapData | undefined => state.heatmap_raw2,
    selectedSequenceOut: (state): string | undefined => state.sequenceOut,
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
    updateSelectedAA(pos?: number) {
      this.AApos = pos
    },
    updateTagData(tagData?: TagData) {
      this.tagData = tagData
    },
    updateRawHeatmapSelection(selection: HeatmapData) {
      this.heatmap_raw = selection
    },
    updateRawMS2HeatmapSelection(selection: HeatmapData) {
      this.heatmap_raw2 = selection
    },
    updateDeconvHeatmapSelection(selection: HeatmapData) {
      this.heatmap_deconv = selection
    },
    updateDeconvMS2HeatmapSelection(selection: HeatmapData) {
      this.heatmap_deconv2 = selection
    },
    updateSequenceOut(sequence?: string) {
      this.sequenceOut = sequence
    },
  },
})
