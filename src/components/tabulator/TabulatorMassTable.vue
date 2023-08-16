<template>
  <TabulatorTable
    :table-data="tableData"
    :column-definitions="columnDefinitions"
    :title="args.title"
    :index="index"
    @row-selected="updateSelectedMass"
  />
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'
import { useStreamlitDataStore } from '@/stores/streamlit-data'
import type { TabulatorTableArguments } from './tabulator-table'
import { useSelectionStore } from '@/stores/selection'
import TabulatorTable from './TabulatorTable.vue'
import type { ColumnDefinition } from 'tabulator-tables'

export default defineComponent({
  name: 'TabulatorMassTable',
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
        { title: 'Monoisotopic mass', field: 'MonoMass' },
        { title: 'Sum intensity', field: 'SumIntensity' },
        { title: 'Min charge', field: 'MinCharges' },
        { title: 'Max charge', field: 'MaxCharges' },
        { title: 'Min isotope', field: 'MinIsotopes' },
        { title: 'Max isotope', field: 'MaxIsotopes' },
        { title: 'Cosine score', field: 'CosineScore' },
        { title: 'SNR', field: 'SNR' },
        { title: 'QScore', field: 'QScore' },
      ] as ColumnDefinition[],
    }
  },
  computed: {
    selectedRow(): number | undefined {
      return this.selectionStore.selectedScanIndex
    },
    tableData(): Record<string, unknown>[] {
      if (this.selectedRow === undefined) return []

      // Get selected row entry and filter by required columns
      const row = this.streamlitDataStore.allDataForDrawing.per_scan_data[this.selectedRow]

      // Prepare required columns
      const requiredColumns = this.columnDefinitions.map((col) => col.field!)

      // Prepare output array
      const tableData: Record<string, number>[] = []

      // Split row object into its columns
      Object.entries(row).forEach((column) => {
        const columnName = column[0]

        // Filter non-required columns and ignore id column
        if (!requiredColumns.includes(columnName)) return
        if (columnName === 'id') return

        // Split column's value (array) into rows and update row in tableData
        const columnValue = column[1] as number[] // must be an array
        columnValue.forEach((val, index) => {
          tableData[index] = {
            ...tableData[index],
            [columnName]: val,
          }
        })
      })

      // Add back id to the new rows
      tableData.map((entry, index) => (entry['id'] = index))

      return tableData
    },
  },
  methods: {
    updateSelectedMass(selectedRow?: number) {
      if (selectedRow !== undefined) {
        this.selectionStore.updateSelectedMass(selectedRow)
      }
    },
  },
})
</script>
