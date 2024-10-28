<template>
  <div :id="id" style="width: 100%"></div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'
import Plotly from 'plotly.js-dist-min'

export default defineComponent({
  name: 'FDRPlotly',
  props: {
    args: {
      type: Object as PropType<{ title: string, target_qscores?: number[], decoy_qscores?: number[] }>,
      required: true,
    },
    index: {
      type: Number,
      required: true,
    },
  },
  computed: {
    xValues(): number[] {
      // Use the data passed in args if available; otherwise, default values
      return this.args.target_qscores || [0.1, 0.2, 0.3, 0.4, 0.5]
    },
    yValues(): number[] {
      // Use decoy q-scores as dummy data for the y-axis
      return this.args.decoy_qscores || [0.15, 0.25, 0.35, 0.45, 0.55]
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
          x: this.xValues,
          y: this.yValues,
          mode: 'lines+markers',
          type: 'scatter',
          name: 'Target QScores',
          marker: { color: 'green' },
        },
        {
          x: this.xValues,
          y: this.yValues.map(y => y + 0.1), // Dummy offset for decoy q-scores
          mode: 'lines+markers',
          type: 'scatter',
          name: 'Decoy QScores',
          marker: { color: 'red' },
        },
      ]
    },
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
