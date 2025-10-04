// TypeScript interfaces for TICChromatogram component

export interface TICChromatogramArguments {
  componentName: 'TICChromatogram'
  title: string
  
  // Display Options
  showTable?: boolean
  showPlot?: boolean
  
  // Plot Configuration
  config?: {
    enableZoom?: boolean
    showDataPoints?: boolean
    dataPointThreshold?: number  // Zoom level to show individual points
    smoothCurve?: boolean
  }
  
  // Styling Options
  styling?: {
    lineColor?: string
    dataPointColor?: string
    selectedPointColor?: string
    backgroundColor?: string
  }
}

export interface TICDataPoint {
  scan_idx: number
  rt: number
  level: number
  tic: number
}

export const DEFAULT_TIC_CONFIG = {
  enableZoom: true,
  showDataPoints: true,
  dataPointThreshold: 100,
  smoothCurve: true
}

export const DEFAULT_TIC_STYLING = {
  lineColor: '#1f77b4',
  dataPointColor: '#ff7f0e',
  selectedPointColor: '#d62728'
}