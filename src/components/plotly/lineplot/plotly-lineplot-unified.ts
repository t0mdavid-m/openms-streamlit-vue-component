export type PlotlyLineArguments = {
  componentName: 'PlotlyLineplot' | 'PlotlyLineplotTagger' | 'PlotlyLineplotUnified'
  title: string
}

// Extended interface for unified component
export interface UnifiedPlotlyLineArguments extends PlotlyLineArguments {
   
  // Advanced Configuration
  config?: {
    xPosScalingFactor?: number
    xPosScalingThreshold?: number
    maxAnnotationRange?: number
    enableManualZoom?: boolean
    showChargeLabels?: boolean
    minAnnotationWidth?: number
  }
  
  // Styling Overrides
  styling?: {
    highlightColor?: string
    selectedColor?: string
    unhighlightedColor?: string
    annotationColors?: {
      massButton?: string
      selectedMassButton?: string
      sequenceArrow?: string
      selectedSequenceArrow?: string
      background?: string
      buttonHover?: string
    }
  }
}

// Data types from original components
export type PlotData = {
  unhighlighted_x: number[]
  unhighlighted_y: number[]
  highlighted_x: number[]
  highlighted_y: number[]
  selected_x: number[]
  selected_y: number[]
}

export type PlotAnnotations = {
  shapes: Partial<Plotly.Shape>[]
  annotations: Partial<Plotly.Annotations>[]
  traces: Plotly.Data[]
}

export type HighlightData = {
  mass: number
  mzs: number[]
  intensity: number[]
  charges: number[]
}

// Default configurations
export const DEFAULT_CONFIG = {
  xPosScalingFactor: 27.5,
  xPosScalingThreshold: 30,
  enableManualZoom: true,
  showChargeLabels: true,
  minAnnotationWidth: 2.0
}

export const DEFAULT_STYLING = {
  highlightColor: '#E4572E',
  selectedColor: '#F3A712',
  unhighlightedColor: 'lightblue',
  highlightHiddenColor: '1f77b4',
  annotationColors: {
    massButton: '#E4572E',
    selectedMassButton: '#F3A712',
    sequenceArrow: '#E4572E',
    selectedSequenceArrow: '#F3A712',
    background: '#f0f0f0',
    buttonHover: '#e0e0e0'
  }
}