<template>
  <div id="graph"></div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import Plotly from 'plotly.js-dist-min'
import { Streamlit, type RenderData } from 'streamlit-component-lib'
import type { Theme } from 'streamlit-component-lib'
import { useStreamlitDataStore } from '@/stores/streamlit-data'

type Arguments = {
  title: string
  x: number[]
  y: number[]
  intensity: number[]
  show_legend: boolean
}

export default defineComponent({
  name: 'PlotlyHeatmap',
  setup() {
    const streamlitDataStore = useStreamlitDataStore()

    return { streamlitDataStore }
  },
  mounted() {
    this.graph()
  },
  updated() {
    Streamlit.setFrameHeight()
  },
  watch: {
    renderData() {
      this.graph()
    }
  },
  computed: {
    renderData(): RenderData | null {
      return this.streamlitDataStore.renderData
    },
    args(): Arguments {
      return this.streamlitDataStore.args
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
        showlegend: this.args.show_legend,
        xaxis: {
          title: 'Retention Time'
        },
        yaxis: {
          title: 'Monoisotopic Mass'
        },
        coloraxis: {
          colorbar: {
            title: {
              text: 'Intensity'
            }
          }
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
    graph() {
      Plotly.newPlot('graph', this.data, this.layout)
      Streamlit.setFrameHeight()
    }
  }
})
</script>
