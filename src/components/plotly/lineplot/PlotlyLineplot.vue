<template>
  <div :id="id" style="height: 100%; width: 100%"></div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from "vue"
import Plotly from 'plotly.js-dist-min'
import { v4 as uuid } from 'uuid'
import type { Theme, RenderData } from 'streamlit-component-lib'
import { useStreamlitDataStore } from '@/stores/streamlit-data'
import type { PlotlyLineArguments } from './plotly-lineplot'

export default defineComponent({
  name: 'PlotlyLineplot',
  props: {
    args: {
      type: Object as PropType<PlotlyLineArguments>,
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
  created() {
    this.id = uuid()
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
          x: this.args.x,
          y: this.args.y,
          mode: 'lines',
          type: 'scatter',
          connectgaps: false
        }
      ]
    },
    layout(): Partial<Plotly.Layout> {
      return {
        title: this.args.title,
        showlegend: false,
        height: 400,
        xaxis: {
          title: 'Monoisotopic Mass',
          showgrid: false
        },
        yaxis: {
          title: 'Intensity',
          showgrid: true,
          gridcolor: this.theme?.secondaryBackgroundColor,
          rangemode: "nonnegative",
          fixedrange: true,
        },
        paper_bgcolor: this.theme?.backgroundColor,
        plot_bgcolor: this.theme?.backgroundColor,
        font: {
          color: this.theme?.textColor,
          family: this.theme?.font
        },
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
