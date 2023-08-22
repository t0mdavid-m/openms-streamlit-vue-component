<template>
  <div :id="id" style="height: 100%; width: 100%"></div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'
import Plotly from 'plotly.js-dist-min'
import type { Theme, RenderData } from 'streamlit-component-lib'
import { useStreamlitDataStore } from '@/stores/streamlit-data'
import type { PlotlyHeatmapArguments } from './plotly-heatmap'

export default defineComponent({
  name: 'PlotlyHeatmap',
  props: {
    args: {
      type: Object as PropType<PlotlyHeatmapArguments>,
      required: true,
    },
    index: {
      type: Number,
      required: true,
    },
  },
  setup() {
    const streamlitDataStore = useStreamlitDataStore()

    return { streamlitDataStore }
  },
  computed: {
    id(): string {
      return `graph-${this.index}`
    },
    renderData(): RenderData | null {
      return this.streamlitDataStore.renderData
    },
    theme(): Theme | undefined {
      return this.streamlitDataStore.theme
    },
    xValues(): number[] {
      return this.streamlitDataStore.allDataForDrawing.deconv_heatmap_df.map((row) => row.rt as number)
    },
    yValues(): number[] {
      return this.streamlitDataStore.allDataForDrawing.deconv_heatmap_df.map((row) => row.mass as number)
    },
    markerColorValues(): number[] {
      return this.streamlitDataStore.allDataForDrawing.deconv_heatmap_df.map(
        (row) => row.intensity as number
      )
    },
    data(): Plotly.Data[] {
      return [
        {
          type: 'scattergl',
          name: 'raw peaks',
          x: this.xValues,
          y: this.yValues,
          mode: 'markers',
          marker: {
            color: this.markerColorValues,
            colorscale: 'Portland',
          },
          hovertext: this.markerColorValues.map((inty) => Math.round(inty).toString()),
        },
      ]
    },
    layout(): Partial<Plotly.Layout> {
      return {
        title: this.args.title,
        showlegend: this.args.showLegend,
        xaxis: {
          title: 'Retention Time',
        },
        yaxis: {
          title: 'Monoisotopic Mass',
        },
        paper_bgcolor: this.theme?.backgroundColor,
        plot_bgcolor: this.theme?.secondaryBackgroundColor,
        font: {
          color: this.theme?.textColor,
          family: this.theme?.font,
        },
      }
    },
  },
  watch: {
    renderData() {
      this.graph()
    },
  },
  mounted() {
    this.graph()
  },
  methods: {
    async graph() {
      await Plotly.newPlot(this.id, this.data, this.layout, { responsive: true })
    },
  },
})
</script>
