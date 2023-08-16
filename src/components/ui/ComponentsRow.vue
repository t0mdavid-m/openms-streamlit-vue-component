<template>
  <div
    v-for="(component, index) in components"
    :key="index"
    :class="componentClasses(component.componentLayout)"
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
    <SequenceView v-else-if="component.componentArgs.componentName === 'SequenceView'" />
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
import type { ComponentLayout } from '@/types/component-layout'
import { Streamlit } from 'streamlit-component-lib'

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
  methods: {
    componentClasses(layout: ComponentLayout): Record<string, boolean> {
      return {
        [`height-${layout.height ?? 1}`]: true,
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
.height-1 {
  height: 400px;
}

.height-2 {
  height: 800px;
}

.component-width-1 {
  flex-basis: 100%;
  flex-grow: 0;
  flex-grow: 0;
}

.component-width-2 {
  max-width: 50%;
  flex-basis: 50%;
  flex-grow: 0;
  flex-grow: 0;
}

.component-width-3 {
  max-width: 33%;
  flex-basis: 33%;
  flex-grow: 0;
  flex-grow: 0;
}
</style>
