import type { PlotlyHeatmapArguments } from "../components/plotly/heatmap/plotly-heatmap";
import type { ComponentLayout } from "./component-layout";

export type FlashViewerComponent = {
  componentLayout: ComponentLayout
  componentArgs: PlotlyHeatmapArguments
}

export type GridLayout = {
  columns?: number
  rows?: number
  components: FlashViewerComponent[]
}