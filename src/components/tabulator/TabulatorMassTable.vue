<template>
  <TabulatorTable
    :table-data="tableData"
    :column-definitions="columnDefinitions"
    title="Mass Table"
    :index="index"
    :selected-row-index-from-listening="selectedMassTableRow"
    :default-row=0
    :go-to-fields="['id']"
    :initial-sort="[{ column: 'QScore', dir: 'desc' }]"
    @row-selected="updateSelectedMass"
  />
</template>

<script lang="ts">
import { defineComponent, type PropType, nextTick } from 'vue'
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
        {
          title: 'Index', field: 'id', sorter: 'number',
          headerTooltip: 'The sequential index of the mass entry in the dataset.'
        },
        {
          title: 'Feature Index', field: 'FeatureIndex', sorter: 'number',
          headerTooltip: 'Index of the feature in the feature list'
        },
        {
          title: 'Monoisotopic mass', field: 'MonoMass', formatter: toFixedFormatter(), sorter: 'number',
          headerTooltip: 'The monoisotopic mass of the detected ion in Daltons.'
        },
        { 
          title: 'Sum intensity', field: 'SumIntensity', formatter: toFixedFormatter(), sorter: 'number',
          headerTooltip: 'The total intensity of the detected mass across all isotopic peaks and charges.'
        },
        { 
          title: 'Min charge', field: 'MinCharges', sorter: 'number',
          headerTooltip: 'The minimum charge state detected for the mass.'
        },
        { 
          title: 'Max charge', field: 'MaxCharges', sorter: 'number',
          headerTooltip: 'The maximum charge state detected for the mass.'
        },
        { 
          title: 'Min isotope', field: 'MinIsotopes', sorter: 'number',
          headerTooltip: 'The smallest observed isotopic shift, expressed as a multiple of the average isotopic mass difference at 55kDA.'

        },
        { 
          title: 'Max isotope', field: 'MaxIsotopes', sorter: 'number',
          headerTooltip: 'The largest observed isotopic shift, expressed as a multiple of the average isotopic mass difference at 55kDA.'
        },
        { 
          title: 'Cosine score', field: 'CosineScore', formatter: toFixedFormatter(), sorter: 'number',
          headerTooltip: 'The cosine similarity score comparing the observed and theoretical isotopic patterns.'
        },
        { 
          title: 'SNR', field: 'SNR', formatter: toFixedFormatter(), sorter: 'number',
          headerTooltip: 'The signal-to-noise ratio for the detected mass.'
        },
        {
          title: 'QScore', field: 'QScore', formatter: toFixedFormatter(), sorter: 'number',
          headerSort: true,
          headerTooltip: 'The quality score indicating the confidence of the mass detection (higher is better).'
        },
      ] as ColumnDefinition[],
    }
  },
  computed: {
    selectedRow(): number | undefined {
      if (this.streamlitDataStore.allDataForDrawing.per_scan_data.length === 1) {
        return 0
      }
      return this.selectionStore.selectedScanIndex
    },
    selectedMassTableRow(): number | undefined {
      const massIndex = this.selectionStore.selectedMassIndex
      return massIndex
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
  },
  watch: {
    tableData: {
      handler() {
        // When table data updates (e.g., new scan selected), automatically select row with highest QScore
        if (this.tableData.length > 0) {
          nextTick(() => {
            // Find the row with the maximum QScore value
            const maxQScoreRow = this.tableData.reduce((max, row) =>
              (row.QScore as number) > (max.QScore as number) ? row : max
            , this.tableData[0])
            const maxQScoreId = maxQScoreRow.id as number
            this.updateSelectedMass(maxQScoreId)
          })
        }
      },
      immediate: false,
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
