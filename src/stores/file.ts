import { defineStore } from 'pinia'

export const useFileStore = defineStore('file', {
  state: () => ({
    resultFile: null as File[] | null,
    traceFile: null as File[] | null,
  }),
  getters: {
    getResultFile: (state): File[] | null => state.resultFile,
    getTreaceFile: (state): File[] | null => state.traceFile,
  },
  actions: {
    updateResult(file: File[]) {
      this.resultFile = file
    },
    updateTrace(file: File[]) {
      this.traceFile = file
    },
  },
})
