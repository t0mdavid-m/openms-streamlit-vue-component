import type { TabulatorTableArguments } from '@/components/tabulator/tabulator-table'
import type { PlotlyHeatmapArguments } from '../components/plotly/heatmap/plotly-heatmap'
import type { ComponentLayout } from './component-layout'
import type { PlotlyLineArguments } from "@/components/plotly/lineplot/plotly-lineplot";
import type { Plotly3DplotArguments } from "@/components/plotly/3Dplot/plotly-3Dplot";

export type FlashViewerComponent = {
  componentLayout: ComponentLayout
  componentArgs: PlotlyHeatmapArguments | TabulatorTableArguments | PlotlyLineArguments | Plotly3DplotArguments
}

export type GridLayout = {
  columns?: number
  rows?: number
  components: FlashViewerComponent[]
}
