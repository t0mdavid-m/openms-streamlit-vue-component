<template>
  <div :id="id" style="height: 100%; width: 100%"></div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'
import Plotly from 'plotly.js-dist-min'
import { v4 as uuid } from 'uuid'
import type { Theme, RenderData } from 'streamlit-component-lib'
import { useStreamlitDataStore } from '@/stores/streamlit-data'
import type { PlotlyHeatmapArguments } from './plotly-heatmap'

export default defineComponent({
  name: 'PlotlyHeatmap',
  props: {
    args: {
      type: Object as PropType<PlotlyHeatmapArguments>,
      required: true
    },
    index: {
      type: Number,
      required: true
    }
  },
  setup() {
    const streamlitDataStore = useStreamlitDataStore()

    return { streamlitDataStore }
  },
  mounted() {
    this.graph()
  },
  watch: {
    renderData() {
      this.graph()
    }
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
    data(): Plotly.Data[] {
      return [
        {
          type: 'scattergl',
          name: 'raw peaks',
          x: this.args.x,
          y: this.args.y,
          mode: 'markers',
          marker: {
            color: this.args.intensity,
            colorscale: 'Portland'
          },
          hovertext: this.args.intensity.map((inty) => Math.round(inty).toString())
        }
      ]
    },
    layout(): Partial<Plotly.Layout> {
      return {
        title: this.args.title,
        showlegend: this.args.showLegend,
        xaxis: {
          title: 'Retention Time'
        },
        yaxis: {
          title: 'Monoisotopic Mass'
        },
        paper_bgcolor: this.theme?.backgroundColor,
        plot_bgcolor: this.theme?.secondaryBackgroundColor,
        font: {
          color: this.theme?.textColor,
          family: this.theme?.font
        }
      }
    }
  },
  methods: {
    async graph() {
      await Plotly.newPlot(this.id, this.data, this.layout, { responsive: true })
    }
  }
})
</script>
