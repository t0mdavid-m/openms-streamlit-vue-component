import type { TabulatorTableArguments } from '@/components/tabulator/tabulator-table'
import type { PlotlyHeatmapArguments } from '@/components/plotly/heatmap/plotly-heatmap'
import type { PlotlyLineArguments } from '@/components/plotly/lineplot/plotly-lineplot'
import type { Plotly3DplotArguments } from '@/components/plotly/3Dplot/plotly-3Dplot'
import type { SequenceViewArgs } from '@/components/sequence/sequence-view'
import type { InternalFragmentMapArgs } from '@/components/sequence/internal-fragment-map'

export type DATAFRAMES =
  | 'raw_heatmap_df'
  | 'deconv_heatmap_df'
  | 'per_scan_data'
  | 'sequence_data'
  | 'internal_fragment_data'
  | 'quant_data'

export type FlashViewerComponent = {
  componentArgs:
    | PlotlyHeatmapArguments
    | TabulatorTableArguments
    | PlotlyLineArguments
    | Plotly3DplotArguments
    | SequenceViewArgs
    | InternalFragmentMapArgs
}

export type GridLayout = {
  data_for_drawing: Record<DATAFRAMES, string>
  components: FlashViewerComponent[][]
}
