import type { GridLayout } from '@/types/grid-layout'
import { defineStore } from 'pinia'
import type { RenderData } from 'streamlit-component-lib'
import { DEV_DATA, DEV_DATA_THEME } from './mocks/dev-data'

export const useStreamlitDataStore = defineStore('streamlit-data', {
  state: () => ({
    renderData: null as RenderData | null
  }),
  getters: {
    args: (state) => state.renderData?.args ?? DEV_DATA,
    theme: (state) => state.renderData?.theme ?? DEV_DATA_THEME,
    disabled: (state) => state.renderData?.disabled
  },
  actions: {
    updateRenderData(newData: RenderData) {
      this.renderData = newData
    }
  }
})
