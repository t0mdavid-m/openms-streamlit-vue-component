<template>
  <div class="pa-4">
    <v-row class="flex-nowrap">
      <TabulatorTable
        v-if="featureGroupTableData"
        title="Feature groups"
        :index="0"
        :table-data="featureGroupTableData"
        :column-definitions="featureGroupTableColumnDefinitions"
        table-index-field="FeatureGroupIndex"
        @row-selected="updateSelectedFeatureGroupRow"
        :default-row=0
      />
    </v-row>
    <div id="trace3Dplot" style="width: 90%"></div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { Streamlit } from 'streamlit-component-lib'
import TabulatorTable from '@/components/tabulator/TabulatorTable.vue'
import type { Theme } from 'streamlit-component-lib'
import type { ColumnDefinition } from 'tabulator-tables'
import { useStreamlitDataStore } from '@/stores/streamlit-data'
import Plotly from 'plotly.js-dist-min'

export default defineComponent({
  name: 'FLASHQuantView',
  components: { TabulatorTable },
  setup() {
    const streamlitDataStore = useStreamlitDataStore()
    return { streamlitDataStore }
  },
  data() {
    return {
      setHeightInterval: null as NodeJS.Timer | null, // currently just for development
      featureGroupTableColumnDefinitions: [
        { title: 'Index', field: 'FeatureGroupIndex' },
        { title: 'Monoisotopic Mass', field: 'MonoisotopicMass' },
        { title: 'Average Mass', field: 'AverageMass' },
        { title: 'Start Retention Time (FWHM)', field: 'StartRetentionTime(FWHM)' },
        { title: 'End Retention Time (FWHM)', field: 'EndRetentionTime(FWHM)' },
        { title: 'Feature Group Quantity', field: 'FeatureGroupQuantity' },
        { title: 'Feature Group Quantity', field: 'FeatureGroupQuantity' },
        { title: 'Min Charge', field: 'MinCharge' },
        { title: 'Max Charge', field: 'MaxCharge' },
        { title: 'Most Abundant Charge', field: 'MostAbundantFeatureCharge' },
        { title: 'Isotope Cosine Score', field: 'IsotopeCosineScore' },
      ] as ColumnDefinition[],
      selectedFeatureGroupIndex: undefined as number | undefined,
      maximumIntensity: 0 as number,
    }
  },
  computed: {
    theme(): Theme | undefined {
      return this.streamlitDataStore.theme
    },
    featureGroupTableData(): Record<string, unknown>[] {
      return this.streamlitDataStore.dataForDrawing.quant_data
    },
    trace3DgraphLayout(): Partial<Plotly.Layout> {
      return {
        title: 'Feature group signals',
        paper_bgcolor: this.theme?.backgroundColor,
        plot_bgcolor: this.theme?.secondaryBackgroundColor,
        height: 800,
        font: {
          color: this.theme?.textColor,
          family: this.theme?.font,
        },
        scene: {
          xaxis: { title: 'm/z' },
          yaxis: { title: 'retention time' },
          zaxis: { title: 'intensity', range: [0, this.maximumIntensity] },
        },
        showlegend: true,
      }
    },
  },
  watch: {
    selectedFeatureGroupIndex() {
      this.trace3DGraph()
    },
  },
  mounted() {
    this.setHeightInterval = setInterval(() => Streamlit.setFrameHeight(), 500)
  },
  unmounted() {
    if (this.setHeightInterval !== null) clearInterval(this.setHeightInterval)
  },
  methods: {
    async trace3DGraph() {
      await Plotly.newPlot('trace3Dplot', this.trace3DgraphData(), this.trace3DgraphLayout, {
        responsive: true,
      })
    },
    updateSelectedFeatureGroupRow(selectedRow?: number) {
      if (selectedRow !== undefined) {
        this.selectedFeatureGroupIndex = selectedRow
      }
    },
    trace3DgraphData(): Plotly.Data[] {
      if (this.selectedFeatureGroupIndex === undefined) return []

      const featureGroup = this.featureGroupTableData[this.selectedFeatureGroupIndex]
      const traceChargeSet = [...new Set(featureGroup.Charges as number[])] as number[]
      const traceObjects: Record<number, { mzs: number[]; rts: number[]; intys: number[] }> = {}
      traceChargeSet.forEach((value) => {
        traceObjects[value] = { mzs: [], rts: [], intys: [] }
      })
      const traceChargeArray = featureGroup.Charges as number[]
      traceChargeArray.forEach((charge, index) => {
        const currentMzs = (featureGroup.MZs as string[])[index].split(',').map(parseFloat)
        const currentRts = (featureGroup.RTs as string[])[index].split(',').map(parseFloat)
        const currentIntys = (featureGroup.Intensities as string[])[index]
          .split(',')
          .map(parseFloat)
        // initializing value for current trace (for -1000 in z level)
        traceObjects[charge].mzs.push(currentMzs[0])
        traceObjects[charge].rts.push(currentRts[0])
        traceObjects[charge].intys.push(-1000)

        // main push
        traceObjects[charge].mzs.push(...currentMzs)
        traceObjects[charge].rts.push(...currentRts)
        traceObjects[charge].intys.push(...currentIntys)

        // ending value for current trace (for -1000 in z level)
        traceObjects[charge].mzs.push(currentMzs[-1])
        traceObjects[charge].rts.push(currentRts[-1])
        traceObjects[charge].intys.push(-1000)
      })

      this.maximumIntensity = Math.max.apply(
        null,
        Object.values(traceObjects).map((object) => {
          return Math.max.apply(null, object.intys)
        })
      )

      let tracesForDrawing = [] as Plotly.Data[]
      Object.entries(traceObjects).forEach(([charge, feature]) => {
        tracesForDrawing.push({
          x: feature.mzs,
          y: feature.rts,
          z: feature.intys,
          mode: 'lines',
          line: {
            color: '#3366CC',
          },
          type: 'scatter3d',
          name: `Charge: ${charge}`,
        })
      })
      return tracesForDrawing
    },
  },
})
</script>

<style scoped lang="less"></style>
