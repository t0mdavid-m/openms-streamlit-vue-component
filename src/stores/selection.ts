import { defineStore } from 'pinia'

export const useSelectionStore = defineStore('selection', {
  state: () => ({
    scanIndex: undefined as number | undefined,
    massIndex: undefined as number | undefined,
  }),
  getters: {
    selectedScanIndex: (state): number | undefined => state.scanIndex,
    selectedMassIndex: (state): number | undefined => state.massIndex,
  },
  actions: {
    updateSelectedScan(rowIndex: number) {
      this.scanIndex = rowIndex
    },
    updateSelectedMass(rowIndex?: number) {
      this.massIndex = rowIndex
    },
  },
})
