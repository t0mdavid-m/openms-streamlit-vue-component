import type { DATAFRAMES, FlashViewerComponent, StreamlitData } from '@/types/grid-layout'
import type { SequenceDataDictionary, FLASHTnTSettings } from '@/types/sequence-data'
import { defineStore } from 'pinia'
import type { RenderData, Theme } from 'streamlit-component-lib'
import { ArrowTable } from 'streamlit-component-lib'
import type { InternalFragmentData } from '@/types/internal-fragment-data'
import { Vector } from 'apache-arrow';

export const useStreamlitDataStore = defineStore('streamlit-data', {
  state: () => ({
    renderData: null as RenderData | null,
    dataForDrawing: {} as Record<DATAFRAMES, Record<string, unknown>[]>,
    dataset: '' as String,
  }),
  getters: {
    args: (state): StreamlitData => state.renderData?.args,
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
      // Current data model: Data is only loaded once!
      // ToDo: See if data can be accessed bydirectionally
      if (newData.args?.dataset === this.dataset) {
        return
      }
      this.dataset = newData.args?.dataset

      this.renderData = newData

      // Convert Arrow Arrays to native Ts datatypes
      function parseValue(value: any): any {
        // Arrow stores integers as 'bigint'
        if (typeof value === 'bigint') {
          return Number(value)
        }
        // Arrays are stored as vectors
        else if (value instanceof Vector) {
          const resultArray = []
          for (let i = 0; i < value.length; i++) {
            resultArray.push(parseValue(value.get(i)))
          }
          return resultArray
        }
        // Return as-is for other types
        return value;
      }

      // Parse dataframes as streamlit sends them as a string
      const data = newData.args as StreamlitData
      Object.entries(data).forEach(([key, value]) => {
        if (value instanceof ArrowTable) {
          // For now we are just unpacking but this should be refactored throughout
          const rows: Array<Record<string, any>> = []
          const columnNames = value.table.schema.fields.map(field => field.name)
          for (let i = 0; i < value.table.numRows; i++) {
            const row: Record<string, any> = {}
            columnNames.forEach((columnName, colIndex) => {
              row[columnName] = parseValue(value.table.getChildAt(colIndex)?.get(i))
            })
            rows.push(row)
          }
          this.dataForDrawing[key as DATAFRAMES] = rows
        }
        else {
          this.dataForDrawing[key as DATAFRAMES] = value
        }
      })
    },
  },
})
