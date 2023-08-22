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
      <PlotlyLineplot
        v-else-if="component.componentArgs.componentName === 'PlotlyLineplot'"
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
    </div>
  </div>
</template>

<script lang="ts">
import PlotlyHeatmap from '@/components/plotly/heatmap/PlotlyHeatmap.vue'
import TabulatorScanTable from '@/components/tabulator/TabulatorScanTable.vue'
import PlotlyLineplot from '@/components/plotly/lineplot/PlotlyLineplot.vue'
import Plotly3Dplot from '@/components/plotly/3Dplot/Plotly3Dplot.vue'
import TabulatorMassTable from '@/components/tabulator/TabulatorMassTable.vue'
import SequenceView from '@/components/sequence/SequenceView.vue'
import { defineComponent, type PropType } from 'vue'
import type { FlashViewerComponent } from '@/types/grid-layout'

export default defineComponent({
  name: 'ComponentsRow',
  components: {
    Plotly3Dplot,
    PlotlyHeatmap,
    TabulatorScanTable,
    PlotlyLineplot,
    TabulatorMassTable,
    SequenceView,
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
        TabulatorScanTable: 'height-1',
        TabulatorMassTable: 'height-1',
        PlotlyLineplot: 'height-1',
        PlotlyHeatmap: 'height-1',
        Plotly3Dplot: 'height-2',
        SequenceView: 'height-2',
      } as Record<FlashViewerComponent['componentArgs']['componentName'], 'height-1' | 'height-2'>,
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
      return index + this.rowIndex * 10
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
  height: 400px;
}

.height-2 {
  height: 800px;
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
