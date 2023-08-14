<template>
  <div :id="id" style="height: 100%; width: 100%"></div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'
import Plotly from 'plotly.js-dist-min'
import type { Theme, RenderData } from 'streamlit-component-lib'
import { useStreamlitDataStore } from '@/stores/streamlit-data'
import type { Plotly3DplotArguments } from './plotly-3Dplot'
import {useSelectionStore} from "@/stores/selection";

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
  data() {
    return {
      maximumIntensity: 0 as number
    }
  },
  setup() {
    const streamlitDataStore = useStreamlitDataStore()
    const selectionStore = useSelectionStore()
    return { streamlitDataStore, selectionStore }
  },
  computed: {
    id(): string {
      return `graph-${this.index}`
    },
    theme(): Theme | undefined {
      return this.streamlitDataStore.theme
    },
    selectedScanRow(): number | undefined {
      return this.selectionStore.selectedScanIndex
    },


    data(): Plotly.Data[] {
      if (!this.selectedScanRow) return []

      // Get selected row entry and filter by required columns
      const selected_scan_info = this.streamlitDataStore.allDataframes.per_scan_data[this.selectedScanRow]

      // get signal & noise array
      const precursor_signals = this.getPrecursorSignal(selected_scan_info)
      if (Object.keys(precursor_signals).length === 0) return []

      // save max z value for layout
      this.maximumIntensity = precursor_signals.signal_z
          .concat(precursor_signals.noise_z)
          .reduce((a, b) => Math.max(a, b), -Infinity)

      return [
        {
          name: 'Signal',
          type: 'scatter3d',
          mode: 'lines',
          x: precursor_signals.signal_x,
          y: precursor_signals.signal_y,
          z: precursor_signals.signal_z,
          line: {
            color: '#3366CC',
          },
        },
        {
          name: 'Noise',
          type: 'scatter3d',
          mode: 'lines',
          x: precursor_signals.noise_x,
          y: precursor_signals.noise_y,
          z: precursor_signals.noise_z,
          line: {
            color: '#DC3912',
          },
        },
      ]
    },
    layout(): Partial<Plotly.Layout> {
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
          zaxis: { title: 'Intensity', range: [0, this.maximumIntensity] },
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
    selectedScanRow() {
      this.graph()
    },
  },
  mounted() {
    this.graph()
  },
  methods: {
    async graph() {
      // 3Dplot TODO: 1. add "markers" 2. draw signals from mass table (not precursor)
      await Plotly.newPlot(this.id, this.data, this.layout, { responsive: true })
    },
    getPrecursorSignal(selected_scan: Record<string, unknown>): Record<string, number[]> {
      // if the selected scan is not MS2 -> not drawing anything
      if (selected_scan.PrecursorScan == 0) return {}

      // if this scan is MS2, but doesn't have precursor scan -> not drawing anything
      const precursor_scan = this.streamlitDataStore.allDataframes.per_scan_data.find(row =>
          row.Scan === selected_scan.PrecursorScan) as Record<string, unknown>
      if (!precursor_scan) return {}

      // from the found "Precursor Scan", find if any masses from that scan matches selection's "Precursor Mass"
      const mass_list = precursor_scan.MonoMass as Array<number>
      const target_mass = selected_scan.PrecursorMass as number
      for (let index = 0, size = mass_list.length; index < size; ++size)
      {
        const mass = mass_list[index]
        if (Math.abs(mass - target_mass) < 1e-2)
        {
          return this.getSignalNoiseObject((precursor_scan.SignalPeaks as Array<number[][]>)[index],
              (precursor_scan.NoisyPeaks as Array<number[][]>)[index])
        }
      }

      return {}
    },
    getSignalNoiseObject(signal_peaks: number[][], noisy_peaks: number[][]): Record<string, number[]> {
      // signal peaks
      let signal_object = this.get3DplotInputFromSNRPeaks(signal_peaks, true)
      // noise peaks
      let noisy_object = this.get3DplotInputFromSNRPeaks(noisy_peaks, false)

      Object.assign(signal_object, noisy_object); // append noisy_object to signal_object
      return signal_object
    },
    get3DplotInputFromSNRPeaks(peaks: number[][], is_signal: boolean): Record<string, number[]> {
      let xs = [], ys = [], zs = [];
      for (let i = 0, len = peaks.length; i < len; i++) {
        const x = peaks[i][1] * peaks[i][3]! // mass
        xs.push(x, x, x)
        const y = peaks[i][3] // charge
        ys.push(y, y, y)
        const z = peaks[i][2]  // intensity
        zs.push(-100000, z, -100000)
      }
      return is_signal? {'signal_x': xs, 'signal_y': ys, 'signal_z': zs} : {'noise_x': xs, 'noise_y': ys, 'noise_z': zs}
    }
  },
})
</script>
