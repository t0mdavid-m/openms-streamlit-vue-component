import type { TabulatorTableArguments } from '@/components/tabulator/tabulator-table'
import type { PlotlyHeatmapArguments } from '../components/plotly/heatmap/plotly-heatmap'
import type { ComponentLayout } from './component-layout'
import type {PlotlyLineArguments} from "@/components/plotly/lineplot/plotly-lineplot";

export type FlashViewerComponent = {
  componentLayout: ComponentLayout
  componentArgs: PlotlyHeatmapArguments | TabulatorTableArguments | PlotlyLineArguments
}

export type GridLayout = {
  columns?: number
  rows?: number
  components: FlashViewerComponent[]
}
