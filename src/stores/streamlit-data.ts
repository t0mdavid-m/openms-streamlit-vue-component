import { defineStore } from 'pinia'
import type { RenderData } from 'streamlit-component-lib'

export const useStreamlitDataStore = defineStore('streamlit-data', {
  state: () => ({
    renderData: null as RenderData | null
  }),
  getters: {
    args: (state) => state.renderData?.args,
    theme: (state) => state.renderData?.theme,
    disabled: (state) => state.renderData?.disabled
  },
  actions: {
    updateRenderData(newData: RenderData) {
      this.renderData = newData
    }
  }
})
