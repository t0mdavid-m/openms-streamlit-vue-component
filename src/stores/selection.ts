import { defineStore } from 'pinia'

export const useSelectionStore = defineStore('selection', {
  state: () => ({
    rowIndex: undefined as number | undefined,
  }),
  getters: {
    selectedRowIndex: (state): number | undefined => state.rowIndex,
  },
  actions: {
    updateSelectedRow(rowIndex: number) {
      this.rowIndex = rowIndex
    },
  },
})
