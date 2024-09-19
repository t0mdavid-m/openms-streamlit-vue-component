import type { DATAFRAMES, FlashViewerComponent, GridLayout } from '@/types/grid-layout'
import type { SequenceDataDictionary, FLASHTnTSettings } from '@/types/sequence-data'
import { defineStore } from 'pinia'
import type { RenderData, Theme } from 'streamlit-component-lib'
import type { InternalFragmentData } from '@/types/internal-fragment-data'

export const useStreamlitDataStore = defineStore('streamlit-data', {
  state: () => ({
    renderData: null as RenderData | null,
    dataForDrawing: {} as Record<DATAFRAMES, Record<string, unknown>[]>,
  }),
  getters: {
    args: (state): GridLayout => state.renderData?.args,
    components(): FlashViewerComponent[][] {
      return this.args.components
    },
    allDataForDrawing: (state) => state.dataForDrawing,
    sequenceData: (state): SequenceDataDictionary | undefined =>
      state.dataForDrawing.sequence_data as unknown as SequenceDataDictionary | undefined,
    settings: (state): FLASHTnTSettings | undefined =>
      state.dataForDrawing.settings as unknown as FLASHTnTSettings | undefined,
    internalFragmentData: (state): InternalFragmentData | undefined =>
      state.dataForDrawing.internal_fragment_data as unknown as InternalFragmentData | undefined,
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
    },
  },
})
