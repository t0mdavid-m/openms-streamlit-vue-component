<template>
  <TabulatorTable
    :table-data="tableData"
    :column-definitions="columnDefinitions"
    title="Mass Table"
    :index="index"
    :selected-row-index-from-listening="selectedMassIndex"
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
import { toFixedFormatter } from '@/components/tabulator/tabulator-formatters'

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
        { title: 'Index', field: 'id', sorter: 'number'},
        { title: 'Monoisotopic mass', field: 'MonoMass', formatter: toFixedFormatter(), sorter: 'number' },
        { title: 'Sum intensity', field: 'SumIntensity', formatter: toFixedFormatter(), sorter: 'number' },
        { title: 'Min charge', field: 'MinCharges', sorter: 'number' },
        { title: 'Max charge', field: 'MaxCharges', sorter: 'number' },
        { title: 'Min isotope', field: 'MinIsotopes', sorter: 'number' },
        { title: 'Max isotope', field: 'MaxIsotopes', sorter: 'number' },
        { title: 'Cosine score', field: 'CosineScore', formatter: toFixedFormatter(), sorter: 'number' },
        { title: 'SNR', field: 'SNR', formatter: toFixedFormatter(), sorter: 'number' },
        { title: 'QScore', field: 'QScore', formatter: toFixedFormatter(), sorter: 'number' },
      ] as ColumnDefinition[],
      selectedMassIndex: undefined as number | undefined,
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
      if (row === undefined) return []

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
    selectedMassFromFragmentTable(): number | undefined {
      return this.selectionStore.selectedObservedMassFromFragmentTable
    },
  },
  watch: {
    selectedMassFromFragmentTable(newMass: number | undefined) {
      const foundMassIndex = this.tableData.findIndex((x) => x.MonoMass === newMass)
      if (foundMassIndex !== -1) {
        this.selectedMassIndex = foundMassIndex
      }
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
