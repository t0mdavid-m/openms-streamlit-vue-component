import type { DATAFRAMES, FlashViewerComponent, GridLayout } from '@/types/grid-layout'
import { defineStore } from 'pinia'
import type { RenderData, Theme } from 'streamlit-component-lib'

export const useStreamlitDataStore = defineStore('streamlit-data', {
  state: () => ({
    renderData: null as RenderData | null,
    dataframes: {} as Record<DATAFRAMES, Record<string, unknown>[]>,
  }),
  getters: {
    args: (state): GridLayout => state.renderData?.args,
    components(): FlashViewerComponent[] {
      return this.args.components
    },
    allDataframes: (state) => state.dataframes,
    theme: (state): Theme | undefined => state.renderData?.theme,
  },
  actions: {
    updateRenderData(newData: RenderData) {
      this.renderData = newData

      // Parse dataframes as streamlit sends them as a string
      const newDataframes = (newData.args as GridLayout).dataframes
      Object.entries(newDataframes).forEach(df => {
        this.dataframes[df[0] as DATAFRAMES] = JSON.parse(df[1])
      })
    },
  },
})
