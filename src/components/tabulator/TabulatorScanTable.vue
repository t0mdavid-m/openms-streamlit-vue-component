<template>
  <TabulatorTable
    :table-data="tableData"
    :column-definitions="columnDefinitions"
    title="Scan Table"
    :index="index"
    table-layout-param="fitColumns"
    @row-selected="updateSelectedScan"
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
        { title: 'Index', field: 'id' },
        { title: 'Scan Number', field: 'Scan' },
        { title: 'MS Level', field: 'MSLevel' },
        { title: 'Retention time', field: 'RT', formatter: toFixedFormatter() },
        { title: 'Precursor Mass', field: 'PrecursorMass', formatter: toFixedFormatter() },
        { title: '#Masses', field: '#Masses' },
      ] as ColumnDefinition[],
    }
  },
  computed: {
    tableData(): Record<string, unknown>[] {
      const relevantFields = ['Scan', 'MSLevel', 'RT', 'PrecursorMass', '#Masses']
      const rows = this.streamlitDataStore.allDataForDrawing.per_scan_data.map(row => {
        let filteredRow: Record<string, unknown> = {}
        relevantFields.forEach(field => {
          filteredRow[field] = row[field]
        })
        filteredRow['id'] = row['index']
        return filteredRow;
    })
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
