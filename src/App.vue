<template>
  <div :style="gridStyles" v-if="streamlitDataStore.args">
    <div v-for="component in components" :style="componentGridStyles(component.componentLayout)">
      <PlotlyHeatmap v-if="component.componentArgs.componentName === 'PlotlyHeatmap'" :args="component.componentArgs" />
      <TabulatorTable v-else-if="component.componentArgs.componentName === 'TabulatorTable'"
        :args="component.componentArgs" />
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
import TabulatorTable from './components/tabulator/TabulatorTable.vue'

export default defineComponent({
  name: 'App',
  components: {
    PlotlyHeatmap,
    TabulatorTable
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
        'grid-template-rows': `repeat(${this.streamlitDataStore.args.rows ?? 1}, 1fr)`
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
        'grid-row': `auto / span ${componentLayout?.height ?? 1}`
      }
    }
  }
})
</script>

<style scoped>
body {
  margin: 0;
}
</style>
