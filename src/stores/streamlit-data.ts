import type { DATAFRAMES, FlashViewerComponent, GridLayout } from '@/types/grid-layout'
import type { SequenceData } from '@/types/sequence-data'
import { defineStore } from 'pinia'
import type { RenderData, Theme } from 'streamlit-component-lib'

export const useStreamlitDataStore = defineStore('streamlit-data', {
  state: () => ({
    renderData: null as RenderData | null,
    dataForDrawing: {} as Record<DATAFRAMES, Record<string, unknown>[]>,
  }),
  getters: {
    args: (state): GridLayout => state.renderData?.args,
    components(): FlashViewerComponent[] {
      return this.args.components
    },
    allDataForDrawing: (state) => state.dataForDrawing,
    sequenceData: (state): SequenceData | undefined =>
      state.dataForDrawing.sequence_data as unknown as SequenceData | undefined,
    theme: (state): Theme | undefined => state.renderData?.theme,
  },
  actions: {
    updateRenderData(newData: RenderData) {
      this.renderData = newData

      // Parse dataframes as streamlit sends them as a string
      const newDataframes = (newData.args as GridLayout).data_for_drawing
      Object.entries(newDataframes).forEach((df) => {
        this.dataForDrawing[df[0] as DATAFRAMES] = JSON.parse(df[1])
      })
      console.log(this.dataForDrawing)
    },
  },
})
