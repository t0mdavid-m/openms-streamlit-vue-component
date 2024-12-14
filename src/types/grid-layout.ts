import type { TabulatorTableArguments } from '@/components/tabulator/tabulator-table'
import type { PlotlyHeatmapArguments } from '@/components/plotly/heatmap/plotly-heatmap'
import type { PlotlyLineArguments } from '@/components/plotly/lineplot/plotly-lineplot'
import type { Plotly3DplotArguments } from '@/components/plotly/3Dplot/plotly-3Dplot'
import type { SequenceViewArgs } from '@/components/sequence/sequence-view'
import type { InternalFragmentMapArgs } from '@/components/sequence/internal-fragment-map'
import type { ArrowTable } from 'streamlit-component-lib'

export type DATAFRAMES =
  | 'raw_heatmap_df'
  | 'deconv_heatmap_df'
  | 'per_scan_data'
  | 'sequence_data'
  | 'internal_fragment_data'
  | 'quant_data'
  | 'protein_table'
  | 'tag_table'
  | 'settings'

export type FlashViewerComponent = {
  componentArgs:
    | PlotlyHeatmapArguments
    | TabulatorTableArguments
    | PlotlyLineArguments
    | Plotly3DplotArguments
    | SequenceViewArgs
    | InternalFragmentMapArgs
}

export type StreamlitData = {
  raw_heatmap_df?: ArrowTable
  deconv_heatmap_df?: ArrowTable
  per_scan_data?: ArrowTable
  sequence_data?: any
  internal_fragment_data?: ArrowTable
  quant_data?: ArrowTable
  protein_table?: ArrowTable
  tag_table?: ArrowTable
  settings?: any
  components: FlashViewerComponent[][]
}