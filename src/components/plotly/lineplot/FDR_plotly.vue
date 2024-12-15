<template>
  <div :id="id" style="width: 100%"></div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'
import Plotly from 'plotly.js-dist-min'
import { useStreamlitDataStore } from '@/stores/streamlit-data'

export default defineComponent({
  name: 'FDRPlotly',
  props: {
    args: {
      type: Object as PropType<PlotlyLineArguments>,
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
    xValues_target(): number[] {
      if (this.streamlitDataStore.allDataForDrawing.ecdf_target === undefined) {
        return []
      }
      return this.streamlitDataStore.allDataForDrawing.ecdf_target.map(r => r.x) as number[]
    },
    xValues_decoy(): number[] {
      if (this.streamlitDataStore.allDataForDrawing.ecdf_decoy === undefined) {
        return []
      }
      return this.streamlitDataStore.allDataForDrawing.ecdf_decoy.map(r => r.x) as number[]
    },
    yValues_target(): number[] {
      if (this.streamlitDataStore.allDataForDrawing.ecdf_target === undefined) {
        return []
      }
      return this.streamlitDataStore.allDataForDrawing.ecdf_target.map(r => r.y) as number[]
    },
    yValues_decoy(): number[] {
      if (this.streamlitDataStore.allDataForDrawing.ecdf_decoy === undefined) {
        return []
      }
      return this.streamlitDataStore.allDataForDrawing.ecdf_decoy.map(r => r.y) as number[]
    },
    id(): string {
      return `graph-${this.index}`
    },
    layout(): Partial<Plotly.Layout> {
      return {
        title: `<b>${this.args.title}</b>`,
        showlegend: true,
        height: 400,
        xaxis: {
          title: 'QScore',
          showgrid: false,
        },
        yaxis: {
          title: 'Density',
          showgrid: true,
          rangemode: 'nonnegative',
          fixedrange: true,
        },
        paper_bgcolor: 'white',
        plot_bgcolor: 'white',
        font: {
          color: 'black',
          family: 'Arial',
        },
      }
    },
    data(): Plotly.Data[] {
      return [
        {
          x: this.xValues_target,
          y: this.yValues_target,
          mode: 'lines+markers',
          type: 'scatter',
          name: 'Target QScores',
          marker: { color: 'green' },
        },
        {
          x: this.xValues_decoy,
          y: this.yValues_decoy, // Dummy offset for decoy q-scores
          mode: 'lines+markers',
          type: 'scatter',
          name: 'Decoy QScores',
          marker: { color: 'red' },
        },
      ]
    },
  },
  watch: {
    xValues_target() {
      this.graph()
    }
  },
  mounted() {
    this.graph()
  },
  methods: {
    async graph() {
      await Plotly.newPlot(this.id, this.data, this.layout, {
        modeBarButtonsToRemove: ['toImage', 'sendDataToCloud'],
        modeBarButtonsToAdd: [
          {
            title: 'Download as SVG',
            name: 'toImageSvg',
            icon: Plotly.Icons.camera,
            click: (plotlyElement) => {
              Plotly.downloadImage(plotlyElement, {
                filename: 'FDR-plot',
                height: 400,
                width: 1200,
                format: 'svg',
              })
            },
          },
        ],
      })
    },
  },
})
</script>
