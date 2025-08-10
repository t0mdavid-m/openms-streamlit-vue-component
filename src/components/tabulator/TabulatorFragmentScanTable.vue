<template>
  <TabulatorTable
    :table-data="tableData"
    :column-definitions="columnDefinitions"
    title="Fragment Scan Table"
    :index="index"
    table-layout-param="fitColumns"
    @row-selected="updateSelectedScan"
    :selected-row-index-from-listening="selectedRow"
    :default-row=0
  />
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'
import type { ColumnDefinition } from 'tabulator-tables'
import { useStreamlitDataStore } from '@/stores/streamlit-data'
import type { TabulatorTableArguments } from './tabulator-table'
import { useSelectionStore } from '@/stores/selection'
import TabulatorTable from './TabulatorTable.vue'
import { toFixedFormatter } from '@/components/tabulator/tabulator-formatters'

export default defineComponent({
  name: 'TabulatorFragmentScanTable',
  components: {
    TabulatorTable,
  },
  props: {
    args: {
      type: Object as PropType<TabulatorTableArguments>,
      required: true,
    },
    index: {
      type: Number,
      required: true,
    },
  },
  setup() {
    const streamlitDataStore = useStreamlitDataStore()
    const selectionStore = useSelectionStore()
    return { streamlitDataStore, selectionStore }
  },
  data() {
    return {
      columnDefinitions: [
        { 
          title: 'Index', field: 'id', sorter: 'number',
          headerTooltip: 'The sequential index of the spectrum in the dataset.'
        },
        { 
          title: 'Scan Number', field: 'ScanNum', sorter: 'number',
          headerTooltip: 'The identifier of the mass spectrometry scan.'

        },
        { 
          title: 'Retention time', field: 'RetentionTime', formatter: toFixedFormatter(), sorter: 'number',
          headerTooltip: 'The time at which the spectrum was detected during the chromatographic separation in seconds.'
        },
        { 
          title: 'Precursor Mass', field: 'PrecursorMonoisotopicMass', formatter: toFixedFormatter(), sorter: 'number',
          headerTooltip: 'The mass of the precursor ion selected for fragmentation in Daltons.'
        },
        { 
          title: 'Precursor QScore', field: 'PrecursorQscore', formatter: toFixedFormatter(), sorter: 'number',
          headerTooltip: 'The mass of the precursor ion selected for fragmentation in Daltons.'
        },
        { 
          title: 'Precursor Charge', field: 'PrecursorCharge', formatter: toFixedFormatter(), sorter: 'number',
          headerTooltip: 'The mass of the precursor ion selected for fragmentation in Daltons.'
        },
        { 
          title: 'Identified', field: 'identified', sorter: 'bool',
          headerTooltip: 'The mass of the precursor ion selected for fragmentation in Daltons.'
        },
      ] as ColumnDefinition[],
    }
  },
  computed: {
    tableData(): Record<string, unknown>[] {
      const rows = this.streamlitDataStore.allDataForDrawing.id_table
      rows.forEach((row) => (row['id'] = row['index']))
      return rows
    },
    selectedRow(): number | undefined {
      // Map selectedScanIndex (scan index) to the row index in id_table by matching ScanNum
      const scanIndex = this.selectionStore.selectedScanIndex
      if (scanIndex === undefined || scanIndex === null) return undefined
      const perScanData = this.streamlitDataStore.allDataForDrawing.per_scan_data
      if (!perScanData || !Array.isArray(perScanData) || scanIndex < 0 || scanIndex >= perScanData.length) return undefined
      const scanNum = perScanData[scanIndex]?.Scan
      const idTable = this.streamlitDataStore.allDataForDrawing.id_table
      if (!idTable || !Array.isArray(idTable)) return undefined
      const rowIdx = idTable.findIndex((row) => row['ScanNum'] === scanNum)
      return rowIdx >= 0 ? rowIdx : undefined
    }
  },
  methods: {
    updateSelectedScan(selectedRow?: number) {
      if (selectedRow !== undefined) {
        const row = this.streamlitDataStore.dataForDrawing.id_table[selectedRow]
        const scan_number = row['ScanNum']
        const precursor_scan_number = row['PrecursorScanNum']
        if ((scan_number !== undefined) && (typeof scan_number == 'number')) {
          const scan_id = this.streamlitDataStore.allDataForDrawing.per_scan_data.findIndex((data) => data['Scan'] === scan_number)
          this.selectionStore.updateSelectedScan(scan_id)
        }
        if ((precursor_scan_number !== undefined) && (typeof precursor_scan_number == 'number')) {
          const scan_id = this.streamlitDataStore.allDataForDrawing.per_scan_data.findIndex((data) => data['Scan'] === precursor_scan_number)
          this.selectionStore.updateSelectedPrecursorScan(scan_id)
        }
          

          let massRaw = this.streamlitDataStore.dataForDrawing.id_table[selectedRow]['PrecursorMonoisotopicMass']
          let mass = typeof massRaw === 'number' ? massRaw : Number(massRaw)
          if (typeof mass !== 'number' || isNaN(mass)) mass = 0


          let isoStartRaw = this.streamlitDataStore.dataForDrawing.id_table[selectedRow]['PrecursorIsolationWindowStart']
          let isoStart: number | undefined = typeof isoStartRaw === 'number' ? isoStartRaw : undefined

          let isoEndRaw = this.streamlitDataStore.dataForDrawing.id_table[selectedRow]['PrecursorIsolationWindowEnd']
          let isoEnd: number | undefined = typeof isoEndRaw === 'number' ? isoEndRaw : undefined

          this.selectionStore.updateSelectedTag(0)
          this.selectionStore.updateTagData(
            {
              sequence: '',
              nTerminal: true,
              masses: [mass],
              selectedAA: -1,
              startPos: -1,
              endPos: -1,
              isoStart: isoStart,
              isoEnd: isoEnd
            }
          )
        }
      }
    },
})
</script>
