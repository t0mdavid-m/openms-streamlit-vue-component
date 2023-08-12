<template>
  <div v-if="streamlitDataStore.args" :style="gridStyles">
    <div v-for="(component, index) in components" :key="index" :style="componentGridStyles(component.componentLayout)">
      <PlotlyHeatmap v-if="component.componentArgs.componentName === 'PlotlyHeatmap'" :args="component.componentArgs"
        :index="index" />
      <TabulatorScanTable v-else-if="component.componentArgs.componentName === 'TabulatorScanTable'"
        :args="component.componentArgs" :index="index" />
      <TabulatorMassTable v-else-if="component.componentArgs.componentName === 'TabulatorMassTable'"
        :args="component.componentArgs" :index="index" />
      <PlotlyLineplot v-if="component.componentArgs.componentName === 'PlotlyLineplot'" :args="component.componentArgs"
        :index="index" />
      <Plotly3Dplot v-if="component.componentArgs.componentName === 'Plotly3Dplot'" :args="component.componentArgs"
        :index="index" />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import PlotlyHeatmap from './components/plotly/heatmap/PlotlyHeatmap.vue'
import { useStreamlitDataStore } from './stores/streamlit-data'
import { Streamlit, type RenderData } from 'streamlit-component-lib'
import type { ComponentLayout } from './types/component-layout'
import type { FlashViewerComponent } from './types/grid-layout'
import TabulatorScanTable from './components/tabulator/TabulatorScanTable.vue'
import PlotlyLineplot from '@/components/plotly/lineplot/PlotlyLineplot.vue'
import Plotly3Dplot from '@/components/plotly/3Dplot/Plotly3Dplot.vue'
import TabulatorMassTable from './components/tabulator/TabulatorMassTable.vue'

export default defineComponent({
  name: 'App',
  components: {
    Plotly3Dplot,
    PlotlyHeatmap,
    TabulatorScanTable,
    PlotlyLineplot,
    TabulatorMassTable,
  },
  setup() {
    const streamlitDataStore = useStreamlitDataStore()

    return { streamlitDataStore }
  },
  computed: {
    components(): FlashViewerComponent[] {
      return this.streamlitDataStore.args?.components
    },
    gridStyles() {
      return {
        display: 'grid',
        'grid-template-columns': `repeat(${this.streamlitDataStore.args.columns ?? 1}, 1fr)`,
        'grid-template-rows': `repeat(${this.streamlitDataStore.args.rows ?? 1}, 1fr)`,
      }
    },
  },
  created() {
    Streamlit.setComponentReady()
    Streamlit.events.addEventListener(Streamlit.RENDER_EVENT, this.updateStreamlitData)
  },
  unmounted() {
    Streamlit.events.removeEventListener(Streamlit.RENDER_EVENT, this.updateStreamlitData)
  },
  updated() {
    Streamlit.setFrameHeight()
  },
  methods: {
    updateStreamlitData(event: EventTargetShim.Event): void {
      this.streamlitDataStore.updateRenderData((event as CustomEvent<RenderData>).detail)
    },
    componentGridStyles(componentLayout?: ComponentLayout) {
      return {
        'grid-column': `auto / span ${componentLayout?.width ?? 1}`,
        'grid-row': `auto / span ${componentLayout?.height ?? 1}`,
      }
    },
    setFrameHeight() {
      Streamlit.setFrameHeight()
    },
  },
})
</script>

<style>
body {
  margin: 0;
  font-family: 'Source Sans Pro', sans-serif;
}
</style>
