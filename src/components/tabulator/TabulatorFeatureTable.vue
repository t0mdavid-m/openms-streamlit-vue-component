<template>
  <TabulatorTable
    :table-data="tableData"
    :column-definitions="columnDefinitions"
    title="Feature Table"
    :index="index"
    :selected-row-index-from-listening="selectedFeatureTableRow"
    :default-row="0"
    :go-to-fields="['FeatureIndex']"
    :initial-sort="[{ column: 'TotalIntensity', dir: 'desc' }]"
    @row-selected="updateSelectedFeature"
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
  name: 'TabulatorFeatureTable',
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
          title: 'Feature Index', field: 'FeatureIndex', sorter: 'number',
          headerTooltip: 'Unique identifier for the mass feature across scans.'
        },
        {
          title: 'Monoisotopic Mass', field: 'MonoMass', formatter: toFixedFormatter(), sorter: 'number',
          headerTooltip: 'Average monoisotopic mass of the feature in Daltons.'
        },
        {
          title: 'Total Intensity', field: 'TotalIntensity', formatter: toFixedFormatter(0), sorter: 'number',
          headerTooltip: 'Sum of intensities across all scans where this feature was detected.'
        },
        {
          title: 'Apex Intensity', field: 'ApexIntensity', formatter: toFixedFormatter(0), sorter: 'number',
          headerTooltip: 'Maximum intensity of the feature (at apex scan).'
        },
        {
          title: 'RT Start (s)', field: 'RTStart', formatter: toFixedFormatter(1), sorter: 'number',
          headerTooltip: 'Retention time when the feature was first detected (seconds).'
        },
        {
          title: 'RT End (s)', field: 'RTEnd', formatter: toFixedFormatter(1), sorter: 'number',
          headerTooltip: 'Retention time when the feature was last detected (seconds).'
        },
        {
          title: 'RT Duration (s)', field: 'RTDuration', formatter: toFixedFormatter(1), sorter: 'number',
          headerTooltip: 'Duration of the feature elution in seconds.'
        },
        {
          title: '# Scans', field: 'NumScans', sorter: 'number',
          headerTooltip: 'Number of scans where this feature was detected.'
        },
      ] as ColumnDefinition[],
    }
  },
  computed: {
    tableData(): Record<string, unknown>[] {
      const featureTable = this.streamlitDataStore.allDataForDrawing.feature_table
      if (!featureTable) return []

      // Convert to array of objects if needed
      if (Array.isArray(featureTable)) {
        return featureTable.map((row, idx) => ({ ...row, id: idx }))
      }

      // Handle column-oriented data format
      const columns = Object.keys(featureTable)
      if (columns.length === 0) return []

      const numRows = featureTable[columns[0]]?.length || 0
      const rows: Record<string, unknown>[] = []

      for (let i = 0; i < numRows; i++) {
        const row: Record<string, unknown> = { id: i }
        for (const col of columns) {
          row[col] = featureTable[col][i]
        }
        rows.push(row)
      }

      return rows
    },
    selectedFeatureTableRow(): number | undefined {
      const featureIndex = this.selectionStore.selectedFeatureIndex
      if (featureIndex === undefined) return undefined

      // Find the row index that matches the feature index
      const rowIndex = this.tableData.findIndex(
        row => row.FeatureIndex === featureIndex
      )
      return rowIndex >= 0 ? rowIndex : undefined
    },
  },
  methods: {
    updateSelectedFeature(selectedRow?: number) {
      if (selectedRow !== undefined && selectedRow >= 0 && selectedRow < this.tableData.length) {
        const row = this.tableData[selectedRow]
        const featureIndex = row.FeatureIndex as number
        const apexScanIndex = row.ApexScanIndex as number
        const apexMassIndex = row.ApexMassIndex as number

        // Update feature selection
        this.selectionStore.updateSelectedFeature(featureIndex)

        // Also update scan and mass to apex position
        if (apexScanIndex !== undefined) {
          this.selectionStore.updateSelectedScan(apexScanIndex)
        }
        if (apexMassIndex !== undefined) {
          this.selectionStore.updateSelectedMass(apexMassIndex)
        }
      }
    },
  },
})
</script>
