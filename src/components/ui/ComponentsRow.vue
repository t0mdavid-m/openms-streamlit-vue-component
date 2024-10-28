<template>
  <div class="component-row">
    <div
      v-for="(component, index) in components"
      :key="index"
      :class="componentClasses(component.componentArgs.componentName)"
    >
      <PlotlyHeatmap
        v-if="component.componentArgs.componentName === 'PlotlyHeatmap'"
        :args="component.componentArgs"
        :index="componentIndex(index)"
      />
      <TabulatorScanTable
        v-else-if="component.componentArgs.componentName === 'TabulatorScanTable'"
        :args="component.componentArgs"
        :index="componentIndex(index)"
      />
      <TabulatorMassTable
        v-else-if="component.componentArgs.componentName === 'TabulatorMassTable'"
        :args="component.componentArgs"
        :index="componentIndex(index)"
      />
      <TabulatorProteinTable
        v-else-if="component.componentArgs.componentName === 'TabulatorProteinTable'"
        :args="component.componentArgs"
        :index="componentIndex(index)"
      />
      <TabulatorTagTable
        v-else-if="component.componentArgs.componentName === 'TabulatorTagTable'"
        :args="component.componentArgs"
        :index="componentIndex(index)"
      />
      <PlotlyLineplot
        v-else-if="component.componentArgs.componentName === 'PlotlyLineplot'"
        :args="component.componentArgs"
        :index="componentIndex(index)"
      />
      <PlotlyLineplotTagger
        v-else-if="component.componentArgs.componentName === 'PlotlyLineplotTagger'"
        :args="component.componentArgs"
        :index="componentIndex(index)"
      />
      <Plotly3Dplot
        v-else-if="component.componentArgs.componentName === 'Plotly3Dplot'"
        :args="component.componentArgs"
        :index="componentIndex(index)"
      />
      <SequenceView
        v-else-if="component.componentArgs.componentName === 'SequenceView'"
        :index="componentIndex(index)"
      />
      <InternalFragmentMap
        v-else-if="component.componentArgs.componentName === 'InternalFragmentMap'"
        :index="componentIndex(index)"
      />
      <FLASHQuantView v-else-if="component.componentArgs.componentName === 'FLASHQuantView'" />

      <!-- New block added for FDRPlotly component -->
      <FDRPlotly
        v-else-if="component.componentArgs.componentName === 'FDRPlotly'"
        :args="component.componentArgs"
        :index="componentIndex(index)"
      />
      <!-- End of new block -->
    </div>
  </div>
</template>

<script lang="ts">
import PlotlyHeatmap from '@/components/plotly/heatmap/PlotlyHeatmap.vue'
import TabulatorScanTable from '@/components/tabulator/TabulatorScanTable.vue'
import PlotlyLineplot from '@/components/plotly/lineplot/PlotlyLineplot.vue'
import PlotlyLineplotTagger from '@/components/plotly/lineplot/PlotlyLineplotTagger.vue'
import Plotly3Dplot from '@/components/plotly/3Dplot/Plotly3Dplot.vue'
import TabulatorMassTable from '@/components/tabulator/TabulatorMassTable.vue'
import TabulatorProteinTable from '@/components/tabulator/TabulatorProteinTable.vue'
import TabulatorTagTable from '@/components/tabulator/TabulatorTagTable.vue'
import SequenceView from '@/components/sequence/SequenceView.vue'
import { defineComponent, type PropType } from 'vue'
import type { FlashViewerComponent } from '@/types/grid-layout'
import FLASHQuantView from '@/components/flashQuant/FLASHQuantView.vue'
import InternalFragmentMap from '@/components/sequence/InternalFragmentMap.vue'
// Add this line to import FDR_plotly
import FDRPlotly from '@/components/plotly/lineplot/FDR_plotly.vue'


export default defineComponent({
  name: 'ComponentsRow',
  components: {
    InternalFragmentMap,
    FLASHQuantView,
    Plotly3Dplot,
    PlotlyHeatmap,
    TabulatorScanTable,
    PlotlyLineplot,
    PlotlyLineplotTagger,
    TabulatorMassTable,
    TabulatorProteinTable,
    TabulatorTagTable,
    SequenceView,
    FDRPlotly, // Register the FDRPlotly
  },
  props: {
    components: {
      type: Object as PropType<FlashViewerComponent[]>,
      required: true,
    },
    rowIndex: {
      type: Number,
      required: true,
    },
  },
  data() {
    return {
      componentHeightMapping: {
        TabulatorScanTable: 'height-any',
        TabulatorMassTable: 'height-any',
        TabulatorProteinTable: 'height-any',
        TabulatorTagTable: 'height-any',
        PlotlyLineplot: 'height-any',
        PlotlyLineplotTagger: 'height-any',
        PlotlyHeatmap: 'height-any',
        Plotly3Dplot: 'height-any',
        SequenceView: 'height-any',
        InternalFragmentMap: 'height-any',
        FDRPlotly: 'height-any', // Added FDRPlotly height mapping
      } as Record<
        FlashViewerComponent['componentArgs']['componentName'],
        'height-1' | 'height-2' | 'height-any'
      >,
    }
  },
  methods: {
    componentClasses(
      componentName: FlashViewerComponent['componentArgs']['componentName']
    ): Record<string, boolean> {
      return {
        [this.componentHeightMapping[componentName]]: true,
        [`component-width-${this.components.length}`]: true,
      }
    },
    componentIndex(index: number): number {
      return index + this.rowIndex * 100
    },
  },
})
</script>

<style lang="less" scoped>
.component-row {
  display: flex;
  flex-direction: row;
  align-items: center;
}

.height-1 {
  min-height: 200px;
  height: fit-content;
  max-height: 400px;
}

.height-2 {
  min-height: 200px;
  height: fit-content;
  max-height: 800px;
}

.height-any {
  min-height: 200px;
  height: fit-content;
}

.component-width-1 {
  flex-basis: 100%;
  flex-grow: 0;
}

.component-width-2 {
  max-width: 50%;
  flex-basis: 50%;
  flex-grow: 0;
}

.component-width-3 {
  max-width: 33%;
  flex-basis: 33%;
  flex-grow: 0;
}
</style>
