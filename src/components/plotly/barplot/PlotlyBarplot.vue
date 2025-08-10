<template>
  <div :id="id" style="width: 100%"></div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'
import Plotly from 'plotly.js-dist-min'
import type { Theme, RenderData } from 'streamlit-component-lib'
import { useStreamlitDataStore } from '@/stores/streamlit-data'
import type { PlotlyBarplotArguments } from './plotly-barplot'

export default defineComponent({
  name: 'PlotlyBarplot',
  props: {
    args: {
      type: Object as PropType<BarplotArguments>,
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
      return `barplot-${this.index}`
    },
    renderData(): RenderData | null {
      return this.streamlitDataStore.renderData
    },
    theme(): Theme | undefined {
      return this.streamlitDataStore.theme
    },
    labels(): string[] {
      return this.streamlitDataStore.allDataForDrawing.barplot_labels ?? []
    },
    values(): number[] {
      return this.streamlitDataStore.allDataForDrawing.barplot_values ?? []
    },
    data(): Plotly.Data[] {
      return [
        {
          type: 'bar',
          x: this.labels,
          y: this.values,
          marker: {
            color: 'rgba(58,71,80,0.6)',
            line: {
              color: 'rgba(58,71,80,1.0)',
              width: 1.5
            }
          },
          hoverinfo: 'x+y',
        }
      ]
    },
    layout(): Partial<Plotly.Layout> {
      return {
        title: `<b>${this.args.title}</b>`,
        showlegend: false,
        xaxis: { title: '' },
        yaxis: { title: '' },
        paper_bgcolor: this.theme?.backgroundColor,
        plot_bgcolor: this.theme?.secondaryBackgroundColor,
        font: {
          color: this.theme?.textColor,
          family: this.theme?.font,
        },
      }
    }
  },
  watch: {
    renderData() {
      this.plot()
    },
  },
  mounted() {
    this.plot()
  },
  methods: {
    async plot() {
      await Plotly.newPlot(this.id, this.data, this.layout, {
        modeBarButtonsToRemove: ['toImage', 'sendDataToCloud'],
        responsive: true,
      })
    },
  },
})
</script>
