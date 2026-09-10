import type { DATAFRAMES, FlashViewerComponent, StreamlitData } from '@/types/grid-layout'
import type { SequenceDataDictionary, FLASHTnTSettings } from '@/types/sequence-data'
import { defineStore } from 'pinia'
import type { RenderData, Theme } from 'streamlit-component-lib'
import { ArrowTable } from 'streamlit-component-lib'
import type { InternalFragmentData, InternalFragmentDataDictionary } from '@/types/internal-fragment-data'
import { Vector } from 'apache-arrow';
import { useSelectionStore, selectionPayload } from '@/stores/selection'
import { toRaw } from 'vue'

export const useStreamlitDataStore = defineStore('streamlit-data', {
  state: () => ({
    renderData: null as RenderData | null,
    dataForDrawing: {} as Record<DATAFRAMES, Record<string, unknown>[]>,
    dataset: '' as String,
    hash: '' as String,
    // JSON of the selection state as it was right after the last copy from Python.
    // App.vue uses it to recognise (and not echo back) state that Python sent.
    lastSelectionFromPython: '' as string,
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
    internalFragmentData: (state): InternalFragmentDataDictionary | undefined =>
      state.dataForDrawing.internal_fragment_data as unknown as InternalFragmentDataDictionary | undefined,
    theme: (state): Theme | undefined => state.renderData?.theme,
  },
  actions: {
    updateRenderData(newData: RenderData) {
      const selectionStore = useSelectionStore()
      const incoming = newData.args.selection_store as Record<string, unknown>
      // A new StateTracker id means a new experiment. Its tables must be rebuilt (and
      // their default row re-selected) even when the cell's data hashes the same as the
      // previous experiment's (a re-run of the same input): otherwise nothing is ever
      // selected and every cell that depends on the selection stays empty.
      const trackerChanged = incoming.id !== selectionStore.id
      selectionStore.$patch(state => {
        if (incoming.id !== state.id) {
          for (const key in state) {
            (state as any)[key] = undefined
          }
        }
        // Python echoes cleared selections as `null` (App.vue sends null for
        // undefined so the clear survives JSON round-tripping). Convert back to
        // `undefined` so the rest of the app keeps its `=== undefined` semantics
        // and cleared fields overwrite stale local values in every iframe.
        for (const key in incoming) {
          (state as any)[key] = incoming[key] === null ? undefined : incoming[key]
        }
      })
      // Remember what Python sent so the selection watcher in App.vue does not send
      // it straight back. Every echo is a full Streamlit rerun, and with several grid
      // cells per page those reruns overlap and crash the server
      // (FLASHApp docs/white-screen-root-cause.md).
      this.lastSelectionFromPython = JSON.stringify(
        selectionPayload(toRaw(selectionStore.$state) as unknown as Record<string, unknown>)
      )

      if (this.hash === newData.args.hash && !trackerChanged) {
        return
      }
      this.hash = newData.args.hash  
      delete newData.args.selection_store;
      delete newData.args.hash;
      
      // Reset everything
      this.dataForDrawing = {} as Record<DATAFRAMES, Record<string, unknown>[]>
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
