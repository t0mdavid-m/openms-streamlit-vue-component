<template>
  <div class="tic-chromatogram-container">
    <!-- Plot Section - Full Height -->
    <div class="tic-plot-section">
      <div :id="plotId" class="tic-plot-container"></div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'
import Plotly from 'plotly.js-dist-min'
import type { Theme } from 'streamlit-component-lib'
import { useStreamlitDataStore } from '@/stores/streamlit-data'
import { useSelectionStore } from '@/stores/selection'
import type { TICChromatogramArguments, TICDataPoint } from './tic-chromatogram'
import { DEFAULT_TIC_CONFIG, DEFAULT_TIC_STYLING } from './tic-chromatogram'

export default defineComponent({
  name: 'TICChromatogram',
  props: {
    args: {
      type: Object as PropType<TICChromatogramArguments>,
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
      selectedRowIndex: undefined as number | undefined,
      plotInstance: undefined as any,
      currentXRange: undefined as number[] | undefined,
      msLevelFilter: 'all' as 'all' | 'ms1' | 'ms2', // MS level filter state
      // Integration mode state
      integrationMode: false,
      integrationStart: undefined as number | undefined,
      integrationEnd: undefined as number | undefined,
      isSelecting: false,
      integrationValue: undefined as number | undefined,
    }
  },
  computed: {
    plotId(): string {
      return `tic-plot-${this.index}`
    },
    
    theme(): Theme | undefined {
      return this.streamlitDataStore.theme
    },
    
    ticData(): TICDataPoint[] {
      try {
        const allData = this.streamlitDataStore.allDataForDrawing as any
        const data = allData?.tic
        if (!data || !Array.isArray(data)) {
          return []
        }
        return data as TICDataPoint[]
      } catch (error) {
        console.error('TICChromatogram: Error accessing TIC data:', error)
        return []
      }
    },
    
    filteredTicData(): TICDataPoint[] {
      if (this.msLevelFilter === 'ms1') {
        return this.ticData.filter(d => d.level === 1)
      } else if (this.msLevelFilter === 'ms2') {
        return this.ticData.filter(d => d.level === 2)
      }
      return this.ticData
    },
    
    plotData(): { x: number[], y: number[] } {
      const data = this.filteredTicData
      return {
        x: data.map(d => d.rt),
        y: data.map(d => d.tic)
      }
    },
    
    shouldShowDataPoints(): boolean {
      // Show individual points when zoomed in sufficiently
      if (!this.config.showDataPoints) return false
      
      // Calculate visible point count based on current zoom
      if (this.currentXRange) {
        const [xMin, xMax] = this.currentXRange
        const visiblePoints = this.plotData.x.filter(x => x >= xMin && x <= xMax)
        return visiblePoints.length <= (this.config.dataPointThreshold || 100)
      }
      
      // If no zoom, use total point count
      return this.plotData.x.length <= (this.config.dataPointThreshold || 100)
    },
    
    config() {
      return {
        ...DEFAULT_TIC_CONFIG,
        ...this.args.config
      }
    },
    
    styling() {
      return {
        ...DEFAULT_TIC_STYLING,
        backgroundColor: this.theme?.backgroundColor,
        ...this.args.styling
      }
    },
    
    data(): Plotly.Data[] {
      const traces: Plotly.Data[] = []
      
      // Main chromatogram line
      traces.push({
        x: this.plotData.x,
        y: this.plotData.y,
        mode: 'lines',
        type: 'scatter',
        name: 'TIC Chromatogram',
        line: {
          color: this.styling.lineColor,
          width: 2,
          shape: this.config.smoothCurve ? 'spline' : 'linear'
        },
        hovertemplate: 'RT: %{x:.2f}s<br>TIC: %{y:.0f}<extra></extra>',
        showlegend: false
      })
      
      // Shaded integration area - add before individual points so it's behind them
      if (this.integrationStart !== undefined && this.integrationEnd !== undefined) {
        const startRT = Math.min(this.integrationStart, this.integrationEnd)
        const endRT = Math.max(this.integrationStart, this.integrationEnd)
        
        // Filter data points in the selected range
        const selectedData = this.filteredTicData.filter(
          d => d.rt >= startRT && d.rt <= endRT
        )
        
        if (selectedData.length > 0) {
          // Add filled trace that follows the curve
          traces.push({
            x: selectedData.map(d => d.rt),
            y: selectedData.map(d => d.tic),
            fill: 'tozeroy',
            fillcolor: 'rgba(135, 206, 250, 0.3)',
            mode: 'none',
            type: 'scatter',
            showlegend: false,
            hoverinfo: 'skip'
          })
        }
      }
      
      // Individual points when zoomed
      if (this.shouldShowDataPoints) {
        traces.push({
          x: this.plotData.x,
          y: this.plotData.y,
          mode: 'markers',
          type: 'scatter',
          name: 'Data Points',
          marker: {
            color: this.styling.dataPointColor,
            size: 6,
            line: {
              color: this.styling.lineColor,
              width: 1
            }
          },
          hovertemplate: 'Scan: %{customdata}<br>RT: %{x:.2f}s<br>TIC: %{y:.0f}<extra></extra>',
          customdata: this.ticData.map(d => d.scan_idx),
          showlegend: false
        })
      }
      
      // Highlighted selected point
      if (this.selectedRowIndex !== undefined && this.selectedRowIndex < this.filteredTicData.length) {
        const selectedPoint = this.filteredTicData[this.selectedRowIndex]
        traces.push({
          x: [selectedPoint.rt],
          y: [selectedPoint.tic],
          mode: 'markers',
          type: 'scatter',
          name: 'Selected Point',
          marker: {
            color: this.styling.selectedPointColor,
            size: 10,
            symbol: 'circle-open',
            line: {
              width: 3,
              color: this.styling.selectedPointColor
            }
          },
          hovertemplate: 'Selected<br>Scan: %{customdata}<br>RT: %{x:.2f}s<br>TIC: %{y:.0f}<extra></extra>',
          customdata: [selectedPoint.scan_idx],
          showlegend: false
        })
      }
      
      return traces
    },
    
    layout(): Partial<Plotly.Layout> {
      const filterLabel = this.msLevelFilter === 'ms1' ? ' (MS1 Only)' :
                         this.msLevelFilter === 'ms2' ? ' (MS2 Only)' : ''
      const modeLabel = this.integrationMode ? ' - Integration Mode Active' : ''
      
      const layout: Partial<Plotly.Layout> = {
        title: `<b>${this.args.title}${filterLabel}${modeLabel}</b>`,
        showlegend: false,
        autosize: true,
        xaxis: {
          title: 'Retention Time (s)',
          showgrid: true,
          gridcolor: this.theme?.secondaryBackgroundColor,
          showline: true,
          linecolor: 'grey',
          linewidth: 1,
        },
        yaxis: {
          title: 'TIC Intensity',
          showgrid: true,
          gridcolor: this.theme?.secondaryBackgroundColor,
          rangemode: 'nonnegative',
          showline: true,
          linecolor: 'grey',
          linewidth: 1,
        },
        paper_bgcolor: this.theme?.backgroundColor,
        plot_bgcolor: this.theme?.backgroundColor,
        font: {
          color: this.theme?.textColor,
          family: this.theme?.font,
        },
        hovermode: 'closest',
        dragmode: this.integrationMode ? 'select' : 'zoom',
        annotations: []
      }
      
      // Add annotation with integrated value positioned on the curve
      if (this.integrationStart !== undefined && this.integrationEnd !== undefined && this.integrationValue !== undefined) {
        const startRT = Math.min(this.integrationStart, this.integrationEnd)
        const endRT = Math.max(this.integrationStart, this.integrationEnd)

        const centerRT = (startRT + endRT) / 2
        const filtered = this.filteredTicData.filter(p => p.rt >= startRT && p.rt <= endRT);
        const maxTIC = Math.max(...filtered.map(p => p.tic));
        
        if (maxTIC !== null) {
          layout.annotations = [{
            x: centerRT,
            y: maxTIC * 1.1,
            xref: 'x',
            yref: 'y',
            text: `<b>Integrated Area: ${this.integrationValue.toExponential(2)}</b>`,
            showarrow: false,
            yanchor: 'bottom',
            xanchor: 'center',
            bgcolor: 'rgba(255, 255, 255, 0.9)',
            bordercolor: '#333',
            borderwidth: 1,
            borderpad: 4,
            font: {
              size: 12,
              color: '#000'
            }
          }]
        }
      }
      
      return layout
    }
  },
  watch: {
    ticData: {
      handler() {
        this.renderPlot()
      },
      deep: true
    },
    msLevelFilter() {
      this.renderPlot()
    },
    integrationMode() {
      this.renderPlot()
    },
    integrationStart() {
      this.renderPlot()
    },
    integrationEnd() {
      this.renderPlot()
    }
  },
  mounted() {
    this.renderPlot()
  },
  methods: {
    async renderPlot(): Promise<void> {
      try {
        const element = document.getElementById(this.plotId)
        if (!element) {
          console.warn(`TICChromatogram: DOM element '${this.plotId}' not found`)
          return
        }
        
        if (this.ticData.length === 0) {
          console.warn('TICChromatogram: No data available to plot')
          await this.renderEmptyPlot()
          return
        }
        
        // Build custom mode bar buttons
        const modeBarButtons: any[] = [
          {
            title: 'Show All Scans',
            name: 'filterAll',
            icon: {
              width: 960,
              height: 960,
              path: 'M280-280v-400h400v400H280Zm80-80h240v-240H360v240ZM200-200v80q-33 0-56.5-23.5T120-200h80Zm-80-80v-80h80v80h-80Zm0-160v-80h80v80h-80Zm0-160v-80h80v80h-80Zm80-160h-80q0-33 23.5-56.5T200-840v80Zm80 640v-80h80v80h-80Zm0-640v-80h80v80h-80Zm160 640v-80h80v80h-80Zm0-640v-80h80v80h-80Zm160 640v-80h80v80h-80Zm0-640v-80h80v80h-80Zm160 640v-80h80q0 33-23.5 56.5T760-120Zm0-160v-80h80v80h-80Zm0-160v-80h80v80h-80Zm0-160v-80h80v80h-80Zm0-160v-80q33 0 56.5 23.5T840-760h-80Z',
              transform: 'translate(0,960)'
            },
            click: () => {
              this.setMsLevelFilter('all')
            },
          },
          {
            title: 'Show MS1 Only',
            name: 'filterMS1',
            icon: {
              width: 960,
              height: 960,
              path: 'M480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Zm-20 200h80v-400H380v80h80v320Z',
              transform: 'translate(0,960)'
            },
            click: () => {
              this.setMsLevelFilter('ms1')
            },
          },
          {
            title: 'Show MS2 Only',
            name: 'filterMS2',
            icon: {
              width: 960,
              height: 960,
              path: 'M480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320ZM360-280h240v-80H440v-80h80q33 0 56.5-23.5T600-520v-80q0-33-23.5-56.5T520-680H360v80h160v80h-80q-33 0-56.5 23.5T360-440v160Z',
              transform: 'translate(0,960)'
            },
            click: () => {
              this.setMsLevelFilter('ms2')
            },
          },
                    {
            title: this.integrationMode ? 'Exit Integration Mode' : 'Integration Mode',
            name: 'integrationMode',
            icon: {
              width: 533.125,
              height: 980.9375,
              path: "M303.1 144.1 L302.3 134.8 L299.4 117.0 L295.1 100.2 L289.3 84.5 L282.0 69.8 L273.1 56.1 L262.8 43.4 L251.0 31.8 L244.5 26.4 L240.3 23.2 L231.1 17.4 L221.0 12.5 L210.0 8.4 L198.1 5.1 L185.3 2.6 L171.6 0.9 L157.0 0.1 L149.4 0.0 L139.8 0.1 L121.7 1.3 L104.9 3.7 L89.3 7.3 L75.0 12.1 L62.0 18.0 L50.3 25.2 L39.9 33.5 L35.2 38.1 L31.9 41.7 L25.9 49.8 L20.4 59.3 L15.4 70.0 L11.0 82.0 L7.2 95.3 L3.9 109.9 L1.2 125.8 L0.0 134.2 L108.4 145.0 L109.6 141.6 L112.4 135.5 L115.9 130.3 L120.0 126.0 L124.8 122.5 L130.1 119.9 L136.2 118.2 L142.8 117.3 L146.4 117.2 L150.3 117.4 L157.3 118.8 L163.5 121.6 L168.7 125.8 L173.1 131.4 L176.7 138.4 L179.3 146.8 L181.0 156.6 L181.6 162.0 L181.6 162.0 L230.0 836.9 L230.9 846.1 L233.7 863.9 L238.0 880.7 L243.8 896.4 L251.2 911.1 L260.0 924.8 L270.3 937.4 L282.1 949.1 L288.6 954.5 L292.8 957.7 L302.0 963.5 L312.1 968.5 L323.1 972.6 L335.0 975.9 L347.8 978.4 L361.5 980.0 L376.1 980.8 L383.8 980.9 L393.3 980.8 L411.4 979.6 L428.3 977.2 L443.8 973.6 L458.1 968.9 L471.1 962.9 L482.8 955.8 L493.2 947.4 L498.0 942.8 L501.2 939.2 L507.3 931.1 L512.7 921.7 L517.7 911.0 L522.1 898.9 L525.9 885.6 L529.2 871.0 L532.0 855.2 L533.1 846.7 L424.8 835.9 L423.7 839.3 L420.8 845.4 L417.3 850.6 L413.2 854.9 L408.4 858.4 L403.0 861.0 L397.0 862.8 L390.3 863.6 L386.7 863.8 L382.9 863.6 L375.8 862.2 L369.7 859.4 L364.4 855.2 L360.0 849.6 L356.5 842.6 L353.8 834.1 L352.1 824.3 L351.6 818.9 L351.6 818.9 L303.1 144.1 Z"
            },
            click: () => {
              this.toggleIntegrationMode()
            },
          },
          {
            title: 'Download as SVG',
            name: 'toImageSvg',
            icon: {
              width: 1000,
              height: 1000,
              path: 'm518 386q0 8-5 13t-13 5q-37 0-63-27t-26-63q0-8 5-13t13-5 12 5 5 13q0 23 16 38t38 16q8 0 13 5t5 13z m125-73q0-59-42-101t-101-42-101 42-42 101 42 101 101 42 101-42 42-101z m-572-320h858v71h-858v-71z m643 320q0 89-62 152t-152 62-151-62-63-152 63-151 151-63 152 63 62 151z m-571 358h214v72h-214v-72z m-72-107h858v143h-462l-36-71h-360v-72z m929 143v-714q0-30-21-51t-50-21h-858q-29 0-50 21t-21 51v714q0 30 21 51t50 21h858q29 0 50-21t21-51z',
              transform: 'matrix(1 0 0 -1 0 850)'            
            },
            click: () => {
              const el = document.getElementById(this.plotId)
              if (el) {
                Plotly.downloadImage(el, {
                  filename: 'TIC-chromatogram',
                  height: 600,
                  width: 1200,
                  format: 'svg',
                })
              }
            },
          }
        ]
        
        this.plotInstance = await Plotly.newPlot(
          this.plotId,
          this.data,
          this.layout,
          {
            modeBarButtonsToRemove: ['toImage', 'sendDataToCloud'],
            modeBarButtonsToAdd: modeBarButtons,
            scrollZoom: this.config.enableZoom,
            responsive: true
          }
        )
        
        // Add event listeners
        this.plotInstance.on('plotly_click', this.onPlotClick)
        this.plotInstance.on('plotly_relayout', this.onRelayout)
        this.plotInstance.on('plotly_selected', this.onSelected)
        
      } catch (error) {
        console.error('TICChromatogram: Failed to render plot:', error)
        await this.renderEmptyPlot()
      }
    },
    
    async renderEmptyPlot(): Promise<void> {
      try {
        const emptyData: Plotly.Data[] = [{
          x: [0, 1],
          y: [0, 0],
          mode: 'lines',
          type: 'scatter',
          line: { color: this.styling.lineColor }
        }]
        
        const emptyLayout: Partial<Plotly.Layout> = {
          ...this.layout,
          title: '<b>No TIC Data Available</b>',
          annotations: [{
            text: 'No data to display',
            xref: 'paper',
            yref: 'paper',
            x: 0.5,
            y: 0.5,
            showarrow: false,
            font: { size: 20, color: this.theme?.textColor }
          }]
        }
        
        await Plotly.newPlot(this.plotId, emptyData, emptyLayout, {
          modeBarButtonsToRemove: ['toImage', 'sendDataToCloud'],
          staticPlot: true
        })
      } catch (error) {
        console.error('TICChromatogram: Failed to render empty plot:', error)
      }
    },
    
    onPlotClick(eventData: any): void {
      try {
        if (eventData.points && eventData.points.length > 0) {
          const point = eventData.points[0]
          const pointIndex = point.pointIndex
          
          if (pointIndex !== undefined && pointIndex < this.filteredTicData.length) {
            this.selectedRowIndex = pointIndex
            // Re-render to show highlighted point
            this.renderPlot()
          }
        }
      } catch (error) {
        console.error('TICChromatogram: Error handling plot click:', error)
      }
    },
    
    onRelayout(eventData: any): void {
      try {
        // Track zoom changes to update datapoint visibility
        if (eventData['xaxis.range[0]'] !== undefined && eventData['xaxis.range[1]'] !== undefined) {
          this.currentXRange = [eventData['xaxis.range[0]'], eventData['xaxis.range[1]']]
          // Re-render to update datapoint visibility based on zoom
          this.renderPlot()
        } else if (eventData['xaxis.autorange']) {
          // Reset zoom
          this.currentXRange = undefined
          this.renderPlot()
        }
      } catch (error) {
        console.error('TICChromatogram: Error handling relayout:', error)
      }
    },
    
    setMsLevelFilter(filter: 'all' | 'ms1' | 'ms2'): void {
      this.msLevelFilter = filter
    },
    
    toggleIntegrationMode(): void {
      this.integrationMode = !this.integrationMode
      if (!this.integrationMode) {
        // Clear integration when exiting mode
        this.clearIntegration()
      }
      else {
        this.setMsLevelFilter('ms1')
      }
    },
    
    clearIntegration(): void {
      this.integrationStart = undefined
      this.integrationEnd = undefined
      this.integrationValue = undefined
      this.isSelecting = false
      this.renderPlot()
    },
    
    onSelected(eventData: any): void {
      try {
        if (!this.integrationMode || !eventData || !eventData.range) {
          return
        }
        
        const xRange = eventData.range.x
        if (xRange && xRange.length === 2) {
          this.integrationStart = xRange[0]
          this.integrationEnd = xRange[1]
          
          // Calculate integration
          this.calculateIntegration()
        }
      } catch (error) {
        console.error('TICChromatogram: Error handling selection:', error)
      }
    },
    
    calculateIntegration(): void {
      if (this.integrationStart === undefined || this.integrationEnd === undefined) {
        this.integrationValue = undefined
        return
      }
      
      const startRT = Math.min(this.integrationStart, this.integrationEnd)
      const endRT = Math.max(this.integrationStart, this.integrationEnd)
      
      // Filter data points within the selected range
      const pointsInRange = this.filteredTicData.filter(d => d.rt >= startRT && d.rt <= endRT)
      
      if (pointsInRange.length < 2) {
        this.integrationValue = 0
        return
      }
      
      // Sort by retention time (should already be sorted, but ensure it)
      pointsInRange.sort((a, b) => a.rt - b.rt)
      
      // Trapezoidal integration
      let area  = 0
      for (let i = 0; i < pointsInRange.length - 1; i++) {
        const x1 = pointsInRange[i].rt
        const y1 = pointsInRange[i].tic
        const x2 = pointsInRange[i + 1].rt
        const y2 = pointsInRange[i + 1].tic
        
        area += (y1 + y2) * (x2 - x1) / 2
      }
      
      this.integrationValue = area
    },
    
  }
})
</script>

<style scoped>
.tic-chromatogram-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 600px;
}

.tic-plot-section {
  flex: 1 1 auto;
  width: 100%;
  height: 100%;
  min-height: 600px;
}

.tic-plot-container {
  width: 100%;
  height: 100%;
  min-height: 600px;
}
</style>