import { defineStore } from 'pinia'

export const useModificationStore = defineStore('variable-mod', {
  state: () => ({
    variableMod: {} as Record<number, number>,
  }),
  getters: {
    variableModifications: (state) => state.variableMod,
    isEmpty: (state) =>
      Object.values(state.variableMod).filter((value) => value !== undefined && value !== 0)
        .length === 0,
  },
  actions: {
    updateVariableModifications(aaIndex: number, modMass: number) {
      this.variableMod = {
        ...this.variableMod,
        [aaIndex]: modMass,
      }
    },
  },
})
