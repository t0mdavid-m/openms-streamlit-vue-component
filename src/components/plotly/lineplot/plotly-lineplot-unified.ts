export type PlotlyLineArguments = {
  componentName: 'PlotlyLineplot' | 'PlotlyLineplotTagger' | 'PlotlyLineplotUnified'
  title: string
}

// Extended interface for unified component
export interface UnifiedPlotlyLineArguments extends PlotlyLineArguments {
  // Mode Configuration
  mode?: 'basic' | 'enhanced' | 'auto'
  
  // Feature Flags
  features?: {
    interactiveMode?: boolean
    massHighlighting?: boolean
    tagHighlighting?: boolean
    zoomControls?: boolean
    annotationSystem?: boolean
    massSelection?: boolean
    backButton?: boolean
    clickEvents?: boolean
    sequenceVisualization?: boolean
  }
  
  // Advanced Configuration
  config?: {
    xPosScalingFactor?: number
    xPosScalingThreshold?: number
    maxAnnotationRange?: number
    enableManualZoom?: boolean
    showChargeLabels?: boolean
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

// Feature matrix for mode-based rendering
export const FEATURE_MATRIX = {
  basic: new Set(['svgExport', 'massHighlighting']),
  enhanced: new Set([
    'svgExport', 'interactiveMode', 'massHighlighting',
    'tagHighlighting', 'zoomControls', 'annotationSystem',
    'massSelection', 'backButton', 'clickEvents', 'sequenceVisualization'
  ])
}

// Default configurations
export const DEFAULT_CONFIG = {
  xPosScalingFactor: 27.5,
  xPosScalingThreshold: 30,
  enableManualZoom: true,
  showChargeLabels: true
}

export const DEFAULT_STYLING = {
  highlightColor: '#E4572E',
  selectedColor: '#F3A712',
  unhighlightedColor: '#1f77b4',
  annotationColors: {
    massButton: '#E4572E',
    selectedMassButton: '#F3A712',
    sequenceArrow: '#E4572E',
    selectedSequenceArrow: '#F3A712',
    background: '#f0f0f0',
    buttonHover: '#e0e0e0'
  }
}