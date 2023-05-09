<template>
  <div id="graph" @plotly_click="(event) => console.log(event)"></div>
</template>

<script lang="ts">
import { defineComponent, ref, type PropType } from 'vue'
import { useStreamlit } from './streamlit/use-streamlit'
import Plotly from 'plotly.js-dist-min'
import type { ArrowTable, Theme } from 'streamlit-component-lib'

type Arguments = {
  title: string
  x: number[]
  y: number[]
  intensity: number[]
  show_legend: boolean
}

export default defineComponent({
  name: 'PlotlyHeatmap',
  props: {
    args: {
      type: Object as PropType<Arguments>,
      required: true
    },
    theme: {
      type: Object as PropType<Theme>,
      required: true
    }
  },
  setup() {
    useStreamlit()
  },
  mounted() {
    this.graph()
  },
  watch: {
    theme() {
      this.graph()
    }
  },
  computed: {
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
        paper_bgcolor: this.theme.backgroundColor,
        plot_bgcolor: this.theme.secondaryBackgroundColor,
        font: {
          color: this.theme.textColor,
          family: this.theme.font
        }
      }
    }
  },
  methods: {
    graph() {
      Plotly.newPlot('graph', this.data, this.layout)
    }
  }
})
</script>
