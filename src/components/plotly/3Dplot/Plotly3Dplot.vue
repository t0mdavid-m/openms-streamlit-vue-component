<template>
  <div :id="id" style="height: 100%; width: 100%"></div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'
import Plotly from 'plotly.js-dist-min'
import type { Theme, RenderData } from 'streamlit-component-lib'
import { useStreamlitDataStore } from '@/stores/streamlit-data'
import type { Plotly3DplotArguments } from './plotly-3Dplot'

export default defineComponent({
  name: 'Plotly3Dplot',
  props: {
    args: {
      type: Object as PropType<Plotly3DplotArguments>,
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
    data(): Plotly.Data[] {
      return [
        {
          name: 'Signal',
          type: 'scatter3d',
          mode: 'lines',
          x: this.args.signal_x,
          y: this.args.signal_y,
          z: this.args.signal_z,
          line: {
            color: '#3366CC',
          },
        },
        {
          name: 'Noise',
          type: 'scatter3d',
          mode: 'lines',
          x: this.args.noise_x,
          y: this.args.noise_y,
          z: this.args.noise_z,
          line: {
            color: '#DC3912',
          },
        },
      ]
    },
    layout(): Partial<Plotly.Layout> {
      const maxZ = this.args.signal_z
        .concat(this.args.noise_z)
        .reduce((a, b) => Math.max(a, b), -Infinity)
      return {
        title: this.args.title,
        paper_bgcolor: this.theme?.backgroundColor,
        plot_bgcolor: this.theme?.secondaryBackgroundColor,
        font: {
          color: this.theme?.textColor,
          family: this.theme?.font,
        },
        scene: {
          xaxis: { title: 'Charge' },
          yaxis: { title: 'Mass' },
          zaxis: { title: 'Intensity', range: [0, maxZ] },
          camera: {
            // initial view of the plot: mass-intensity plane
            eye: { x: 2.5, y: 0, z: 0.2 },
          },
        },
        showlegend: true,
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
