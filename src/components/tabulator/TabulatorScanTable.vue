<template>
  <TabulatorTable
    :table-data="tableData"
    :column-definitions="columnDefinitions"
    title="Scan Table"
    :index="index"
    table-layout-param="fitColumns"
    @row-selected="updateSelectedScan"
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
  name: 'TabulatorScanTable',
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
          title: 'Scan Number', field: 'Scan', sorter: 'number',
          headerTooltip: 'The identifier of the mass spectrometry scan.'

        },
        { 
          title: 'MS Level', field: 'MSLevel', sorter: 'number',
          headerTooltip: 'The level of mass spectrometry analysis (e.g., MS1 or MS2).'
        },
        { 
          title: 'Retention time', field: 'RT', formatter: toFixedFormatter(), sorter: 'number',
          headerTooltip: 'The time at which the spectrum was detected during the chromatographic separation in seconds.'
        },
        { 
          title: 'Precursor Mass', field: 'PrecursorMass', formatter: toFixedFormatter(), sorter: 'number',
          headerTooltip: 'The mass of the precursor ion selected for fragmentation in Daltons.'
        },
        { 
          title: '#Masses', field: '#Masses', sorter: 'number',
          headerTooltip: 'The number of detected masses in the spectrum.'
        },
      ] as ColumnDefinition[],
    }
  },
  computed: {
    tableData(): Record<string, unknown>[] {
      const rows = this.streamlitDataStore.allDataForDrawing.per_scan_data
      rows.forEach((row) => (row['id'] = row['index']))
      return rows
    },
  },
  methods: {
    updateSelectedScan(selectedRow?: number) {
      if (selectedRow !== undefined) {
        if (selectedRow !== this.selectionStore.selectedScanIndex) {
          this.selectionStore.updateSelectedMass(undefined)
        }
        this.selectionStore.updateSelectedScan(selectedRow)
      }
    },
  },
})
</script>
