<template>
  <div :id="id" class="plot-container">
    <button class="simple-button" @click="backButton" v-if="showBackButton">↩</button>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'
import Plotly, { type Data } from 'plotly.js-dist-min'
import type { Theme } from 'streamlit-component-lib'
import { useStreamlitDataStore } from '@/stores/streamlit-data'
import type { PlotlyLineArguments } from './plotly-lineplot'
import { useSelectionStore } from '@/stores/selection'
import { PassThrough } from 'stream'
import { initCustomFormatter } from 'vue'

interface PlotData {
  unhighlighted_x: number[]
  unhighlighted_y: number[]
  highlighted_x: number[]
  highlighted_y: number[]
  selected_x: number[]
  selected_y: number[]
}

interface PlotAnnotations {
  shapes : Partial<Plotly.Shape>[]
  annotations: Partial<Plotly.Annotations>[]
  traces: Plotly.Data[],
}

interface highlightData {
  mass : number,
  mzs : number[],
  intensity : number[]
  charges : number[]
}


export default defineComponent({
  name: 'PlotlyLineplot',
  props: {
    args: {
      type: Object as PropType<PlotlyLineArguments>,
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
      selectedMass: undefined as number | undefined
    }
  },
  computed: {
    id(): string {
      return `graph-${this.index}`
    },
    theme(): Theme | undefined {
      return this.streamlitDataStore.theme
    },
    selectedScan(): number | undefined {
      return this.selectionStore.selectedScanIndex
    },
    selectedTag(): number | undefined {
      return this.selectionStore.selectedTagIndex
    },
    selectedAA() : number | undefined {
      return this.selectionStore.selectedTag?.selectedAA
    },
    showBackButton() : boolean {
      return (this.args.title === 'Annotated Spectrum')
    },
    minCharge() : number {
      if (this.selectedScan === undefined) {
        return -10
      }
      return Math.min(...this.streamlitDataStore.allDataForDrawing.per_scan_data[this.selectedScan][
          'MinCharges'
        ] as number[]
      )
    },
    maxCharge() : number {
      if (this.selectedScan === undefined) {
        return -10
      }
      return Math.max(...this.streamlitDataStore.allDataForDrawing.per_scan_data[this.selectedScan][
          'MinCharges'
        ] as number[]
      )
    },
    xAxisLabel(): string {
      switch (this.args.title) {
        case 'Annotated Spectrum':
          return 'm/z'
        case 'Deconvolved Spectrum':
          return 'Monoisotopic Mass'
        default:
          return ''
      }
    },
    xColumn(): string {
      switch (this.args.title) {
        case 'Annotated Spectrum':
          return 'MonoMass_Anno'
        case 'Deconvolved Spectrum':
          return 'MonoMass'
        default:
          return ''
      }
    },
    xValues(): number[] {
      const xValues: number[] = []
      if (this.selectedScan === undefined) {
        return xValues
      }
      ;(
        this.streamlitDataStore.allDataForDrawing.per_scan_data[this.selectedScan][
          this.xColumn
        ] as number[]
      ).forEach((num) => {
        xValues.push(num, num, num)
      })
      return xValues
    },
    xMassValues(): number[] {
      if (this.selectedScan === undefined) {
        return []
      }
      return this.streamlitDataStore.allDataForDrawing.per_scan_data[this.selectedScan][
          'MonoMass'
        ] as number[]
    },
    mzSignals(): number[][][] {
      let mzSignals: number[][][] = []
      if (this.selectedScan === undefined) {
        return mzSignals
      }

      mzSignals = this.streamlitDataStore.allDataForDrawing.per_scan_data[
        this.selectedScan
      ]['SignalPeaks'] as number[][][]
      return mzSignals
    },
    yColmun(): string {
      switch (this.args.title) {
        case 'Annotated Spectrum':
          return 'SumIntensity_Anno'
        case 'Deconvolved Spectrum':
          return 'SumIntensity'
        default:
          return ''
      }
    },
    yValues(): number[] {
      const yValues: number[] = []
      if (this.selectedScan === undefined) {
        return yValues
      }

      ;(
        this.streamlitDataStore.allDataForDrawing.per_scan_data[this.selectedScan][
          this.yColmun
        ] as number[]
      ).forEach((num) => {
        yValues.push(-10000000, num, -10000000)
      })
      return yValues
    },
    highlightedMassPos(): number[] {
      const values = this.selectionStore.selectedTag?.masses
      if (values === undefined) {
        return []
      }

      let positions : number[] = []

      // TODO: Refactor in Python + Hashmaps, okay for now though
      for (let i = 0; i < values.length; i++) {
        for (let j = 0; j < this.xMassValues.length; j++) {
          if (Math.abs(values[i] - this.xMassValues[j]) <= 1e-5) {
            positions.push(j)
            break
          }
        }
      }

      if (positions.length === values.length) {
        return positions
      }
      return []
    },
    highlightedValues(): highlightData[] {

      const positions = this.highlightedMassPos
      
      let highlightValues : highlightData[] = []

      for (let i = 0; i < positions.length; i++) {
        const mass = this.xMassValues[positions[i]]
        let mzs : number[] = []
        let charges : number[] = []
        let intensity : number[] = []
        
        for (let j = 0; j < this.mzSignals[positions[i]].length; j++) {
            mzs.push(this.mzSignals[positions[i]][j][1])
            intensity.push(this.mzSignals[positions[i]][j][2])
            charges.push(this.mzSignals[positions[i]][j][3])
        }

        highlightValues.push(
          {
            mass : mass,
            mzs : mzs,
            charges : charges,
            intensity : intensity
          }
        )
      }

      return highlightValues
    },
    plotData() : PlotData {
      let unhighlighted_x : number[] = [] 
      let unhighlighted_y : number[] = [] 
      let highlighted_x : number[] = [] 
      let highlighted_y : number[] = [] 
      let selected_x : number[] = [] 
      let selected_y : number[] = [] 

      for (let i = 0; i < this.xValues.length; i++) {

        const x_val = this.xValues[i]
        const y_val = this.yValues[i]
        const posHighlight = this.highlightedPos(x_val)
        if (
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
      return {
        'unhighlighted_x' : unhighlighted_x,
        'unhighlighted_y' : unhighlighted_y,
        'selected_x' : selected_x,
        'selected_y' : selected_y,
        'highlighted_x' : highlighted_x,
        'highlighted_y' : highlighted_y,
      }
    },
    annotationData() : PlotAnnotations {

      let buttonTraces : Plotly.Data[] = []
      let buttonShapes : Partial<Plotly.Shape>[] = []
      let buttonAnnotations: Partial<Plotly.Annotations>[] = []

      const ymax = this.computeYRange(this.xRange)[1]/1.8
      const ypos_low = ymax*1.18
      const ypos = ymax*1.25
      const ypos_high = ymax*1.32
      const xpos_scaling = (this.xRange[1] - this.xRange[0])/27.5

      if (this.args.title === 'Annotated Spectrum') {

        interface MzIntensity {
          mz: number;
          intensity: number;
        }

        if (this.selectedMass === undefined) {
          return {
            shapes : [],
            annotations : [],
            traces : [],
          }    
        }

        let fillcolor = '#E4572E'
        if (
          (this.selectionStore.selectedTag?.selectedAA == this.selectedMass) || 
          (this.selectionStore.selectedTag?.selectedAA == this.selectedMass-1)) {
            fillcolor = "#F3A712"
        }

        const mzs = this.highlightedValues[this.selectedMass].mzs
        const charges = this.highlightedValues[this.selectedMass].charges
        const intensities = this.highlightedValues[this.selectedMass].intensity
        const grouped = new Map<number, MzIntensity[]>();

        for (let i = 0; i < mzs.length; i++) {
            const mz = mzs[i]
            const charge = charges[i]
            const intensity = intensities[i]

            const mzIntensity: MzIntensity = { mz, intensity };
            if (grouped.has(charge)) {
                grouped.get(charge)?.push(mzIntensity);
            } else {
                grouped.set(charge, [mzIntensity]);
            }
        }

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
            shapes : buttonShapes,
            annotations : buttonAnnotations,
            traces : buttonTraces,
        } 
      }  


      let arrowAnnotations: Partial<Plotly.Annotations>[] = []
      
      if (xpos_scaling > 40) {
        return {
          shapes : buttonShapes,
          annotations : buttonAnnotations,
          traces : buttonTraces,
        } 
      } 

      for (let i = 0; i < this.highlightedValues.length; i++) {

        let fillcolor = '#E4572E'
        let family = 'sans-serif'
        if (
          (this.selectionStore.selectedTag?.selectedAA == i) || 
          (this.selectionStore.selectedTag?.selectedAA == i-1)) {
            fillcolor = "#F3A712"
            family = 'Arial Black, Arial Bold, Arial, sans-serif'
        }

        const mass = this.highlightedValues[i].mass

        buttonTraces.push({
          x: [mass],
          y: [ypos],
          mode: 'markers',
          marker: {
            size: 20,
            opacity: 0,
          },
          hoverinfo: 'text',
          hovertext: String(mass),
          type: 'scatter'
        })

        buttonShapes.push({
          type: 'rect',
          x0: mass-(xpos_scaling),
          y0: ypos_low,
          x1: mass+(xpos_scaling),
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
          text: mass.toFixed(2),
          showarrow: false,
          font: {
            size: 15,
            family: family
          }
        })

      }
      const yPosArrow = ypos*0.5
      const yPosAA = ypos*0.6
      const sequence = this.selectionStore.selectedTag?.sequence

      for (let i = 0; i < this.highlightedValues.length - 1; i++) {

        let fillcolor = '#E4572E'
        let family = 'sans-serif'
        if ((this.selectionStore.selectedTag?.selectedAA == i)) {
            fillcolor = "#F3A712"
            family = 'Arial Black, Arial Bold, Arial, sans-serif'
        }

        let xStart : number = this.highlightedValues[i].mass
        let xEnd : number = this.highlightedValues[i+1].mass
        let xMid : number = (xStart + xEnd) / 2
        let xMidStart : number = xMid
        let xMidEnd : number = xMid
        let diff : number = Math.abs(xStart - xEnd)*0.9
        let AA : string = ""
        let delta : number = 0



        if (sequence !== undefined) {
          const reverseIndex = sequence.length - 1 - i;
          AA = sequence[reverseIndex];
        }

        if (xStart > xEnd) {
          delta = xStart - xEnd
          xStart -= diff
          xMidStart += diff*0.1
          xEnd += diff
          xMidEnd -= diff*0.1
        }
        else {
          delta = xEnd - xStart
          xStart += diff
          xMidStart -= diff*0.1
          xEnd -= diff
          xMidEnd += diff*0.1
        }



        arrowAnnotations.push(
          {
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
          }
        )
        arrowAnnotations.push(
          {
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
          }
        )

        arrowAnnotations.push({
          x: xMid,
          y: yPosAA,
          xref: 'x',
          yref: 'y',
          text: AA,
          hovertext: 'Δ='+delta.toFixed(2)+' Da',
          showarrow: false,
          font: {
            size: 15,
            color: fillcolor,
            family: family
          }
        })
      }


      return {
        shapes : buttonShapes,
        annotations : [...buttonAnnotations, ...arrowAnnotations],
        traces : buttonTraces,
      }      
    },
    data(): Plotly.Data[] {

      let traces : Plotly.Data[] = []

      traces.push({
        x: this.plotData.unhighlighted_x,
        y: this.plotData.unhighlighted_y,
        mode: 'lines',
        type: 'scatter',
        marker: { color: 'lightblue' }
      })
      
      traces.push({
        x: this.plotData.highlighted_x,
        y: this.plotData.highlighted_y,
        mode: 'lines',
        type: 'scatter',
        marker: { color: '#E4572E' }
      })

      traces.push({
        x: this.plotData.selected_x,
        y: this.plotData.selected_y,
        mode: 'lines',
        type: 'scatter',
        marker: { color: '#F3A712' }
      })



      if (this.args.title === "Deconvolved Spectrum") {
        const buttonTraces = this.annotationData.traces
        traces.push(...buttonTraces)
      }

      return traces
    },
    xRange(): number[] {
      if (this.xValues.length === 0) {
        return []
      }
      if (this.manual && (this.manual_xRange !== undefined)) {
        return this.manual_xRange
      }
      if (this.highlightedValues.length === 0) {
        return [Math.min(...this.xValues)*0.98, Math.max(...this.xValues)*1.02]
      }
      if ((this.args.title === "Annotated Spectrum") && (this.selectedMass !== undefined)) {
        return [Math.min(...this.highlightedValues[this.selectedMass].mzs)*0.98, Math.max(...this.highlightedValues[this.selectedMass].mzs)*1.02]
      }
      return [Math.min(...this.highlightedValues.map(a => a.mass))*0.98, Math.max(...this.highlightedValues.map(a => a.mass))*1.02]
    },
    yRange(): number[] {
      return this.computeYRange(this.xRange)
    },
    layout(): Partial<Plotly.Layout> {
      return {
        title: `<b>${this.args.title}</b>`,
        showlegend: false,
        height: 400,
        xaxis: {
          title: this.xAxisLabel,
          showgrid: false,
          range: this.xRange,
          showline: true,
          linecolor: 'grey',
          linewidth: 1,
        },
        yaxis: {
          title: 'Intensity',
          showgrid: true,
          gridcolor: this.theme?.secondaryBackgroundColor,
          rangemode: 'nonnegative',
          range: this.yRange,
          fixedrange: true,
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
        shapes: this.annotationData.shapes,
        annotations: this.annotationData.annotations
      }
    },
  },
  watch: {
    selectedScan() {
      this.manual = false
      this.args.title = 'Deconvolved Spectrum'
      this.selectedMass = undefined
      this.graph()
    },
    selectedTag() {
      this.manual = false
      this.args.title = 'Deconvolved Spectrum'
      this.selectedMass = undefined
      this.graph()
    },
    annotationData() {
      if (this.manual) {
        this.updateButtons(this.annotationData.shapes, this.annotationData.annotations)
      }
    },
  },
  mounted() {
    this.graph()
  },
  methods: {
    backButton() {
      this.args.title = 'Deconvolved Spectrum'
      this.selectedMass = undefined
      this.manual = false
      this.graph()
    },
    onPlotClick(eventData : any) {

      // Check if the click is within the button area
      if (eventData.points && eventData.points.length > 0) {
        const x = eventData.points[0].x;

        for (let i = 0; i < this.highlightedValues.length; i++) {
          if (x === this.highlightedValues[i].mass) {
            this.updateButtons([], [])
            this.selectedMass = i
            this.args.title = 'Annotated Spectrum'
            this.manual = false
            this.graph()
            break
          }
        }
      }
    },
    updateButtons(shapes : Partial<Plotly.Shape>[], annotations : Partial<Plotly.Annotations>[]) {
      Plotly.relayout(
        this.id, {
          shapes: shapes,
          annotations: annotations
        }
      )
    },
    onRelayout(eventData : any) {
      
      if (eventData['xaxis.range[0]'] !== undefined && eventData['xaxis.range[1]'] !== undefined) {
        const newXRange = [eventData['xaxis.range[0]'], eventData['xaxis.range[1]']]
        if (newXRange[0] < 0) {
          newXRange[0] = 0
        }
        this.manual = true
        this.manual_xRange = newXRange
        const newYRange = this.computeYRange(newXRange)
        Plotly.relayout(this.id, {'yaxis.range' : [newYRange[0], newYRange[1]]})
        Plotly.relayout(this.id, {'xaxis.range' : [newXRange[0], newXRange[1]]})
      }
      else if (eventData['xaxis.autorange'] === true) {
        this.onAutosize()
      }
    },
    onAutosize() {
      if (this.xValues.length === 0) {
        return
      }
      const newXRange = [Math.min(...this.xValues), Math.max(...this.xValues)]
      this.manual = true
      this.manual_xRange = newXRange
      const newYRange = this.computeYRange(newXRange)
      Plotly.relayout(this.id, {'yaxis.range' : [newYRange[0], newYRange[1]]})
    },
    computeYRange(xRange : number[]) : number[] {
      if (this.yValues.length === 0) {
        return []
      }

      let max : number = 0
      for (let i = 0; i < this.xValues.length; i++) {
        const xval = this.xValues[i]
        const yval = this.yValues[i]
        if ((xval <= xRange[0]) || (xval >= xRange[1])) {
          continue
        }
        if (yval > max) {
          max = yval
        }
      }
      if (max === 0) {
        return [0, 1]
      }
      return [0, max*1.8]
    },
    isHighlighted(value : number) : boolean {
      const pos = this.highlightedPos(value)
      if (pos !== undefined) {
        return true
      }
      return false
    },
    highlightedPos(value : number) : number | undefined {
      if (this.args.title === 'Annotated Spectrum') {
        const selectedMass = this.selectedMass
        if (selectedMass === undefined) {
          return undefined
        }
        const mzs = this.highlightedValues[selectedMass].mzs
        for (let j = 0; j < mzs.length; j++) {
          if (Math.abs(value - mzs[j]) <= 1e-5) {
            return selectedMass
          }
        }
      }
      else {
        for (let i = 0; i < this.highlightedValues.length; i++) {
          if (Math.abs(value - this.highlightedValues[i].mass) <= 1e-5) {
            return i
          }
        }      
      }
        
      return undefined
    },
    async graph() {
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
        ],
        scrollZoom: true 
      })
      plotInstance.on('plotly_relayout', (eventData) => {
        this.onRelayout(eventData);
      })
      plotInstance.on('plotly_click', (eventData) => {
        this.onPlotClick(eventData)
      })
    },
  },
})
</script>


<style scoped>
.plot-container {
  position: relative;
  width: 100%; /* Adjust as per your layout */
}

.simple-button {
  position: absolute;
  top: 17%; /* Adjust as per your layout */
  left: 6.5%; /* Adjust as per your layout */
  z-index: 1000;
  background-color: #f0f0f0; /* Background color of the button */
  border: none;
  border-radius: 50%; /* Makes the button round */
  width: 30px; /* Width of the button */
  height: 30px; /* Height of the button */
  text-align: center;
  line-height: 230%; /* Centers the '+' vertically */
  cursor: pointer;
}

.simple-button:hover {
  background-color: #e0e0e0; /* Slightly darker background on hover */
}
</style>
