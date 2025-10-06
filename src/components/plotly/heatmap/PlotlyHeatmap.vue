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

interface FeatureDataPoint {
  FeatureIndex: number
  MonoisotopicMass: number
  SumIntensity: number
  RetentionTime: number
  ScanNum: number
  ScanIndex: number
  MassIndex: number
}

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
      zoomRange: undefined as HeatmapData | undefined,
      colorbarVisible: true,
      userOverrideColorbar: false, // Track if user has manually set preference
      plotWidth: 800,
      plotHeight: 600,
      resizeObserver: null as ResizeObserver | null
    }
  },
  computed: {
    id(): string {
      return `graph-${this.index}`
    },
    isNarrowPlot(): boolean {
      return this.plotWidth < 600
    },
    effectiveColorbarVisible(): boolean {
      // If user has manually overridden, respect their choice regardless of plot width
      if (this.userOverrideColorbar) {
        return this.colorbarVisible
      }
      // Otherwise, auto-hide when narrow but show when wide
      return this.isNarrowPlot ? false : this.colorbarVisible
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
        case 'Raw MS2 Heatmap':
          return this.streamlitDataStore.allDataForDrawing.raw_heatmap_df
        case 'Deconvolved MS1 Heatmap':
          return this.streamlitDataStore.allDataForDrawing.deconv_heatmap_df
        case 'Deconvolved MS2 Heatmap':
          return this.streamlitDataStore.allDataForDrawing.deconv_heatmap_df
        default:
          return []
      }
    },
    featureData(): FeatureDataPoint[] {
      if (this.args.title !== 'Deconvolved MS1 Heatmap') {
        return []
      }
      const data = this.streamlitDataStore.allDataForDrawing.feature_data
      return (data as unknown as FeatureDataPoint[]) || []
    },
    featureBoundingBox(): { x0: number; x1: number; y0: number; y1: number } | null {
      if (this.featureData.length === 0) {
        return null
      }
      
      // Calculate min/max for RetentionTime and MonoisotopicMass
      const retentionTimes = this.featureData.map(d => d.RetentionTime)
      const masses = this.featureData.map(d => d.MonoisotopicMass)
      
      const minRTFeature = Math.min(...retentionTimes)
      const maxRTFeature = Math.max(...retentionTimes)
      const minMassFeature = Math.min(...masses)
      const maxMassFeature = Math.max(...masses)
      const minRT = Math.min(...this.xValues)
      const maxRT = Math.max(...this.xValues)
      const minMass = Math.min(...this.yValues)
      const maxMass = Math.max(...this.yValues)
      
      // Get current visible ranges (accounts for zoom level)
      let visibleRtRange: number
      let visibleMassRange: number
      
      if (this.xRange && this.yRange) {
        // Use the current zoom level
        visibleRtRange = this.xRange[1] - this.xRange[0]
        visibleMassRange = this.yRange[1] - this.yRange[0]
      } else {
        // Fallback to data extent when no zoom is applied
        visibleRtRange = maxRT - minRT
        visibleMassRange = maxMass - minMass
      }
      
      // Calculate plot dimensions accounting for margins
      const effectivePlotWidth = this.plotWidth - (this.effectiveColorbarVisible ? 180 : 80)
      const effectivePlotHeight = this.plotHeight - 120
      
      // Calculate aspect ratio to determine pixel-to-data ratios for each axis
      const rtPerPixel = visibleRtRange / effectivePlotWidth
      const massPerPixel = visibleMassRange / effectivePlotHeight
      
      // Use a fixed "pixel" margin
      const pixelMargin = 7.5
      const rtMargin = rtPerPixel * pixelMargin
      const massMargin = massPerPixel * pixelMargin
      
      const centerRT = (minRTFeature + maxRTFeature) / 2
      const centerMass = (minMassFeature + maxMassFeature) / 2
      
      // Calculate half-widths to encompass all feature points
      const halfRTSpan = (maxRTFeature - minRTFeature) / 2
      const halfMassSpan = (maxMassFeature - minMassFeature) / 2
      
      // Apply symmetric margins around the center to ensure the datapoint is centered
      return {
        x0: centerRT - halfRTSpan - rtMargin,
        x1: centerRT + halfRTSpan + rtMargin,
        y0: centerMass - halfMassSpan - massMargin,
        y1: centerMass + halfMassSpan + massMargin
      }
    },
    yAxisLabel(): string {
      switch (this.args.title) {
        case 'Raw MS1 Heatmap':
          return 'm/z'
        case 'Raw MS2 Heatmap':
          return 'm/z'
        case 'Deconvolved MS1 Heatmap':
          return 'Monoisotopic Mass'
        case 'Deconvolved MS2 Heatmap':
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
        case 'Raw MS2 Heatmap':
          return this.selectionStore.selectedRawMS2Heatmap
        case 'Deconvolved MS1 Heatmap':
          return this.selectionStore.selectedDeconvHeatmap
        case 'Deconvolved MS2 Heatmap':
          return this.selectionStore.selectedDeconvMS2Heatmap
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
            showscale: this.effectiveColorbarVisible,
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
      const baseLayout: Partial<Plotly.Layout> = {
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
        // Ensure plot uses full available space when colorbar is hidden
        margin: {
          l: 60,
          r: this.effectiveColorbarVisible ? 120 : 20,
          t: 60,
          b: 60
        }
      }

      // Add feature bounding box if available
      if (this.featureBoundingBox) {
        baseLayout.shapes = [
          {
            type: 'rect',
            x0: this.featureBoundingBox.x0,
            x1: this.featureBoundingBox.x1,
            y0: this.featureBoundingBox.y0,
            y1: this.featureBoundingBox.y1,
            line: {
              color: 'black',
              width: 2
            },
            fillcolor: 'rgba(0, 0, 0, 0)', // Transparent fill
            layer: 'above'
          }
        ]
      }

      return baseLayout
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
        case 'Raw MS2 Heatmap':
          this.selectionStore.updateRawMS2HeatmapSelection(this.zoomRange)
          break
        case 'Deconvolved MS1 Heatmap':
          this.selectionStore.updateDeconvHeatmapSelection(this.zoomRange)
          break
        case 'Deconvolved MS2 Heatmap':
          this.selectionStore.updateDeconvMS2HeatmapSelection(this.zoomRange)
          break
      }
    },
  },
  mounted() {
    this.graph()
    this.setupResizeObserver()
  },
  beforeUnmount() {
    this.cleanupResizeObserver()
  },
  methods: {
    async toggleColorbar() {
      this.colorbarVisible = !this.colorbarVisible
      this.userOverrideColorbar = true // Mark that user has manually set preference
      await this.updatePlot()
    },
    async updatePlot() {
      const plotElement = document.getElementById(this.id) as Plotly.PlotlyHTMLElement
      if (plotElement) {
        try {
          // Update colorbar visibility first
          await Plotly.restyle(plotElement, {
            'marker.showscale': this.effectiveColorbarVisible
          }, [0])
          
          // Then update layout margins
          await Plotly.relayout(plotElement, {
            margin: {
              r: this.effectiveColorbarVisible ? 120 : 20
            }
          })
        } catch (error) {
          // Silently handle errors to avoid console spam
        }
      }
    },
    setupResizeObserver() {
      const plotElement = document.getElementById(this.id)
      if (plotElement && window.ResizeObserver) {
        this.resizeObserver = new ResizeObserver((entries) => {
          for (const entry of entries) {
            const newWidth = entry.contentRect.width
            const newHeight = entry.contentRect.height
            const widthChanged = Math.abs(newWidth - this.plotWidth) > 10
            const heightChanged = Math.abs(newHeight - this.plotHeight) > 10
            
            if (widthChanged || heightChanged) { // Avoid too frequent updates
              const wasNarrow = this.isNarrowPlot
              this.plotWidth = newWidth
              this.plotHeight = newHeight
              const isNowNarrow = this.isNarrowPlot
              
              // Handle transitions between narrow and wide
              if (wasNarrow !== isNowNarrow) {
                if (!this.userOverrideColorbar) {
                  // Only auto-adjust if user hasn't manually overridden
                  if (isNowNarrow) {
                    // Becoming narrow: hide colorbar by default
                    this.colorbarVisible = false
                  } else {
                    // Becoming wide: show colorbar by default
                    this.colorbarVisible = true
                  }
                }
                this.updatePlot()
              }
            }
          }
        })
        this.resizeObserver.observe(plotElement)
      }
    },
    cleanupResizeObserver() {
      if (this.resizeObserver) {
        this.resizeObserver.disconnect()
        this.resizeObserver = null
      }
    },
    async graph() {
      await Plotly.newPlot(this.id, this.data, this.layout, this.getPlotConfig())
      this.setupPlotEventHandlers()
    },
    getPlotConfig(): Partial<Plotly.Config> {
      return {
        modeBarButtonsToRemove: ['toImage', 'sendDataToCloud'] as any,
        modeBarButtonsToAdd: [
          {
            title: 'Download as SVG',
            name: 'toImageSvg',
            icon: Plotly.Icons.camera,
            click: (plotlyElement: any) => {
              Plotly.downloadImage(plotlyElement, {
                filename: 'FLASHViewer-heatmap',
                height: 400,
                width: 1200,
                format: 'svg',
              })
            },
          },
          {
            title: 'Toggle Colorbar',
            name: 'toggleColorbar',
            icon: {
              'width': 1792,
              'height': 1792,
              'path': 'M1408 768v192q0 40-28 68t-68 28H480q-40 0-68-28t-28-68V768q0-40 28-68t68-28h832q40 0 68 28t28 68zm0-384v192q0 40-28 68t-68 28H480q-40 0-68-28t-28-68V384q0-40 28-68t68-28h832q40 0 68 28t28 68zm0-384v192q0 40-28 68t-68 28H480q-40 0-68-28t-28-68V0q0-40 28-68t68-28h832q40 0 68 28t28 68z',
              'transform': 'matrix(1 0 0 -1 0 1792)'
            },
            click: () => {
              this.toggleColorbar()
            },
          },
        ],
      }
    },
    setupPlotEventHandlers() {
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
          else if (
              (this.args.title === 'Deconvolved MS2 Heatmap')
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
