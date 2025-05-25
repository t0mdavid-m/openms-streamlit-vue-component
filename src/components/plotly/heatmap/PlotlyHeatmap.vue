<template>
  <div :id="id" style="width: 100%"></div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'
import Plotly from 'plotly.js-dist-min'
import type { Theme, RenderData } from 'streamlit-component-lib'
import { useStreamlitDataStore } from '@/stores/streamlit-data'
import { useSelectionStore } from '@/stores/selection'
import type { HeatmapData } from '@/stores/selection'
import type { PlotlyHeatmapArguments } from './plotly-heatmap'

export default defineComponent({
  name: 'PlotlyHeatmap',
  props: {
    args: {
      type: Object as PropType<PlotlyHeatmapArguments>,
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
      zoomRange: undefined as HeatmapData | undefined
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
    dataForHeatmapDrawing(): Record<string, unknown>[] {
      switch (this.args.title) {
        case 'Raw MS1 Heatmap':
          return this.streamlitDataStore.allDataForDrawing.raw_heatmap_df
        case 'Deconvolved MS1 Heatmap':
          return this.streamlitDataStore.allDataForDrawing.deconv_heatmap_df
        default:
          return []
      }
    },
    yAxisLabel(): string {
      switch (this.args.title) {
        case 'Raw MS1 Heatmap':
          return 'm/z'
        case 'Deconvolved MS1 Heatmap':
          return 'Monoisotopic Mass'
        default:
          return ''
      }
    },
    xValues(): number[] {
      return this.dataForHeatmapDrawing.map((row) => row.rt as number)
    },
    yValues(): number[] {
      return this.dataForHeatmapDrawing.map((row) => row.mass as number)
    },
    selectedRange(): HeatmapData | undefined {
      switch (this.args.title) {
        case 'Raw MS1 Heatmap':
          return this.selectionStore.selectedRawHeatmap
        case 'Deconvolved MS1 Heatmap':
          return this.selectionStore.selectedDeconvHeatmap
        default:
            return undefined
      }
    },
    xRange(): number[] | undefined {
      if (this.selectedRange === undefined) {
        return undefined
      }
      else if ((this.selectedRange.xRange[0] < 0) && (this.selectedRange.xRange[1] < 0)){
        return undefined
      }
      else{
        return this.selectedRange.xRange
      }
    },
    yRange(): number[] | undefined {
      if (this.selectedRange === undefined) {
        return undefined
      }
      else if ((this.selectedRange.yRange[0] < 0) && (this.selectedRange.yRange[1] < 0)){
        return undefined
      }
      else{
        return this.selectedRange.yRange
      }
    },
    markerColorValues(): number[] {
      return this.dataForHeatmapDrawing.map((row) => row.intensity as number)
    },
    data(): Plotly.Data[] {
      const intensities = this.dataForHeatmapDrawing.map(row => row.intensity as number)
      const minIntensity = Math.min(...intensities.filter(x => x > 0))
      const maxIntensity = Math.max(...intensities)
      
      // Generate tick values for powers of 10
      const minPower = Math.floor(Math.log10(minIntensity))
      const maxPower = Math.ceil(Math.log10(maxIntensity))
      const tickValues = Array.from(
        { length: maxPower - minPower + 1 }, 
        (_, i) => Math.pow(10, minPower + i)
      )

      return [
        {
          type: 'scattergl',
          name: 'raw peaks',
          x: this.xValues,
          y: this.yValues,
          mode: 'markers',
          marker: {
            color: this.markerColorValues.map(v => v > 0 ? Math.log10(v) : 0),
            colorscale: 'Portland',
            showscale: true,
            colorbar: {
              title: 'Intensity',
              tickvals: tickValues.map(v => Math.log10(v)),
              ticktext: tickValues.map(v => v.toExponential(0)),
              tickmode: 'array'
            }
          },
          hovertext: this.dataForHeatmapDrawing.map(row => 
            (row.intensity as number).toExponential(2)
          ),
        },
      ]
    },
    layout(): Partial<Plotly.Layout> {
      return {
        title: `<b>${this.args.title}</b>`,
        showlegend: this.args.showLegend,
        xaxis: {
          title: 'Retention Time',
          range: this.xRange,
        },
        yaxis: {
          title: this.yAxisLabel,
          range: this.yRange,
        },
        paper_bgcolor: this.theme?.backgroundColor,
        plot_bgcolor: this.theme?.secondaryBackgroundColor,
        font: {
          color: this.theme?.textColor,
          family: this.theme?.font,
        },
      }
    },
  },
  watch: {
    renderData() {
      this.graph()
    },
    zoomRange() {
      if (this.zoomRange === undefined) return
      switch (this.args.title) {
        case 'Raw MS1 Heatmap':
          this.selectionStore.updateRawHeatmapSelection(this.zoomRange)
          break
        case 'Deconvolved MS1 Heatmap':
          this.selectionStore.updateDeconvHeatmapSelection(this.zoomRange)
          break
      }
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
                filename: 'FLASHViewer-heatmap',
                height: 400,
                width: 1200,
                format: 'svg',
              })
            },
          },
        ],
      })
      // Monitor zoom level
      const plotElement = document.getElementById(this.id) as Plotly.PlotlyHTMLElement
      if (plotElement) {
        plotElement.on('plotly_relayout', (eventData: Plotly.PlotRelayoutEvent) => {
          if (eventData['xaxis.autorange']) {
            // Handle auto-range reset
            this.zoomRange = {
              xRange: [-1, -1],
              yRange: [-1, -1],
            }
          }
          else if (
            eventData['xaxis.range[0]'] !== undefined && 
            eventData['xaxis.range[1]'] !== undefined && 
            eventData['yaxis.range[0]'] !== undefined && 
            eventData['yaxis.range[1]'] !== undefined
          ) {
            this.zoomRange = {
              xRange: [eventData['xaxis.range[0]'], eventData['xaxis.range[1]']],
              yRange: [eventData['yaxis.range[0]'], eventData['yaxis.range[1]']]
            }
          }
          
        })
        plotElement.on('plotly_click', (eventData: Plotly.PlotMouseEvent) => {
          const pointData = this.dataForHeatmapDrawing[eventData.points[0].pointIndex]
          const scan_idx: number | undefined = pointData?.scan_idx as number | undefined
          const mass_idx: number | undefined = pointData?.mass_idx as number | undefined

          if (scan_idx !== undefined) {
            this.selectionStore.updateSelectedScan(scan_idx)
          }
          
          if (
              (this.args.title === 'Deconvolved MS1 Heatmap')
              && (mass_idx !== undefined)
          ) {
            this.selectionStore.updateSelectedMass(mass_idx)
          }
        })
      }
    },
  },
})
</script>
