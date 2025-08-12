<template>
  <div :id="id" class="plot-container" :style="cssCustomProperties">
    <!-- Enhanced Mode UI Elements -->
    <button 
      v-if="isEnhancedMode && showBackButton" 
      class="simple-button" 
      @click="backButton"
    >
      ↩
    </button>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'
import Plotly from 'plotly.js-dist-min'
import type { Theme } from 'streamlit-component-lib'
import { useStreamlitDataStore } from '@/stores/streamlit-data'
import { useSelectionStore } from '@/stores/selection'
import type {
  UnifiedPlotlyLineArguments,
  PlotData,
  PlotAnnotations,
  HighlightData
} from './plotly-lineplot-unified'
import {
  DEFAULT_CONFIG,
  DEFAULT_STYLING,
  FEATURE_MATRIX
} from './plotly-lineplot-unified'

export default defineComponent({
  name: 'PlotlyLineplotUnified',
  props: {
    args: {
      type: Object as PropType<UnifiedPlotlyLineArguments>,
      required: true,
    },
    index: {
      type: Number,
      required: true,
    },
    // Legacy support
    legacyMode: {
      type: String as PropType<'basic' | 'enhanced'>,
      default: undefined
    }
  },
  emits: [
    'plot-rendered',
    'plot-error',
    'mass-selected',
    'mass-highlighted',
    'zoom-changed',
    'annotation-clicked',
    'back-button-clicked',
    'mode-changed',
    'feature-toggled'
  ],
  setup() {
    const streamlitDataStore = useStreamlitDataStore()
    const selectionStore = useSelectionStore()
    return { streamlitDataStore, selectionStore }
  },
  data() {
    return {
      // Enhanced mode state (from PlotlyLineplotTagger)
      manual: false as Boolean,
      manual_xRange: undefined as number[] | undefined,
      selectedMass: undefined as number | undefined,
      
      // Mode management
      currentMode: 'auto' as 'basic' | 'enhanced' | 'auto',
      enabledFeatures: new Set<string>(),
      
      // UI state
      isInitialized: false as Boolean,
      
      // Annotation toggle state
      annotationsVisible: true as Boolean,
      
      // Local state for title to avoid prop mutation
      localTitle: '' as string
    }
  },
  computed: {
    // === CORE PROPERTIES ===
    id(): string {
      return `graph-${this.index}`
    },
    
    theme(): Theme | undefined {
      return this.streamlitDataStore.theme
    },
    
    // === MODE MANAGEMENT ===
    resolvedMode(): 'basic' | 'enhanced' {
      if (this.currentMode !== 'auto') {
        return this.currentMode
      }
      
      // Auto-detect based on data availability
      if (this.legacyMode) {
        return this.legacyMode
      }
      
      // Intelligent detection based on available data
      const hasTagData = this.selectionStore.selectedTag !== undefined
      const hasComplexData = this.streamlitDataStore.allDataForDrawing.per_scan_data?.[0]?.SignalPeaks
      
      return (hasTagData || hasComplexData) ? 'enhanced' : 'basic'
    },
    
    isBasicMode(): boolean {
      return this.resolvedMode === 'basic'
    },
    
    isEnhancedMode(): boolean {
      return this.resolvedMode === 'enhanced'
    },
    
    // === FEATURE FLAGS ===
    mergedFeatures(): Record<string, boolean> {
      const defaultFeatures = Object.fromEntries(
        Array.from(FEATURE_MATRIX[this.resolvedMode]).map(f => [f, true])
      )
      
      return {
        ...defaultFeatures,
        ...this.args.features
      }
    },
    
    mergedConfig(): typeof DEFAULT_CONFIG {
      return {
        ...DEFAULT_CONFIG,
        ...this.args.config
      }
    },
    
    mergedStyling(): typeof DEFAULT_STYLING {
      return {
        ...DEFAULT_STYLING,
        ...this.args.styling,
        annotationColors: {
          ...DEFAULT_STYLING.annotationColors,
          ...this.args.styling?.annotationColors
        }
      }
    },
    
    // === DATA ACCESS PROPERTIES ===
    selectedScan(): number | undefined {
      try {
        if (!this.isEnhancedMode) return undefined
        
        if (this.selectionStore.selectedScanIndex === undefined) return undefined
        const scanData = this.streamlitDataStore.allDataForDrawing?.per_scan_data
        if (!scanData || scanData.length === 0) return undefined
        if (scanData.length === 1) return 0
        
        return this.selectionStore.selectedScanIndex
      } catch (error) {
        this.handleError(error as Error, 'selectedScan-computation')
        return undefined
      }
    },
    
    selectedRow(): number | undefined {
      try {
        if (!this.isBasicMode) return undefined
        
        if (this.selectionStore.selectedScanIndex === undefined) return undefined
        const scanData = this.streamlitDataStore.allDataForDrawing?.per_scan_data
        if (!scanData || scanData.length === 0) return undefined
        if (scanData.length === 1) return 0
        
        return this.selectionStore.selectedScanIndex
      } catch (error) {
        this.handleError(error as Error, 'selectedRow-computation')
        return undefined
      }
    },
    
    selectedTag(): number | undefined {
      return this.isEnhancedMode ? this.selectionStore.selectedTagIndex : undefined
    },
    
    selectedAA(): number | undefined {
      return this.isEnhancedMode ? this.selectionStore.selectedTag?.selectedAA : undefined
    },
    
    // === AXIS CONFIGURATION ===
    currentTitle(): string {
      return this.localTitle || this.args.title
    },
    
    xAxisLabel(): string {
      switch (this.currentTitle) {
        case 'Annotated Spectrum':
        case 'Augmented Annotated Spectrum':
          return 'm/z'
        case 'Deconvolved Spectrum':
        case 'Augmented Deconvolved Spectrum':
          return 'Monoisotopic Mass'
        default:
          return ''
      }
    },
    
    yAxisLabel(): string {
      return 'Intensity'
    },
    
    xColumn(): string {
      switch (this.currentTitle) {
        case 'Annotated Spectrum':
        case 'Augmented Annotated Spectrum':
          return 'MonoMass_Anno'
        case 'Deconvolved Spectrum':
        case 'Augmented Deconvolved Spectrum':
          return 'MonoMass'
        default:
          return ''
      }
    },
    
    yColumn(): string {
      switch (this.currentTitle) {
        case 'Annotated Spectrum':
        case 'Augmented Annotated Spectrum':
          return 'SumIntensity_Anno'
        case 'Deconvolved Spectrum':
        case 'Augmented Deconvolved Spectrum':
          return 'SumIntensity'
        default:
          return ''
      }
    },
    
    // === DATA PROCESSING ===
    xValues(): number[] {
      try {
        const xValues: number[] = []
        const dataRow = this.isBasicMode ? this.selectedRow : this.selectedScan
        
        if (dataRow === undefined) return xValues
        
        const scanData = this.streamlitDataStore.allDataForDrawing?.per_scan_data
        if (!scanData || dataRow >= scanData.length) return xValues
        
        const data = scanData[dataRow]
        if (!data) return xValues
        
        const columnData = data[this.xColumn] as number[]
        if (!columnData || !Array.isArray(columnData)) return xValues
        
        columnData.forEach((num) => {
          if (typeof num === 'number' && !isNaN(num)) {
            xValues.push(num, num, num)
          }
        })
        
        return xValues
      } catch (error) {
        this.handleError(error as Error, 'xValues-computation')
        return []
      }
    },
    
    yValues(): number[] {
      try {
        const yValues: number[] = []
        const dataRow = this.isBasicMode ? this.selectedRow : this.selectedScan
        
        if (dataRow === undefined) return yValues
        
        const scanData = this.streamlitDataStore.allDataForDrawing?.per_scan_data
        if (!scanData || dataRow >= scanData.length) return yValues
        
        const data = scanData[dataRow]
        if (!data) return yValues
        
        const columnData = data[this.yColumn] as number[]
        if (!columnData || !Array.isArray(columnData)) return yValues
        
        columnData.forEach((num) => {
          if (typeof num === 'number' && !isNaN(num)) {
            yValues.push(-10000000, num, -10000000)
          }
        })
        
        return yValues
      } catch (error) {
        this.handleError(error as Error, 'yValues-computation')
        return []
      }
    },
    
    // === ENHANCED MODE SPECIFIC PROPERTIES ===
    xMassValues(): number[] {
      try {
        if (!this.isEnhancedMode || this.selectedScan === undefined) return []
        
        const scanData = this.streamlitDataStore.allDataForDrawing?.per_scan_data
        if (!scanData || this.selectedScan >= scanData.length) return []
        
        const data = scanData[this.selectedScan]
        const massData = data?.['MonoMass'] as number[]
        
        return Array.isArray(massData) ? massData : []
      } catch (error) {
        this.handleError(error as Error, 'xMassValues-computation')
        return []
      }
    },
    
    mzSignals(): number[][][] {
      try {
        if (!this.isEnhancedMode || this.selectedScan === undefined) return []
        
        const scanData = this.streamlitDataStore.allDataForDrawing?.per_scan_data
        if (!scanData || this.selectedScan >= scanData.length) return []
        
        const data = scanData[this.selectedScan]
        const signalData = data?.['SignalPeaks'] as number[][][]
        
        return Array.isArray(signalData) ? signalData : []
      } catch (error) {
        this.handleError(error as Error, 'mzSignals-computation')
        return []
      }
    },
    
    minCharge(): number {
      try {
        if (!this.isEnhancedMode || this.selectedScan === undefined) return -10
        
        const scanData = this.streamlitDataStore.allDataForDrawing?.per_scan_data
        if (!scanData || this.selectedScan >= scanData.length) return -10
        
        const data = scanData[this.selectedScan]
        const chargeData = data?.['MinCharges'] as number[]
        
        if (!Array.isArray(chargeData) || chargeData.length === 0) return -10
        
        return Math.min(...chargeData)
      } catch (error) {
        this.handleError(error as Error, 'minCharge-computation')
        return -10
      }
    },
    
    maxCharge(): number {
      try {
        if (!this.isEnhancedMode || this.selectedScan === undefined) return -10
        
        const scanData = this.streamlitDataStore.allDataForDrawing?.per_scan_data
        if (!scanData || this.selectedScan >= scanData.length) return -10
        
        const data = scanData[this.selectedScan]
        const chargeData = data?.['MinCharges'] as number[]
        
        if (!Array.isArray(chargeData) || chargeData.length === 0) return -10
        
        return Math.max(...chargeData)
      } catch (error) {
        this.handleError(error as Error, 'maxCharge-computation')
        return -10
      }
    },
    
    showBackButton(): boolean {
      return this.isEnhancedMode &&
             this.mergedFeatures.backButton &&
             (this.currentTitle === 'Augmented Annotated Spectrum')
    },
    
    // Mass index highlighting - only for "Deconvolved Spectrum"
    shouldHighlightMassIndex(): boolean {
      console.log(this.mergedFeatures)
      return this.currentTitle === 'Deconvolved Spectrum' &&
             this.selectionStore.selectedMassIndex !== undefined
    },
    
    // === HIGHLIGHTING SYSTEM ===
    highlightedMassPos(): number[] {
      try {
        if (!this.isEnhancedMode || !this.mergedFeatures.massHighlighting) return []
        
        const values = this.selectionStore.selectedTag?.masses
        if (!values || !Array.isArray(values)) return []
        
        const massValues = this.xMassValues
        if (massValues.length === 0) return []
        
        let positions: number[] = []
        
        for (let i = 0; i < values.length; i++) {
          for (let j = 0; j < massValues.length; j++) {
            if (Math.abs(values[i] - massValues[j]) <= 1e-5) {
              positions.push(j)
              break
            }
          }
        }
        
        return positions.length === values.length ? positions : []
      } catch (error) {
        this.handleError(error as Error, 'highlightedMassPos-computation')
        return []
      }
    },
    
    highlightedValues(): HighlightData[] {
      try {
        if (!this.isEnhancedMode || !this.mergedFeatures.massHighlighting) return []
        
        const positions = this.highlightedMassPos
        const massValues = this.xMassValues
        const signals = this.mzSignals
        
        if (positions.length === 0 || massValues.length === 0) return []
        
        let highlightValues: HighlightData[] = []
        
        for (let i = 0; i < positions.length; i++) {
          const posIndex = positions[i]
          if (posIndex >= massValues.length || posIndex >= signals.length) continue
          
          const mass = massValues[posIndex]
          let mzs: number[] = []
          let charges: number[] = []
          let intensity: number[] = []
          
          const signalGroup = signals[posIndex]
          if (Array.isArray(signalGroup)) {
            for (let j = 0; j < signalGroup.length; j++) {
              const signal = signalGroup[j]
              if (Array.isArray(signal) && signal.length >= 4) {
                mzs.push(signal[1])
                intensity.push(signal[2])
                charges.push(signal[3])
              }
            }
          }
          
          highlightValues.push({
            mass: mass,
            mzs: mzs,
            charges: charges,
            intensity: intensity
          })
        }
        
        return highlightValues
      } catch (error) {
        this.handleError(error as Error, 'highlightedValues-computation')
        return []
      }
    },
    
    plotData(): PlotData {
      // if (!this.isEnhancedMode) {
      //   return {
      //     unhighlighted_x: this.xValues,
      //     unhighlighted_y: this.yValues,
      //     highlighted_x: [],
      //     highlighted_y: [],
      //     selected_x: [],
      //     selected_y: []
      //   }
      // }
      
      let unhighlighted_x: number[] = []
      let unhighlighted_y: number[] = []
      let highlighted_x: number[] = []
      let highlighted_y: number[] = []
      let selected_x: number[] = []
      let selected_y: number[] = []
      console.log('123')
      for (let i = 0; i < this.xValues.length; i++) {
        const x_val = this.xValues[i]
        const y_val = this.yValues[i]
        const posHighlight = this.highlightedPos(x_val)
        
        // Check for mass index highlighting (only for "Deconvolved Spectrum")
        let isMassIndexSelected = false
        console.log('here456')
        console.log(this.shouldHighlightMassIndex)
        if (this.shouldHighlightMassIndex) {
          // Each mass creates 3 points in xValues/yValues, so divide by 3 to get mass index
          const massIndex = Math.floor(i / 3)
          console.log(massIndex)
          console.log(this.selectionStore.selectedMassIndex)

          isMassIndexSelected = (massIndex === this.selectionStore.selectedMassIndex)
        }
        
        if (isMassIndexSelected) {
          highlighted_x.push(x_val)
          highlighted_y.push(y_val)
        }
        else if (
          (posHighlight !== undefined) &&
          ((this.selectionStore.selectedTag?.selectedAA == posHighlight) ||
          (this.selectionStore.selectedTag?.selectedAA == posHighlight-1))
        ){
          selected_x.push(x_val)
          selected_y.push(y_val)
        }
        else if (posHighlight !== undefined) {
          highlighted_x.push(x_val)
          highlighted_y.push(y_val)
        }
        else {
          unhighlighted_x.push(x_val)
          unhighlighted_y.push(y_val)
        }
      }
      console.log(selected_x)
      return {
        unhighlighted_x,
        unhighlighted_y,
        selected_x,
        selected_y,
        highlighted_x,
        highlighted_y,
      }
    },
    
    // === SCALING AND POSITIONING ===
    xPosScalingFactor(): number {
      return this.mergedConfig.xPosScalingFactor
    },
    
    xPosScalingThreshold(): number {
      return this.mergedConfig.xPosScalingThreshold
    },
    
    maxAnnotationRange(): number {
      return this.xPosScalingFactor * this.xPosScalingThreshold
    },
    
    // === RANGE MANAGEMENT ===
    xRange(): number[] {
      try {
        const xValues = this.xValues
        if (xValues.length === 0) return [0, 1]
        
        if (this.isBasicMode) {
          const minX = Math.min(...xValues)
          const maxX = Math.max(...xValues)
          return [minX * 0.98, maxX * 1.02]
        }
        
        // Enhanced mode range logic
        if (this.manual && this.manual_xRange !== undefined) {
          return this.manual_xRange
        }
        
        const highlighted = this.highlightedValues
        if (highlighted.length === 0) {
          const minX = Math.min(...xValues)
          const maxX = Math.max(...xValues)
          return [minX * 0.98, maxX * 1.02]
        }
        
        if ((this.currentTitle === "Augmented Annotated Spectrum") &&
            (this.selectedMass !== undefined) &&
            (this.selectedMass < highlighted.length)) {
          const selectedData = highlighted[this.selectedMass]
          if (selectedData.mzs.length > 0) {
            return [Math.min(...selectedData.mzs) * 0.98, Math.max(...selectedData.mzs) * 1.02]
          }
        }
        
        const masses = highlighted.map(a => a.mass).filter(m => !isNaN(m))
        if (masses.length === 0) return [0, 1]
        
        let xmin_full = Math.min(...masses) * 0.98
        let xmax_full = Math.max(...masses) * 1.02
        
        if ((xmax_full - xmin_full) < this.maxAnnotationRange) {
          return [xmin_full, xmax_full]
        }
        
        // Center of all highlighted masses
        let xcenter = masses.reduce((sum, mass) => sum + mass, 0) / masses.length
        let offset = 0.5 * 0.9 * this.maxAnnotationRange
        return [xcenter - offset, xcenter + offset]
      } catch (error) {
        this.handleError(error as Error, 'xRange-computation')
        return [0, 1]
      }
    },
    
    yRange(): number[] {
      try {
        return this.computeYRange(this.xRange)
      } catch (error) {
        this.handleError(error as Error, 'yRange-computation')
        return [0, 1]
      }
    },
    
    // === ANNOTATION SYSTEM ===
    annotationData(): PlotAnnotations {
      try {
        if (!this.isEnhancedMode || !this.mergedFeatures.annotationSystem || !this.annotationsVisible) {
          return { shapes: [], annotations: [], traces: [] }
        }
        
        // Performance optimization: Early return if no data
        const highlighted = this.highlightedValues
        if (highlighted.length === 0) {
          return { shapes: [], annotations: [], traces: [] }
        }
        
        let buttonTraces: Plotly.Data[] = []
        let buttonShapes: Partial<Plotly.Shape>[] = []
        let buttonAnnotations: Partial<Plotly.Annotations>[] = []
        
        const yRange = this.yRange
        if (yRange.length < 2 || yRange[1] <= 0) {
          return { shapes: [], annotations: [], traces: [] }
        }
        
        const ymax = yRange[1] / 1.8
        const ypos_low = ymax * 1.18
        const ypos = ymax * 1.25
        const ypos_high = ymax * 1.32
        const xRange = this.xRange
        const xpos_scaling = (xRange[1] - xRange[0]) / this.xPosScalingFactor

      // AUGMENTED ANNOTATED SPECTRUM MODE - Charge Labels Logic
      if (this.currentTitle === 'Augmented Annotated Spectrum') {
        type MzIntensity = {
          mz: number;
          intensity: number;
        }

        if (this.selectedMass === undefined) {
          return {
            shapes: [],
            annotations: [],
            traces: [],
          }
        }

        // Performance optimization: Validate selected mass index
        if (this.selectedMass >= highlighted.length) {
          return {
            shapes: [],
            annotations: [],
            traces: [],
          }
        }

        let fillcolor = this.mergedStyling.annotationColors.massButton
        const selectedAA = this.selectionStore.selectedTag?.selectedAA
        if (
          (selectedAA === this.selectedMass) ||
          (selectedAA === this.selectedMass - 1)) {
            fillcolor = this.mergedStyling.annotationColors.selectedMassButton
        }

        const selectedData = highlighted[this.selectedMass]
        const { mzs, charges, intensity: intensities } = selectedData
        
        // Performance optimization: Early return if no mz data
        if (!mzs || mzs.length === 0) {
          return { shapes: [], annotations: [], traces: [] }
        }
        
        const grouped = new Map<number, MzIntensity[]>()

        // Group by charge state - optimized loop
        for (let i = 0; i < mzs.length; i++) {
            const mz = mzs[i]
            const charge = charges[i]
            const intensity = intensities[i]

            if (!isFinite(mz) || !isFinite(charge) || !isFinite(intensity)) continue

            const mzIntensity: MzIntensity = { mz, intensity }
            if (grouped.has(charge)) {
                grouped.get(charge)!.push(mzIntensity)
            } else {
                grouped.set(charge, [mzIntensity])
            }
        }

        // Create charge label annotations
        grouped.forEach((mzIntensity, charge) => {
          const summedIntensity = mzIntensity.reduce((sum, val) => sum + val.intensity, 0)
          const centerOfGravity = mzIntensity.map(val => (val.intensity / summedIntensity)*val.mz)
          const mass = centerOfGravity.reduce((sum, val) => sum + val, 0)
          
          buttonShapes.push({
            type: 'rect',
            x0: mass-0.5*(xpos_scaling),
            y0: ypos_low,
            x1: mass+0.5*(xpos_scaling),
            y1: ypos_high,
            fillcolor: fillcolor,
            line: {
              width: 0
            }
          })
            
          buttonAnnotations.push({
            x: mass,
            y: ypos,
            xref: 'x',
            yref: 'y',
            text: "z="+charge,
            showarrow: false,
            font: {
              size: 15
            }
          })
        })

        return {
            shapes: buttonShapes,
            annotations: buttonAnnotations,
            traces: buttonTraces,
        }
      }

        // AUGMENTED DECONVOLVED SPECTRUM MODE - Mass Buttons + Sequence Arrows
        let arrowAnnotations: Partial<Plotly.Annotations>[] = []
        
        // Performance optimization: Check scaling threshold for annotation display
        if (xpos_scaling > this.xPosScalingThreshold) {
          return {
            shapes: buttonShapes,
            annotations: buttonAnnotations,
            traces: buttonTraces,
          }
        }

        const selectedAA = this.selectionStore.selectedTag?.selectedAA
        
        // Create mass button annotations - optimized loop
        for (let i = 0; i < highlighted.length; i++) {
          const highlightedData = highlighted[i]
          const mass = highlightedData.mass
          
          // Performance optimization: Skip invalid mass values
          if (!isFinite(mass)) continue

          let fillcolor = this.mergedStyling.annotationColors.massButton
          let family = 'sans-serif'
          
          if ((selectedAA === i) || (selectedAA === i - 1)) {
              fillcolor = this.mergedStyling.annotationColors.selectedMassButton
              family = 'Arial Black, Arial Bold, Arial, sans-serif'
          }

          // Create invisible hover trace for mass buttons
          buttonTraces.push({
            x: [mass],
            y: [ypos],
            mode: 'markers',
            marker: {
              size: 20,
              opacity: 0,
            },
            hoverinfo: 'text',
            hovertext: String(mass.toFixed(2)),
            type: 'scatter'
          })

          // Create mass button shape
          buttonShapes.push({
            type: 'rect',
            x0: mass - xpos_scaling,
            y0: ypos_low,
            x1: mass + xpos_scaling,
            y1: ypos_high,
            fillcolor: fillcolor,
            line: {
              width: 0
            }
          })
            
          // Create mass button label
          buttonAnnotations.push({
            x: mass,
            y: ypos,
            xref: 'x',
            yref: 'y',
            text: mass.toFixed(2),
            showarrow: false,
            font: {
              size: 15,
              family: family
            }
          })
        }

        // Create sequence arrows between mass buttons - optimized
        const yPosArrow = ypos * 0.5
        const yPosAA = ypos * 0.6
        const sequence = this.selectionStore.selectedTag?.sequence

        for (let i = 0; i < highlighted.length - 1; i++) {
          const currentData = highlighted[i]
          const nextData = highlighted[i + 1]
          
          // Performance optimization: Skip if either mass is invalid
          if (!isFinite(currentData.mass) || !isFinite(nextData.mass)) continue

          let fillcolor = this.mergedStyling.annotationColors.sequenceArrow
          let family = 'sans-serif'
          
          if (selectedAA === i) {
              fillcolor = this.mergedStyling.annotationColors.selectedSequenceArrow
              family = 'Arial Black, Arial Bold, Arial, sans-serif'
          }

          let xStart = currentData.mass
          let xEnd = nextData.mass
          const xMid = (xStart + xEnd) / 2
          let xMidStart = xMid
          let xMidEnd = xMid
          const diff = Math.abs(xStart - xEnd) * 0.9
          let AA = ""
          let delta = 0

          // Get amino acid from sequence
          if (sequence !== undefined && sequence.length > 0) {
            const reverseIndex = sequence.length - 1 - i
            if (reverseIndex >= 0 && reverseIndex < sequence.length) {
              AA = sequence[reverseIndex]
            }
          }

          // Calculate arrow positioning
          if (xStart > xEnd) {
            delta = xStart - xEnd
            xStart -= diff
            xMidStart += diff * 0.1
            xEnd += diff
            xMidEnd -= diff * 0.1
          } else {
            delta = xEnd - xStart
            xStart += diff
            xMidStart -= diff * 0.1
            xEnd -= diff
            xMidEnd += diff * 0.1
          }

          // Create sequence arrow (start part)
          arrowAnnotations.push({
            ax: xMidStart,
            ay: yPosArrow,
            xref: 'x',
            yref: 'y',
            x: xStart,
            y: yPosArrow,
            axref: 'x',
            ayref: 'y',
            showarrow: true,
            arrowhead: 0,
            arrowsize: 1,
            arrowwidth: 2,
            arrowcolor: fillcolor
          })
          
          // Create sequence arrow (end part)
          arrowAnnotations.push({
            ax: xMidEnd,
            ay: yPosArrow,
            xref: 'x',
            yref: 'y',
            x: xEnd,
            y: yPosArrow,
            axref: 'x',
            ayref: 'y',
            showarrow: true,
            arrowhead: 2,
            arrowsize: 1,
            arrowwidth: 2,
            arrowcolor: fillcolor
          })

          // Create amino acid label
          arrowAnnotations.push({
            x: xMid,
            y: yPosAA,
            xref: 'x',
            yref: 'y',
            text: AA,
            hovertext: 'Δ=' + delta.toFixed(2) + ' Da',
            showarrow: false,
            font: {
              size: 15,
              color: fillcolor,
              family: family
            }
          })
        }

        return {
          shapes: buttonShapes,
          annotations: [...buttonAnnotations, ...arrowAnnotations],
          traces: buttonTraces,
        }
      } catch (error) {
        this.handleError(error as Error, 'annotationData-computation')
        return { shapes: [], annotations: [], traces: [] }
      }
    },
    
    // === PLOTLY CONFIGURATION ===
    data(): Plotly.Data[] {
      // if (this.isBasicMode) {
      //   return [
      //     {
      //       x: this.xValues,
      //       y: this.yValues,
      //       mode: 'lines',
      //       type: 'scatter',
      //       connectgaps: false,
      //       marker: { color: this.mergedStyling.unhighlightedColor }
      //     },
      //   ]
      // }
      console.log('what??')
      // Enhanced mode traces
      let traces: Plotly.Data[] = []
      
      // When annotations are hidden, force all peaks to use default color
      if (!this.annotationsVisible) {
        traces.push({
          x: this.xValues,
          y: this.yValues,
          mode: 'lines',
          type: 'scatter',
          connectgaps: false,
          marker: { color: this.mergedStyling.unhighlightedColor }
        })
        return traces
      }
      
      // When annotations are visible, use normal highlighting logic
      traces.push({
        x: this.plotData.unhighlighted_x,
        y: this.plotData.unhighlighted_y,
        mode: 'lines',
        type: 'scatter',
        marker: { color: this.mergedStyling.unhighlightedColor }
      })
      
      if (this.mergedFeatures.massHighlighting) {
        console.log('wowowowo')
        traces.push({
          x: this.plotData.highlighted_x,
          y: this.plotData.highlighted_y,
          mode: 'lines',
          type: 'scatter',
          marker: { color: this.mergedStyling.highlightColor }
        })
        
        traces.push({
          x: this.plotData.selected_x,
          y: this.plotData.selected_y,
          mode: 'lines',
          type: 'scatter',
          marker: { color: this.mergedStyling.selectedColor }
        })
      }
      
      if (this.currentTitle === "Augmented Deconvolved Spectrum") {
        const buttonTraces = this.annotationData.traces
        traces.push(...buttonTraces)
      }
      
      return traces
    },
    
    layout(): Partial<Plotly.Layout> {
      const baseLayout: Partial<Plotly.Layout> = {
        title: `<b>${this.currentTitle}</b>`,
        showlegend: false,
        height: 400,
        xaxis: {
          title: this.xAxisLabel,
          showgrid: false,
          showline: true,
          linecolor: 'grey',
          linewidth: 1,
        },
        yaxis: {
          title: this.yAxisLabel,
          showgrid: true,
          gridcolor: this.theme?.secondaryBackgroundColor,
          rangemode: 'nonnegative',
          fixedrange: !this.mergedFeatures.zoomControls,
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
      }
      
      // Enhanced mode additions
      if (this.isEnhancedMode) {
        baseLayout.xaxis!.range = this.xRange
        baseLayout.yaxis!.range = this.yRange
        
        if (this.mergedFeatures.annotationSystem) {
          baseLayout.shapes = this.annotationData.shapes
          baseLayout.annotations = this.annotationData.annotations
        }
      }
      
      return baseLayout
    },
    
    // === STYLING ===
    cssCustomProperties(): Record<string, string> {
      return {
        '--highlight-color': this.mergedStyling.highlightColor,
        '--selected-color': this.mergedStyling.selectedColor,
        '--unhighlighted-color': this.mergedStyling.unhighlightedColor,
        '--annotation-background': this.mergedStyling.annotationColors.background,
        '--button-hover-color': this.mergedStyling.annotationColors.buttonHover,
      }
    }
  },
  
  watch: {
    // === MODE MANAGEMENT ===
    'args.mode': {
      handler(newMode: string) {
        if (newMode && newMode !== this.currentMode) {
          const oldMode = this.currentMode
          this.currentMode = newMode as 'basic' | 'enhanced' | 'auto'
          this.$emit('mode-changed', { from: oldMode, to: newMode, features: Array.from(this.enabledFeatures) })
          this.safeGraph()
        }
      },
      immediate: true
    },
    
    'args.features': {
      handler() {
        this.safeGraph()
      },
      deep: true
    },
    
    // === DATA REACTIVITY ===
    selectedScan() {
      if (this.isEnhancedMode) {
        this.resetManualState()
        this.safeGraph()
      }
    },
    
    selectedRow() {
      if (this.isBasicMode) {
        this.safeGraph()
      }
    },
    
    xValues() {
      if (this.isBasicMode) {
        this.safeGraph()
      }
    },
    
    selectedTag() {
      if (this.isEnhancedMode) {
        this.resetManualState()
        this.safeGraph()
      }
    },
    
    // === ENHANCED MODE SPECIFIC ===
    annotationData() {
      if (this.isEnhancedMode && this.manual && this.mergedFeatures.annotationSystem) {
        this.updateButtons(this.annotationData.shapes, this.annotationData.annotations)
      }
    },
    
    // === ANNOTATION VISIBILITY REACTIVITY ===
    annotationsVisible() {
      if (this.isEnhancedMode) {
        this.safeGraph()
      }
    },
    
    // === MASS INDEX REACTIVITY ===
    'selectionStore.selectedMassIndex'() {
      if (this.shouldHighlightMassIndex) {
        this.safeGraph()
      }
    }
  },
  
  mounted() {
    this.initializeComponent()
  },
  
  methods: {
    // === CORE RENDERING ===
    async graph(): Promise<void> {
      try {
        const plotInstance = await Plotly.newPlot(this.id, this.data, this.layout, {
          modeBarButtonsToRemove: ['toImage', 'sendDataToCloud'],
          modeBarButtonsToAdd: [
            {
              title: 'Download as SVG',
              name: 'toImageSvg',
              icon: Plotly.Icons.camera,
              click: (plotlyElement) => {
                Plotly.downloadImage(plotlyElement, {
                  filename: 'FLASHViewer-lineplot',
                  height: 400,
                  width: 1200,
                  format: 'svg',
                })
              },
            },
            {
              title: this.annotationsVisible ? 'Hide Annotations' : 'Show Annotations',
              name: 'toggleAnnotations',
              icon: {
                width: 1792,
                height: 1792,
                path: this.annotationsVisible
                  ? 'M1664 960q-152-236-381-353 61 104 61 225 0 185-131.5 316.5t-316.5 131.5-316.5-131.5-131.5-316.5q0-121 61-225-229 117-381 353 133 205 333.5 326.5t434.5 121.5 434.5-121.5 333.5-326.5zm-720-384q0-20-14-34t-34-14q-125 0-214.5 89.5t-89.5 214.5q0 20 14 34t34 14 34-14 14-34q0-86 61-147t147-61q20 0 34-14t14-34zm848 384q0 34-20 69-140 230-376.5 368.5t-499.5 138.5-499.5-139-376.5-368q-20-35-20-69t20-69q140-229 376.5-368t499.5-139 499.5 139 376.5 368q20 35 20 69z'
                  : 'M555 1179l78-141q87 63 136 63 25 0 40.5-15.5t15.5-39.5q0-46-49-86-49-40-124-40-93 0-124 47-7 11-24 11-17 0-28.5-10.5t-11.5-26.5q0-25 30-56 104-108 266-108 99 0 171.5 67.5t72.5 164.5q0 95-78 164-22 19-45.5 29t-59.5 10q-70 0-141-59zM1664 960q-152-236-381-353 61 104 61 225 0 185-131.5 316.5t-316.5 131.5-316.5-131.5-131.5-316.5q0-121 61-225-229 117-381 353 133 205 333.5 326.5t434.5 121.5 434.5-121.5 333.5-326.5zm-720-384q0-20-14-34t-34-14q-125 0-214.5 89.5t-89.5 214.5q0 20 14 34t34 14 34-14 14-34q0-86 61-147t147-61q20 0 34-14t14-34zm848 384q0 34-20 69-140 230-376.5 368.5t-499.5 138.5-499.5-139-376.5-368q-20-35-20-69t20-69q140-229 376.5-368t499.5-139 499.5 139 376.5 368q20 35 20 69z'
              },
              click: () => {
                this.toggleAnnotations()
              },
            },
          ],
          scrollZoom: this.mergedFeatures.zoomControls
        })
        
        // Enhanced mode event listeners
        if (this.isEnhancedMode) {
          if (this.mergedFeatures.zoomControls) {
            plotInstance.on('plotly_relayout', (eventData) => {
              this.onRelayout(eventData)
            })
          }
          
          if (this.mergedFeatures.clickEvents) {
            plotInstance.on('plotly_click', (eventData) => {
              this.onPlotClick(eventData)
            })
          }
        }
        
        this.$emit('plot-rendered', { 
          timestamp: Date.now(), 
          mode: this.resolvedMode,
          features: Array.from(this.enabledFeatures)
        })
        
      } catch (error) {
        this.handleError(error as Error, 'graph-rendering')
      }
    },
    
    // === MODE MANAGEMENT ===
    initializeComponent(): void {
      try {
        // Set initial mode based on props or auto-detection
        if (this.args.mode) {
          this.currentMode = this.args.mode
        } else if (this.legacyMode) {
          this.currentMode = this.legacyMode
        } else {
          this.currentMode = 'auto'
        }
        
        // Initialize enabled features
        this.enabledFeatures = new Set(Object.keys(this.mergedFeatures).filter(key => this.mergedFeatures[key]))
        
        this.isInitialized = true
        
        // Initialize local title
        this.localTitle = this.args.title
        
        // Use safe rendering
        this.safeGraph()
      } catch (error) {
        this.handleError(error as Error, 'initializeComponent')
        this.renderFallback()
      }
    },
    
    resetManualState(): void {
      try {
        this.manual = false
        this.localTitle = 'Augmented Deconvolved Spectrum'
        this.selectedMass = undefined
      } catch (error) {
        this.handleError(error as Error, 'resetManualState')
      }
    },
    
    // === ENHANCED MODE INTERACTIONS ===
    backButton(): void {
      if (!this.isEnhancedMode || !this.mergedFeatures.backButton) return
      
      this.localTitle = 'Augmented Deconvolved Spectrum'
      this.selectedMass = undefined
      this.manual = false
      this.$emit('back-button-clicked', {
        previousMode: this.localTitle,
        timestamp: Date.now()
      })
      this.safeGraph()
    },
    
    toggleAnnotations(): void {
      this.annotationsVisible = !this.annotationsVisible
      this.$emit('feature-toggled', {
        feature: 'annotations',
        enabled: this.annotationsVisible,
        timestamp: Date.now()
      })
      this.safeGraph()
    },
    
    onPlotClick(eventData: any): void {
      if (!this.isEnhancedMode || !this.mergedFeatures.clickEvents) return
      
      if (eventData.points && eventData.points.length > 0) {
        const x = eventData.points[0].x
        
        for (let i = 0; i < this.highlightedValues.length; i++) {
          if (x === this.highlightedValues[i].mass) {
            this.updateButtons([], [])
            this.selectedMass = i
            this.localTitle = 'Augmented Annotated Spectrum'
            this.manual = false
            this.$emit('mass-selected', {
              mass: x,
              index: i,
              metadata: this.highlightedValues[i]
            })
            this.safeGraph()
            break
          }
        }
      }
    },
    
    async onRelayout(eventData: any): Promise<void> {
      if (!this.isEnhancedMode || !this.mergedFeatures.zoomControls) return
      
      if (eventData['xaxis.range[0]'] !== undefined && eventData['xaxis.range[1]'] !== undefined) {
        const newXRange = [eventData['xaxis.range[0]'], eventData['xaxis.range[1]']]
        if (newXRange[0] < 0) {
          newXRange[0] = 0
        }
        this.manual = true
        this.manual_xRange = newXRange
        
        try {
          const newYRange = this.computeYRange(newXRange)
          await Plotly.relayout(this.id, {'yaxis.range': [newYRange[0], newYRange[1]]})
          await Plotly.relayout(this.id, {'xaxis.range': [newXRange[0], newXRange[1]]})
          
          this.$emit('zoom-changed', {
            xRange: newXRange,
            yRange: newYRange,
            manual: this.manual
          })
        } catch (error) {
          this.handleError(error as Error, 'onRelayout-plotly-update')
        }
      }
      else if (eventData['xaxis.autorange'] === true) {
        this.onAutosize()
      }
    },
    
    async onAutosize(): Promise<void> {
      try {
        const xValues = this.xValues
        if (xValues.length === 0) return
        
        const newXRange = [Math.min(...xValues), Math.max(...xValues)]
        this.manual = true
        this.manual_xRange = newXRange
        const newYRange = this.computeYRange(newXRange)
        
        await Plotly.relayout(this.id, {'yaxis.range': [newYRange[0], newYRange[1]]})
      } catch (error) {
        this.handleError(error as Error, 'onAutosize')
      }
    },
    
    async updateButtons(shapes: Partial<Plotly.Shape>[], annotations: Partial<Plotly.Annotations>[]): Promise<void> {
      try {
        if (!this.isEnhancedMode) return
        
        await Plotly.relayout(this.id, {
          shapes: shapes || [],
          annotations: annotations || []
        })
      } catch (error) {
        this.handleError(error as Error, 'updateButtons')
      }
    },
    
    // === DATA PROCESSING ===
    computeYRange(xRange: number[]): number[] {
      try {
        const yValues = this.yValues
        const xValues = this.xValues
        
        if (yValues.length === 0 || xValues.length === 0) return [0, 1]
        if (xRange.length !== 2 || xRange[0] >= xRange[1]) return [0, 1]
        
        let max: number = 0
        for (let i = 0; i < Math.min(xValues.length, yValues.length); i++) {
          const xval = xValues[i]
          const yval = yValues[i]
          
          if (!isFinite(xval) || !isFinite(yval)) continue
          if ((xval <= xRange[0]) || (xval >= xRange[1])) continue
          if (yval > max) max = yval
        }
        
        return max === 0 ? [0, 1] : [0, max * 1.8]
      } catch (error) {
        this.handleError(error as Error, 'computeYRange')
        return [0, 1]
      }
    },
    
    isHighlighted(value: number): boolean {
      try {
        if (!isFinite(value)) return false
        return this.highlightedPos(value) !== undefined
      } catch (error) {
        this.handleError(error as Error, 'isHighlighted')
        return false
      }
    },
    
    highlightedPos(value: number): number | undefined {
      try {
        if (!this.isEnhancedMode || !isFinite(value)) return undefined
        
        const highlighted = this.highlightedValues
        if (highlighted.length === 0) return undefined
        
        if (this.currentTitle === 'Augmented Annotated Spectrum') {
          const selectedMass = this.selectedMass
          if (selectedMass === undefined || selectedMass >= highlighted.length) return undefined
          
          const mzs = highlighted[selectedMass].mzs
          if (!Array.isArray(mzs)) return undefined
          
          for (let j = 0; j < mzs.length; j++) {
            if (isFinite(mzs[j]) && Math.abs(value - mzs[j]) <= 1e-5) {
              return selectedMass
            }
          }
        } else {
          for (let i = 0; i < highlighted.length; i++) {
            const mass = highlighted[i].mass
            if (isFinite(mass) && Math.abs(value - mass) <= 1e-5) {
              return i
            }
          }
        }
        
        return undefined
      } catch (error) {
        this.handleError(error as Error, 'highlightedPos')
        return undefined
      }
    },
    
    // === FALLBACK MECHANISMS ===
    getFallbackData(): Plotly.Data[] {
      return [
        {
          x: [0, 1],
          y: [0, 0],
          mode: 'lines',
          type: 'scatter',
          marker: { color: this.mergedStyling.unhighlightedColor },
          name: 'No Data'
        }
      ]
    },
    
    getFallbackLayout(): Partial<Plotly.Layout> {
      return {
        title: '<b>No Data Available</b>',
        showlegend: false,
        height: 400,
        xaxis: { title: 'X-axis', showgrid: false },
        yaxis: { title: 'Y-axis', showgrid: true, rangemode: 'nonnegative' },
        paper_bgcolor: this.theme?.backgroundColor || 'white',
        plot_bgcolor: this.theme?.backgroundColor || 'white',
        font: {
          color: this.theme?.textColor || 'black',
          family: this.theme?.font || 'Arial'
        }
      }
    },
    
    // === VALIDATION ===
    validateComponentState(): boolean {
      try {
        // Check if essential stores are available
        if (!this.streamlitDataStore || !this.selectionStore) {
          console.warn('PlotlyLineplotUnified: Required stores not available')
          return false
        }
        
        // Check if data structure is valid
        const scanData = this.streamlitDataStore.allDataForDrawing?.per_scan_data
        if (!Array.isArray(scanData)) {
          console.warn('PlotlyLineplotUnified: Invalid scan data structure')
          return false
        }
        
        // Check if required columns exist for current mode
        const dataRow = this.isBasicMode ? this.selectedRow : this.selectedScan
        if (dataRow !== undefined && dataRow < scanData.length) {
          const data = scanData[dataRow]
          if (!data || typeof data !== 'object') {
            console.warn('PlotlyLineplotUnified: Invalid data row')
            return false
          }
          
          const xColumn = this.xColumn
          const yColumn = this.yColumn
          if (!xColumn || !yColumn) {
            console.warn('PlotlyLineplotUnified: Missing column configuration')
            return false
          }
          
          if (!(xColumn in data) || !(yColumn in data)) {
            console.warn('PlotlyLineplotUnified: Required columns not found in data')
            return false
          }
        }
        
        return true
      } catch (error) {
        this.handleError(error as Error, 'validateComponentState')
        return false
      }
    },
    
    // === SAFE RENDERING ===
    async safeGraph(): Promise<void> {
      try {
        if (!this.validateComponentState()) {
          await this.renderFallback()
          return
        }
        await this.graph()
      } catch (error) {
        this.handleError(error as Error, 'safeGraph')
        await this.renderFallback()
      }
    },
    
    async renderFallback(): Promise<void> {
      try {
        await Plotly.newPlot(this.id, this.getFallbackData(), this.getFallbackLayout(), {
          modeBarButtonsToRemove: ['toImage', 'sendDataToCloud'],
          staticPlot: true
        })
        
        this.$emit('plot-rendered', {
          timestamp: Date.now(),
          mode: 'fallback',
          features: ['fallback']
        })
      } catch (error) {
        console.error('PlotlyLineplotUnified: Failed to render fallback:', error)
      }
    },
    
    // === UTILITY ===
    handleError(error: Error, context: string): void {
      const errorInfo = {
        error: error.message || 'Unknown error',
        context,
        timestamp: Date.now(),
        mode: this.resolvedMode,
        componentState: {
          isInitialized: this.isInitialized,
          currentMode: this.currentMode,
          hasData: this.xValues.length > 0
        }
      }
      
      console.error(`PlotlyLineplotUnified error in ${context}:`, error, errorInfo)
      this.$emit('plot-error', errorInfo)
    }
  },
})
</script>

<style scoped>
.plot-container {
  position: relative;
  width: 100%;
  
  /* CSS custom properties for theming */
  color: var(--text-color);
  background-color: var(--background-color);
}

.simple-button {
  position: absolute;
  top: 17%;
  left: 6.5%;
  z-index: 1000;
  background-color: var(--annotation-background);
  border: none;
  border-radius: 50%;
  width: 30px;
  height: 30px;
  text-align: center;
  line-height: 230%;
  cursor: pointer;
}

.simple-button:hover {
  background-color: var(--button-hover-color);
}
</style>