<template>
  <div :id="id" style="width: 100%"></div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'
import Plotly from 'plotly.js-dist-min'
import type { Theme } from 'streamlit-component-lib'
import { useStreamlitDataStore } from '@/stores/streamlit-data'
import type { Plotly3DplotArguments } from './plotly-3Dplot'
import { useSelectionStore } from '@/stores/selection'

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
    const selectionStore = useSelectionStore()
    return { streamlitDataStore, selectionStore }
  },
  data() {
    return {
      maximumIntensity: 0 as number,
    }
  },
  computed: {
    id(): string {
      return `graph-${this.index}`
    },
    title(): string {
      if (this.selectedScanRow === undefined) return ''
      return this.selectedMassRow === undefined ? 'Precursor signals' : 'Mass signals'
    },
    theme(): Theme | undefined {
      return this.streamlitDataStore.theme
    },
    selectedScanRow(): number | undefined {
      return this.selectionStore.selectedScanIndex
    },
    selectedMassRow(): number | undefined {
      return this.selectionStore.selectedMassIndex
    },
    dataForDrawing(): Plotly.Data[] {
      if (this.selectedScanRow === undefined) return []

      // Get selected row entry and filter by required columns
      const selected_scan_info =
        this.streamlitDataStore.allDataForDrawing.per_scan_data[this.selectedScanRow] ?? {}
      // get signal & noise array for drawing
      let signals_for_drawing: Record<string, number[]> = {}

      if (this.selectedMassRow === undefined) {
        // when scan is selected
        signals_for_drawing = this.getPrecursorSignal(selected_scan_info)
      } else {
        // when mass is selected
        signals_for_drawing = this.getSignalNoiseObject(
          (selected_scan_info.SignalPeaks as Array<number[][]> | undefined)?.[
            this.selectedMassRow
          ] ?? [[]],
          (selected_scan_info.NoisyPeaks as Array<number[][]> | undefined)?.[
            this.selectedMassRow
          ] ?? [[]]
        )
      }

      // if nothing was retrieved for drawing
      if (Object.keys(signals_for_drawing).length === 0) return []

      // save max z value for layout
      this.updateMaximumIntensity(signals_for_drawing)

      return [
        {
          name: 'Signal',
          type: 'scatter3d',
          mode: 'lines',
          x: signals_for_drawing.signal_x,
          y: signals_for_drawing.signal_y,
          z: signals_for_drawing.signal_z,
          line: {
            color: '#3366CC',
          },
        },
        {
          name: 'Noise',
          type: 'scatter3d',
          mode: 'lines',
          x: signals_for_drawing.noise_x,
          y: signals_for_drawing.noise_y,
          z: signals_for_drawing.noise_z,
          line: {
            color: '#DC3912',
          },
        },
      ]
    },
    layout(): Partial<Plotly.Layout> {
      return {
        title: `<b>${this.title}</b>`,
        paper_bgcolor: this.theme?.backgroundColor,
        plot_bgcolor: this.theme?.secondaryBackgroundColor,
        height: 800,
        font: {
          color: this.theme?.textColor,
          family: this.theme?.font,
        },
        scene: {
          xaxis: { title: 'Mass' },
          yaxis: { title: 'Charge' },
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
    selectedMassRow() {
      this.graph()
    },
  },
  mounted() {
    this.graph()
  },
  methods: {
    updateMaximumIntensity(signals_for_drawing: Record<string, number[]>) {
      this.maximumIntensity = signals_for_drawing.signal_z
        .concat(signals_for_drawing.noise_z)
        .reduce((a, b) => Math.max(a, b), -Infinity)
    },
    async graph() {
      // 3Dplot TODO: 1. add "markers" 2. draw signals from mass table (not precursor)
      await Plotly.newPlot(this.id, this.dataForDrawing, this.layout, {
        modeBarButtonsToRemove: ['toImage', 'sendDataToCloud'],
        modeBarButtonsToAdd: [
          {
            title: 'Download as SVG',
            name: 'toImageSvg',
            icon: Plotly.Icons.camera,
            click: function (plotlyElement) {
              Plotly.downloadImage(plotlyElement, {
                filename: 'FLASHViewer-3d-plot',
                height: 800,
                width: 800,
                format: 'svg',
              })
            },
          },
        ],
      })
    },
    getPrecursorSignal(selected_scan: Record<string, unknown>): Record<string, number[]> {
      // if the selected scan is not MS2 -> not drawing anything
      if (selected_scan.PrecursorScan == 0) return {}

      // if this scan is MS2, but doesn't have precursor scan -> not drawing anything
      const precursor_scan = this.streamlitDataStore.allDataForDrawing.per_scan_data.find(
        (row) => row.Scan === selected_scan.PrecursorScan
      ) as Record<string, unknown>
      if (!precursor_scan) return {}

      // from the found "Precursor Scan", find if any masses from that scan matches selection's "Precursor Mass"
      const mass_list = precursor_scan.MonoMass as Array<number>
      const target_mass = selected_scan.PrecursorMass as number
      for (let index = 0, size = mass_list.length; index < size; ++index) {
        const mass = mass_list[index]
        if (Math.abs(mass - target_mass) < 1e-2) {
          return this.getSignalNoiseObject(
            (precursor_scan.SignalPeaks as Array<number[][]>)[index],
            (precursor_scan.NoisyPeaks as Array<number[][]>)[index]
          )
        }
      }

      return {}
    },
    getSignalNoiseObject(
      signal_peaks: number[][],
      noisy_peaks: number[][]
    ): Record<string, number[]> {
      console.log('get signal peaks', signal_peaks)
      console.log('get noisy peaks', noisy_peaks)
      // signal peaks
      let signal_object = this.get3DplotInputFromSNRPeaks(signal_peaks, true)
      // noise peaks
      let noisy_object = this.get3DplotInputFromSNRPeaks(noisy_peaks, false)

      Object.assign(signal_object, noisy_object) // append noisy_object to signal_object
      return signal_object
    },
    get3DplotInputFromSNRPeaks(peaks: number[][], is_signal: boolean): Record<string, number[]> {
      let xs = [],
        ys = [],
        zs = []
      for (let i = 0, len = peaks.length; i < len; i++) {
        const z = peaks[i][2] // intensity
        if (z <= 0) continue // if intensity is below zero, ignore
        zs.push(-100000, z, -100000)
        const x = peaks[i][1] * peaks[i][3]! // mass
        xs.push(x, x, x)
        const y = peaks[i][3] // charge
        ys.push(y, y, y)
      }
      return is_signal
        ? { signal_x: xs, signal_y: ys, signal_z: zs }
        : { noise_x: xs, noise_y: ys, noise_z: zs }
    },
  },
})
</script>
