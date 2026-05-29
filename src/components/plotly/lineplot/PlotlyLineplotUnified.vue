<template>
  <div :id="id" class="plot-container" :style="cssCustomProperties">
    <!-- Enhanced Mode UI Elements -->
    <button 
      v-if="showBackButton" 
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
  },
  setup() {
    const streamlitDataStore = useStreamlitDataStore()
    const selectionStore = useSelectionStore()
    return { streamlitDataStore, selectionStore }
  },
  data() {
    return {
      manual: false as Boolean,
      manual_xRange: undefined as number[] | undefined,
      
      // UI state
      isInitialized: false as Boolean,
      
      // Annotation toggle state
      annotationsVisible: true as Boolean,
      
      // Deconvolved peaks highlighting mode
      deconvolvedPeaksHighlightMode: false as Boolean,
      
      // Local state for title to avoid prop mutation
      localTitle: '' as string
    }
  },
  computed: {
    id(): string {
      return `graph-${this.index}`
    },
    
    isDataReady(): boolean {
      try {
        // Check if essential data structure exists
        const scanData = this.streamlitDataStore.allDataForDrawing?.per_scan_data
        if (!scanData || !Array.isArray(scanData) || scanData.length === 0) {
          return false
        }
        
        // Check if selected scan is valid
        const selectedScan = this.selectedScan
        if (selectedScan === undefined || selectedScan >= scanData.length) {
          return false
        }
        
        // Check if scan data exists
        const data = scanData[selectedScan]
        if (!data || typeof data !== 'object') {
          return false
        }
        
        // Check if required columns exist and have content
        const xColumn = this.xColumn
        const yColumn = this.yColumn
        if (!xColumn || !yColumn) {
          return false
        }
        
        const xData = data[xColumn]
        const yData = data[yColumn]
        if (!Array.isArray(xData) || !Array.isArray(yData) ||
            xData.length === 0 || yData.length === 0) {
          return false
        }
        
        return true
      } catch (error) {
        this.handleError(error as Error, 'isDataReady-computation')
        return false
      }
    },
    
    theme(): Theme | undefined {
      return this.streamlitDataStore.theme
    },
    
    isTnTMode(): boolean {
      return this.selectionStore.selectedTag !== undefined
    },

    isAnnotatedSpectraMode(): boolean {
      // Annotated spectra modes use 'm/z' axis, deconvolved modes use 'Monoisotopic Mass'
      return this.xAxisLabel === 'm/z'
    },

    config(): typeof DEFAULT_CONFIG {
      return {
        ...DEFAULT_CONFIG,
        ...this.args.config
      }
    },
    
    styling(): typeof DEFAULT_STYLING {
      return {
        ...DEFAULT_STYLING,
        ...this.args.styling,
        annotationColors: {
          ...DEFAULT_STYLING.annotationColors,
          ...this.args.styling?.annotationColors
        }
      }
    },
    
    selectedScan(): number | undefined {
      try {
        const scanData = this.streamlitDataStore.allDataForDrawing?.per_scan_data
        if (!scanData || scanData.length === 0) return undefined
        
        // Always default to first scan
        return 0
      } catch (error) {
        this.handleError(error as Error, 'selectedScan-computation')
        return undefined
      }
    },
    
    selectedTag(): number | undefined {
      return this.isTnTMode ? this.selectionStore.selectedTagIndex : undefined
    },
    
    selectedAA(): number | undefined {
      return this.isTnTMode ? this.selectionStore.selectedTag?.selectedAA : undefined
    },

    // A tag's fragment masses arrive in descending order, so the rendered tag
    // letters use a reversed index (sequence.length - 1 - i). Reverse the
    // selected within-tag index into that same space so the highlight lands on
    // the residue the user selected instead of its mirror position.
    reversedSelectedAA(): number | undefined {
      const tag = this.selectionStore.selectedTag
      if (tag === undefined) {
        return undefined
      }
      return (tag.sequence.length - 1) - tag.selectedAA
    },
    
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
    
    xValues(): number[] {
      try {
        const xValues: number[] = []
        const dataRow = this.selectedScan
        
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
        const dataRow = this.selectedScan
        
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
    
    MassValues(): number[] {
      try {
        if (this.selectedScan === undefined) return []
        
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

    MZValues(): number[] {
      try {
        if (this.selectedScan === undefined) return []
        
        const scanData = this.streamlitDataStore.allDataForDrawing?.per_scan_data
        if (!scanData || this.selectedScan >= scanData.length) return []
        
        const data = scanData[this.selectedScan]
        const massData = data?.['MonoMass_Anno'] as number[]
        
        return Array.isArray(massData) ? massData : []
      } catch (error) {
        this.handleError(error as Error, 'xMassValues-computation')
        return []
      }
    },
    
    mzSignals(): number[][][] {
      try {
        if (this.selectedScan === undefined) return []
        
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
    
    showBackButton(): boolean {
      return this.isTnTMode &&
             (this.currentTitle === 'Augmented Annotated Spectrum')
    },

    highlightedValues(): HighlightData[] {
      try {
        const massValues = this.MassValues
        const signals = this.mzSignals
        
        if (massValues.length === 0) return []
        
        let highlightValues: HighlightData[] = []
        const highlightedIndices = new Set<number>()
        
        // First, handle selective highlighting (original logic for selected peaks)
        // Highlight by mass value (tags)
        let mass_values : number[] = []
        if (this.selectionStore.selectedTag?.masses !== undefined) {
          mass_values = this.selectionStore.selectedTag?.masses
        }
        let mass_positions : number[] = []
        mass_values.forEach((v, i) => {
          for (let j = 0; j < this.MassValues.length; j++) {
            if (Math.abs(this.MassValues[j] - v) < 1e-5) {
              mass_positions.push(j)
              break
            }
          }
        })

        // Highlight by selected mass index
        if (
          this.selectionStore.selectedMassIndex !== undefined &&
          this.selectionStore.selectedMassIndex >= 0 &&
          this.selectionStore.selectedMassIndex < this.MassValues.length &&
          this.currentTitle !== 'Augmented Deconvolved Spectrum'
        ) {
          mass_positions = [this.selectionStore.selectedMassIndex]
        }
        
        // Add selective highlights to the set and result array
        for (let i = 0; i < mass_positions.length; i++) {
          const posIndex = mass_positions[i]
          if (posIndex >= massValues.length) continue
          
          highlightedIndices.add(posIndex)
          
          // Deconvolved only spectrum
          if (signals.length === 0) {
            highlightValues.push({
              mass: this.MassValues[posIndex],
              mzs: [],
              charges: [],
              intensity: []
            })
            continue
          }
          
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
        
        // Second, when deconvolved peaks highlighting mode is active, add ALL signal peaks
        if (this.deconvolvedPeaksHighlightMode) {
          for (let i = 0; i < massValues.length; i++) {
            // Skip if already highlighted by selective logic
            if (highlightedIndices.has(i)) continue
            
            // Deconvolved only spectrum
            if (signals.length === 0) {
              highlightValues.push({
                mass: this.MassValues[i],
                mzs: [],
                charges: [],
                intensity: []
              })
              continue
            }
            
            const mass = massValues[i]
            let mzs: number[] = []
            let charges: number[] = []
            let intensity: number[] = []
            
            const signalGroup = signals[i]
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
        }
        
        return highlightValues
      } catch (error) {
        this.handleError(error as Error, 'highlightedValues-computation')
        return []
      }
    },

    highlightedMassPos(): boolean[] {
      try {
        const highlights = this.highlightedValues;
        if (highlights.length === 0 || !Array.isArray(this.MassValues)) {
          return new Array(this.MassValues?.length || 0).fill(false);
        }

        // Collect all highlighted masses
        const highlightedMasses = new Set(
          highlights.map(h => h.mass)
        );

        // Create boolean mask for each mass in this.massValues
        return this.MassValues.map(mass => highlightedMasses.has(mass));
      } catch (error) {
        this.handleError(error as Error, 'booleanMassHighlightMask-computation');
        return new Array(this.MassValues?.length || 0).fill(false);
      }
    },

    highlightedMzPos(): boolean[] {
      try {
        const highlights = this.highlightedValues;
        if (highlights.length === 0 || !Array.isArray(this.MZValues)) {
          return new Array(this.MZValues?.length || 0).fill(false);
        }

        // Flatten all mzs from highlighted values
        const highlightedMzs = new Set(
          highlights.flatMap(h => h.mzs)
        );

        // Create boolean mask for each mz in this.mzValues
        return this.MZValues.map(mz => highlightedMzs.has(mz));
      } catch (error) {
        this.handleError(error as Error, 'booleanHighlightMask-computation');
        return new Array(this.MZValues?.length || 0).fill(false);
      }
    },
      
    plotData(): PlotData {
      let unhighlighted_x: number[] = []
      let unhighlighted_y: number[] = []
      let highlighted_x: number[] = []
      let highlighted_y: number[] = []
      let selected_x: number[] = []
      let selected_y: number[] = []

      for (let i = 0; i < this.xValues.length; i++) {
        const x_val = this.xValues[i]
        const y_val = this.yValues[i]

        let posHighlight = undefined
        if (this.xAxisLabel == 'm/z') {
            posHighlight = this.highlightedMzPos[Math.floor(i / 3)]
        }
        else {
            posHighlight = this.highlightedMassPos[Math.floor(i / 3)]
        }
        if (posHighlight === undefined) continue
        
        if (
          (posHighlight) &&
          ((this.reversedSelectedAA == Math.floor(i / 3)) ||
          (this.reversedSelectedAA == Math.floor(i / 3) - 1))
        ){
          selected_x.push(x_val)
          selected_y.push(y_val)
        }
        else if (posHighlight) {
          highlighted_x.push(x_val)
          highlighted_y.push(y_val)
        }
        else {
          unhighlighted_x.push(x_val)
          unhighlighted_y.push(y_val)
        }
      }

      return {
        unhighlighted_x,
        unhighlighted_y,
        selected_x,
        selected_y,
        highlighted_x,
        highlighted_y,
      }
    },
    
    xPosScalingFactor(): number {
      return this.config.xPosScalingFactor
    },
    
    xPosScalingThreshold(): number {
      return this.config.xPosScalingThreshold
    },
    
    maxAnnotationRange(): number {
      return this.xPosScalingFactor * this.xPosScalingThreshold
    },

    minAnnotationWidth(): number {
      return this.config.minAnnotationWidth
    },
    actualPlotWidth(): number {
        // Try to get width from DOM element first to avoid circular dependency
        const element = document.getElementById(this.id)
        if (element) {
          const rect = element.getBoundingClientRect()
          if (rect.width > 0) {
            return rect.width
          }
        }
        return -1
    },
    // Shared coordinate calculation utilities
    getAnnotationPositioning(): {
      ymax: number;
      ypos_low: number;
      ypos: number;
      ypos_high: number;
      xpos_scaling: number;
      xRange: number[];
      yRange: number[];
    } | null {
      const yRange = this.yRange
      const xRange = this.xRange
      
      if (yRange.length < 2 || yRange[1] <= 0 || xRange.length < 2) {
        return null
      }

      const ymax = yRange[1] / 1.8
      const ypos_low = ymax * 1.18
      const ypos = ymax * 1.25
      const ypos_high = ymax * 1.32
      
      // Base scaling on the actual plot width
      const xpos_scaling = this.computeXposScalingFactor(xRange[1] - xRange[0])

      return {
        ymax,
        ypos_low,
        ypos,
        ypos_high,
        xpos_scaling,
        xRange,
        yRange
      }
    },

    // Calculate annotation box dimensions, positions and visibility with overlap detection
    annotationBoxData(): Array<{
      x: number;
      y: number;
      width: number;
      height: number;
      type: 'mass' | 'charge';
      index: number;
      visible: boolean;
    }> {
      try {
        return this.computeAnnotationBoxes(this.xRange, this.yRange)
      } catch (error) {
        this.handleError(error as Error, 'annotationBoxData-computation')
        return []
      }
    },
    
    xRange(): number[] {
      try {
        const xValues = this.xValues
        if (xValues.length === 0) return [0, 1]
        
        // Smart Zoom Range Logic with Priority Order:
        // 1. Deconvolved peaks ON (regardless of annotation state): Show entire spectrum
        // 2. Deconvolved peaks OFF + Selective highlighting: Fit to highlighted peaks
        // 3. Both deconvolved and selective highlighting ON: Default to whole spectrum
        
        // Priority 1: If deconvolved peaks highlighting is active, show entire spectrum
        if (this.deconvolvedPeaksHighlightMode) {
          const minX = Math.min(...xValues)
          const maxX = Math.max(...xValues)
          return [minX * 0.98, maxX * 1.02]
        }
        
        if (!this.annotationsVisible && !this.manual) {
          const minX = Math.min(...xValues)
          const maxX = Math.max(...xValues)
          return [minX * 0.98, maxX * 1.02]
        }

        // Enhanced mode range logic
        if (this.manual && this.manual_xRange !== undefined) {
          return this.manual_xRange
        }

        const highlighted = this.highlightedValues
        
        // Priority 2: Deconvolved peaks OFF + Selective highlighting: Fit to highlighted peaks
        // Skip iterative adjustment if no highlighted values
        if (highlighted.length === 0) {
          const minX = Math.min(...xValues)
          const maxX = Math.max(...xValues)
          return [minX * 0.98, maxX * 1.02]
        }

        let values : number[] = [0, 1]
        if (this.xAxisLabel === 'm/z') {
          values = highlighted.flatMap(a => Array.isArray(a.mzs) ? a.mzs : []).filter((m: number) => Number.isFinite(m))
        }
        else {
          values = highlighted.map(a => a.mass).filter(m => !isNaN(m))
        }
        
        if (values.length === 0) return [0, 1]
        
        let xmin_full = Math.min(...values) * 0.98
        let xmax_full = Math.max(...values) * 1.02

        // For m/z spectrum return full range
        if (this.xAxisLabel === 'm/z') {
          return [xmin_full, xmax_full]
        }

        // Calculate initial centered range
        let xcenter = values.reduce((sum, mass) => sum + mass, 0) / values.length
        let offset = 0.5 * 0.9 * this.maxAnnotationRange
        let initialRange = [xcenter - offset, xcenter + offset]
        
        // Use iterative zoom adjustment to ensure annotations are visible
        let optimizedRange = this.calculateOptimalXRange(initialRange)
        
        return optimizedRange
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
    
    annotationData(): PlotAnnotations {
      try {

        if (!this.annotationsVisible) {
          return { shapes: [], annotations: [], traces: [] }
        }
        
        // Get highlighted values but only show annotations for selected masses
        // Filter highlighted values to only include those from selective highlighting (not deconvolved mode)
        let annotationHighlights: HighlightData[] = []
        
        // Highlight by mass value (tags)
        let mass_values : number[] = []
        if (this.selectionStore.selectedTag?.masses !== undefined) {
          mass_values = this.selectionStore.selectedTag?.masses
        }
        let mass_positions : number[] = []
        mass_values.forEach((v, i) => {
          for (let j = 0; j < this.MassValues.length; j++) {
            if (Math.abs(this.MassValues[j] - v) < 1e-5) {
              mass_positions.push(j)
              break
            }
          }
        })

        // Highlight by selected mass index
        if (
          this.selectionStore.selectedMassIndex !== undefined &&
          this.selectionStore.selectedMassIndex >= 0 &&
          this.selectionStore.selectedMassIndex < this.MassValues.length &&
          this.currentTitle !== 'Augmented Deconvolved Spectrum'
        ) {
          mass_positions = [this.selectionStore.selectedMassIndex]
        }
        
        // Build annotation highlights based on selective highlighting only
        const massValues = this.MassValues
        const signals = this.mzSignals
        
        if (mass_positions.length === 0 || massValues.length === 0) {
          return { shapes: [], annotations: [], traces: [] }
        }
        
        for (let i = 0; i < mass_positions.length; i++) {
          const posIndex = mass_positions[i]
          if (posIndex >= massValues.length) continue
          
          // Deconvolved only spectrum
          if (signals.length === 0) {
            annotationHighlights.push({
              mass: this.MassValues[posIndex],
              mzs: [],
              charges: [],
              intensity: []
            })
            continue
          }
          
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
          
          annotationHighlights.push({
            mass: mass,
            mzs: mzs,
            charges: charges,
            intensity: intensity
          })
        }
        
        const highlighted = annotationHighlights
        if (highlighted.length === 0) {
          return { shapes: [], annotations: [], traces: [] }
        }

        // Reuse positioning calculations and get visibility from annotationBoxData
        const positioning = this.getAnnotationPositioning
        if (!positioning) {
          return { shapes: [], annotations: [], traces: [] }
        }

        const { ypos_low, ypos, ypos_high, xpos_scaling } = positioning
        
        let buttonTraces: Plotly.Data[] = []
        let buttonShapes: Partial<Plotly.Shape>[] = []
        let buttonAnnotations: Partial<Plotly.Annotations>[] = []

        if (this.xAxisLabel === 'm/z') {
          type MzIntensity = {
            mz: number;
            intensity: number;
          }

          if (this.selectionStore.selectedMassIndex === undefined) {
            return {
              shapes: [],
              annotations: [],
              traces: [],
            }
          }

          if (this.selectionStore.selectedMassIndex >= this.MassValues.length) {
            return {
              shapes: [],
              annotations: [],
              traces: [],
            }
          }

          let fillcolor = this.styling.annotationColors.massButton
  
          // Only one mass is supported for raw spectra
          const selectedData = highlighted[0]
          const { mzs, charges, intensity: intensities } = selectedData
          
          if (!mzs || mzs.length === 0) {
            return { shapes: [], annotations: [], traces: [] }
          }
          
          const grouped = new Map<number, MzIntensity[]>()

          // Group by charge state
          for (let i = 0; i < mzs.length; i++) {
              const mz = mzs[i]
              const charge = charges[i]
              const intensity = intensities[i]
              const mzIntensity: MzIntensity = { mz, intensity }

              if (grouped.has(charge)) {
                  grouped.get(charge)!.push(mzIntensity)
              } else {
                  grouped.set(charge, [mzIntensity])
              }
          }

          // Create charge label annotations using overlap detection from annotationBoxData
          const annotationBoxes = this.annotationBoxData
          const visibleChargeBoxes = annotationBoxes.filter(box => box.type === 'charge' && box.visible)
          
          let chargeIndex = 0
          grouped.forEach((mzIntensity, charge) => {
            const summedIntensity = mzIntensity.reduce((sum, val) => sum + val.intensity, 0)
            const centerOfGravity = mzIntensity.map(val => (val.intensity / summedIntensity)*val.mz)
            const mass = centerOfGravity.reduce((sum, val) => sum + val, 0)
            
            // Only show if visible according to overlap detection
            const isVisible = visibleChargeBoxes.some(box => box.index === chargeIndex)
            if (isVisible) {
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
            }
            chargeIndex++
          })
          return {
              shapes: buttonShapes,
              annotations: buttonAnnotations,
              traces: buttonTraces,
          }
        }

        // Mass Buttons + Sequence Arrows with overlap detection
        let arrowAnnotations: Partial<Plotly.Annotations>[] = []
        const reversedSelectedAA = this.reversedSelectedAA
        const annotationBoxes = this.annotationBoxData
        const visibleMassBoxes = annotationBoxes.filter(box => box.type === 'mass' && box.visible)
        
        // Create mass button annotations using overlap detection
        const scaling = highlighted.length === 1 ? 2 : 1
        for (let i = 0; i < highlighted.length; i++) {
          const highlightedData = highlighted[i]
          const mass = highlightedData.mass
          
          // Performance optimization: Skip invalid mass values
          if (!isFinite(mass)) continue

          // Only show if visible according to overlap detection
          const isVisible = visibleMassBoxes.some(box => box.index === i)
          if (isVisible) {
            let fillcolor = this.styling.annotationColors.massButton
            let family = 'sans-serif'
            
            if ((reversedSelectedAA === i) || (reversedSelectedAA === i - 1)) {
                fillcolor = this.styling.annotationColors.selectedMassButton
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
              x0: mass - scaling*xpos_scaling,
              y0: ypos_low,
              x1: mass + scaling*xpos_scaling,
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
        }

        // Create sequence arrows between mass buttons with overlap-aware logic
        const yPosArrow = ypos * 0.5
        const yPosAA = ypos * 0.6
        const sequence = this.selectionStore.selectedTag?.sequence

        for (let i = 0; i < highlighted.length - 1; i++) {
          const currentData = highlighted[i]
          const nextData = highlighted[i + 1]
          
          // Performance optimization: Skip if either mass is invalid
          if (!isFinite(currentData.mass) || !isFinite(nextData.mass)) continue

          // Only show arrows if both connected mass buttons are visible
          const currentVisible = visibleMassBoxes.some(box => box.index === i)
          const nextVisible = visibleMassBoxes.some(box => box.index === i + 1)
          if (currentVisible && nextVisible) {
            let fillcolor = this.styling.annotationColors.sequenceArrow
            let family = 'sans-serif'
            
            if (reversedSelectedAA === i) {
                fillcolor = this.styling.annotationColors.selectedSequenceArrow
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
    
    data(): Plotly.Data[] {

      let traces: Plotly.Data[] = []
      
      // When annotations are hidden AND deconvolved peaks highlighting is off, use single color
      if (!this.annotationsVisible && !this.deconvolvedPeaksHighlightMode) {
        traces.push({
          x: this.xValues,
          y: this.yValues,
          mode: 'lines',
          type: 'scatter',
          connectgaps: false,
          marker: { color: this.styling.highlightHiddenColor }
        })
        return traces
      }
      
      // When annotations are visible OR deconvolved peaks highlighting is active, use highlighting logic
      traces.push({
        x: this.plotData.unhighlighted_x,
        y: this.plotData.unhighlighted_y,
        mode: 'lines',
        type: 'scatter',
        marker: { color: this.styling.unhighlightedColor }
      })
      
      traces.push({
        x: this.plotData.highlighted_x,
        y: this.plotData.highlighted_y,
        mode: 'lines',
        type: 'scatter',
        marker: { color: this.styling.highlightColor }
      })
      
      traces.push({
        x: this.plotData.selected_x,
        y: this.plotData.selected_y,
        mode: 'lines',
        type: 'scatter',
        marker: { color: this.styling.selectedColor }
      })
      
      // Only add button traces when annotations are visible
      if (this.annotationsVisible) {
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
          fixedrange: false,
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
      baseLayout.xaxis!.range = this.xRange
      baseLayout.yaxis!.range = this.yRange
      
      // Add null checks for annotationData to prevent TypeError
      if (this.annotationData && this.annotationData.shapes) {
        baseLayout.shapes = this.annotationData.shapes
      } else {
        baseLayout.shapes = []
      }
      
      if (this.annotationData && this.annotationData.annotations) {
        baseLayout.annotations = this.annotationData.annotations
      } else {
        baseLayout.annotations = []
      }
      
      return baseLayout
    },
    
    cssCustomProperties(): Record<string, string> {
      return {
        '--highlight-color': this.styling.highlightColor,
        '--selected-color': this.styling.selectedColor,
        '--unhighlighted-color': this.styling.unhighlightedColor,
        '--annotation-background': this.styling.annotationColors.background,
        '--button-hover-color': this.styling.annotationColors.buttonHover,
      }
    }
  },
  
  watch: {
    
    isDataReady: {
      handler(newVal: boolean) {
        if (newVal) {
          this.safeGraph()
        }
      },
      immediate: true
    },
    
    'streamlitDataStore.allDataForDrawing.per_scan_data': {
      handler() {
        this.safeGraph()
      },
      deep: true
    },

    selectedScan() {
      this.resetManualState()
      this.safeGraph()
    },
    
    xValues() {
      this.safeGraph()
    },
    
    selectedTag() {
      this.resetManualState()
      this.safeGraph()
    },
    
    annotationsVisible() {
      this.safeGraph()
    },
    
    deconvolvedPeaksHighlightMode() {
      this.safeGraph()
    },
    
    'selectionStore.selectedMassIndex'() {
      this.manual = false
      this.safeGraph()
    }

  },
  
  mounted() {
    this.initializeComponent()
  },
  
  methods: {
    computeXposScalingFactor(xRange : number) {
      const actualWidth = this.actualPlotWidth
      if (actualWidth < 0) {
        return 0
      }
      return (1200 / actualWidth) * xRange / this.xPosScalingFactor
    },
    // Helper method to compute annotation boxes for any given xRange and yRange
    computeAnnotationBoxes(xRange: number[], yRange: number[]): Array<{
      x: number;
      y: number;
      width: number;
      height: number;
      type: 'mass' | 'charge';
      index: number;
      visible: boolean;
    }> {
      try {
        const highlighted = this.highlightedValues
        if (highlighted.length === 0) return []

        if (yRange.length < 2 || yRange[1] <= 0 || xRange.length < 2) {
          return []
        }

        const ymax = yRange[1] / 1.8
        const ypos_low = ymax * 1.18
        const ypos_high = ymax * 1.32
        
        // Base scaling on the actual plot width
        const xpos_scaling = this.computeXposScalingFactor(xRange[1] - xRange[0])

        const boxes: Array<{
          x: number;
          y: number;
          width: number;
          height: number;
          type: 'mass' | 'charge';
          index: number;
          visible: boolean;
        }> = []

        // For m/z spectrum (charge states)
        if (this.xAxisLabel === 'm/z') {
          if (this.selectionStore.selectedMassIndex === undefined ||
              this.selectionStore.selectedMassIndex >= this.MassValues.length) {
            return boxes
          }

          const selectedData = highlighted[0]
          const { mzs, charges, intensity: intensities } = selectedData
          
          if (!mzs || mzs.length === 0) return boxes
          
          const grouped = new Map<number, Array<{mz: number; intensity: number}>>()

          // Group by charge state
          for (let i = 0; i < mzs.length; i++) {
            const mz = mzs[i]
            const charge = charges[i]
            const intensity = intensities[i]
            const mzIntensity = { mz, intensity }

            if (grouped.has(charge)) {
              grouped.get(charge)!.push(mzIntensity)
            } else {
              grouped.set(charge, [mzIntensity])
            }
          }

          // Create charge state boxes
          let chargeIndex = 0
          grouped.forEach((mzIntensity, charge) => {
            const summedIntensity = mzIntensity.reduce((sum, val) => sum + val.intensity, 0)
            const centerOfGravity = mzIntensity.map(val => (val.intensity / summedIntensity) * val.mz)
            const mass = centerOfGravity.reduce((sum, val) => sum + val, 0)
            
            boxes.push({
              x: mass,
              y: (ypos_low + ypos_high) / 2,
              width: xpos_scaling,
              height: ypos_high - ypos_low,
              type: 'charge',
              index: chargeIndex++,
              visible: true // Will be updated by overlap detection below
            })
          })
        } else {
          // For mass spectrum (mass labels)
          const scaling = highlighted.length === 1 ? 2 : 1
          for (let i = 0; i < highlighted.length; i++) {
            const highlightedData = highlighted[i]
            const mass = highlightedData.mass
            
            if (!isFinite(mass)) continue

            boxes.push({
              x: mass,
              y: (ypos_low + ypos_high) / 2,
              width: scaling * xpos_scaling * 2, // *2 because shape uses ±scaling*xpos_scaling
              height: ypos_high - ypos_low,
              type: 'mass',
              index: i,
              visible: true // Will be updated by overlap detection below
            })
          }
        }

        // Overlap detection using data coordinates
        if (boxes.length > 1) {
          // Check if ANY two annotation boxes overlap in data space
          let hasOverlap = false
          for (let i = 0; i < boxes.length && !hasOverlap; i++) {
            for (let j = i + 1; j < boxes.length; j++) {
              if (this.testBoxesOverlapForRange(boxes[i], boxes[j], xRange)) {
                hasOverlap = true
                break
              }
            }
          }

          // If any overlap is detected, hide all annotations
          if (hasOverlap) {
            boxes.forEach(box => { box.visible = false })
          }
        }

        return boxes
      } catch (error) {
        this.handleError(error as Error, 'computeAnnotationBoxes')
        return []
      }
    },

    // Helper method to check if annotations would be visible for a given test range
    wouldAnnotationsBeVisible(testXRange: number[]): boolean {
      try {
        // Use the shared annotation box computation with test range
        const testYRange = this.computeYRange(testXRange)
        const boxes = this.computeAnnotationBoxes(testXRange, testYRange)
        
        // Return true if any boxes would be visible
        return boxes.some((box: { visible: boolean }) => box.visible)
      } catch (error) {
        this.handleError(error as Error, 'wouldAnnotationsBeVisible')
        return true
      }
    },

    // Calculate progressively narrower zoom ranges using actual annotationBoxData logic
    calculateOptimalXRange(initialRange: number[]): number[] {
      try {
        const maxIterations = 10
        const narrowingFactor = 0.8
        let currentRange = [...initialRange]
        
        for (let iteration = 0; iteration < maxIterations; iteration++) {
          if (this.wouldAnnotationsBeVisible(currentRange)) {
            return currentRange
          }
          
          // Narrow the range around the center
          const center = (currentRange[0] + currentRange[1]) / 2
          const halfWidth = (currentRange[1] - currentRange[0]) / 2
          const newHalfWidth = halfWidth * narrowingFactor
          
          currentRange = [center - newHalfWidth, center + newHalfWidth]
          
          // Prevent range from becoming too narrow
          if (currentRange[1] - currentRange[0] < 0.1) {
            break
          }
        }
        
        return currentRange
      } catch (error) {
        this.handleError(error as Error, 'calculateOptimalXRange')
        return initialRange
      }
    },

    // Helper method for overlap detection with custom x-range (used by both current and test ranges)
    testBoxesOverlapForRange(box1: { x: number; y: number; width: number; height: number },
                            box2: { x: number; y: number; width: number; height: number },
                            xRange: number[]): boolean {
      try {
        if (xRange.length !== 2 || xRange[1] <= xRange[0]) return false

        const xPadding = (xRange[1] - xRange[0]) * 0.01
        const yPadding = box1.height * 0.1
        
        const box1Left = box1.x - box1.width / 2 - xPadding
        const box1Right = box1.x + box1.width / 2 + xPadding
        const box1Top = box1.y - box1.height / 2 - yPadding
        const box1Bottom = box1.y + box1.height / 2 + yPadding
        
        const box2Left = box2.x - box2.width / 2 - xPadding
        const box2Right = box2.x + box2.width / 2 + xPadding
        const box2Top = box2.y - box2.height / 2 - yPadding
        const box2Bottom = box2.y + box2.height / 2 + yPadding
        
        return !(box1Right < box2Left || box2Right < box1Left ||
                 box1Bottom < box2Top || box2Bottom < box1Top)
      } catch (error) {
        this.handleError(error as Error, 'testBoxesOverlapForRange')
        return false
      }
    },

    async graph(): Promise<void> {
      try {
        // Ensure DOM element exists before rendering
        const element = document.getElementById(this.id)
        if (!element) {
          console.warn(`PlotlyLineplotUnified: DOM element with id '${this.id}' not found, skipping render`)
          return
        }
        
        // Build modeBarButtonsToAdd array conditionally
        const modeBarButtons : any[] = [
          {
            title: this.annotationsVisible ? 'Hide Annotations' : 'Show Annotations',
            name: 'toggleAnnotations',
            icon: {
              width: 1792,
              height: 1792,
              path: 'M1664 960q-152-236-381-353 61 104 61 225 0 185-131.5 316.5t-316.5 131.5-316.5-131.5-131.5-316.5q0-121 61-225-229 117-381 353 133 205 333.5 326.5t434.5 121.5 434.5-121.5 333.5-326.5zm-720-384q0-20-14-34t-34-14q-125 0-214.5 89.5t-89.5 214.5q0 20 14 34t34 14 34-14 14-34q0-86 61-147t147-61q20 0 34-14t14-34zm848 384q0 34-20 69-140 230-376.5 368.5t-499.5 138.5-499.5-139-376.5-368q-20-35-20-69t20-69q140-229 376.5-368t499.5-139 499.5 139 376.5 368q20 35 20 69z'
            },
            click: () => {
              this.toggleAnnotations()
            },
          }
        ]

        // Only add deconvolved peaks button in annotated spectra modes
        if (this.isAnnotatedSpectraMode) {
          modeBarButtons.push({
            title: this.deconvolvedPeaksHighlightMode ? 'Hide Deconvolved Peaks' : 'Show Deconvolved Peaks',
            name: 'toggleDeconvolvedPeaks',
            icon: {
              width: 1792,
              height: 1792,
              path: 'M448 1024h896v128h-896v-128zm0-256h896v128h-896v-128zm0-256h896v128h-896v-128zm0-256h896v128h-896v-128zm-448 768h384v128h-384v-128zm0-256h384v128h-384v-128zm0-256h384v128h-384v-128zm0-256h384v128h-384v-128z'
            },
            click: () => {
              this.toggleDeconvolvedPeaksHighlight()
            },
          })
        }

        modeBarButtons.push(
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
              const element = document.getElementById(this.id)
              if (element) {
                Plotly.downloadImage(element, {
                  filename: 'FLASHViewer-lineplot',
                  height: 400,
                  width: 1200,
                  format: 'svg',
                })
              }
            },
          }
        )

        const plotInstance = await Plotly.newPlot(this.id, this.data, this.layout, {
          modeBarButtonsToRemove: ['toImage', 'sendDataToCloud'],
          modeBarButtonsToAdd: modeBarButtons,
          scrollZoom: true
        })
        
        // Event listeners
        plotInstance.on('plotly_relayout', (eventData) => {
          this.onRelayout(eventData)
        })
      
        plotInstance.on('plotly_click', (eventData) => {
          this.onPlotClick(eventData)
        })
        
      } catch (error) {
        this.handleError(error as Error, 'graph-rendering')
      }
    },
    
    initializeComponent(): void {
      try {      
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
        this.manual_xRange = undefined
        if (this.localTitle === 'Augmented Annotated Spectrum') {
          this.localTitle = 'Augmented Deconvolved Spectrum'
        }
        this.selectionStore.updateSelectedMass(undefined)
      } catch (error) {
        this.handleError(error as Error, 'resetManualState')
      }
    },
    
    backButton(): void {
      this.resetManualState()
      this.safeGraph()
    },
    
    toggleAnnotations(): void {
      this.annotationsVisible = !this.annotationsVisible
      this.safeGraph()
    },
    
    toggleDeconvolvedPeaksHighlight(): void {
      this.deconvolvedPeaksHighlightMode = !this.deconvolvedPeaksHighlightMode
      this.safeGraph()
    },
    
    onPlotClick(eventData: any): void {
      if (eventData.points && eventData.points.length > 0) {
        const x = eventData.points[0].x
        
        for (let i = 0; i < this.MassValues.length; i++) {
          if (x === this.MassValues[i]) {
            if (this.localTitle === 'Augmented Deconvolved Spectrum') {
              if (!this.highlightedMassPos[i]) {
                break
              }
              this.localTitle = 'Augmented Annotated Spectrum'
            }
            this.manual = false
            this.selectionStore.updateSelectedMass(i)
            this.safeGraph()
            break
          }
        }
      }
    },
    
    async onRelayout(eventData: any): Promise<void> {
      if (eventData['xaxis.range[0]'] !== undefined && eventData['xaxis.range[1]'] !== undefined) {
        const newXRange = [eventData['xaxis.range[0]'], eventData['xaxis.range[1]']]
        if (newXRange[0] < 0) {
          newXRange[0] = 0
        }
        this.manual = true
        this.manual_xRange = newXRange
        this.safeGraph()
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
        
        // Trigger full re-render to update all computed properties including overlap detection
        this.safeGraph()
      } catch (error) {
        this.handleError(error as Error, 'onAutosize')
      }
    },
    
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
    
    getFallbackData(): Plotly.Data[] {
      return [
        {
          x: [0, 1],
          y: [0, 0],
          mode: 'lines',
          type: 'scatter',
          marker: { color: this.styling.unhighlightedColor },
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
        const dataRow = this.selectedScan
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
    
    async safeGraph(): Promise<void> {
      try {
        // Check data readiness first
        if (!this.isDataReady) {
          return
        }
        
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
        
      } catch (error) {
        console.error('PlotlyLineplotUnified: Failed to render fallback:', error)
      }
    },
    
    handleError(error: Error, context: string): void {
      const errorInfo = {
        error: error.message || 'Unknown error',
        context,
        timestamp: Date.now(),
        componentState: {
          isInitialized: this.isInitialized,
          hasData: this.xValues.length > 0
        }
      }
      
      console.error(`PlotlyLineplotUnified error in ${context}:`, error, errorInfo)
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