<template>
  <div>
    <PlotlyHeatmap v-if="streamlitDataStore.renderData" />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import PlotlyHeatmap from './components/PlotlyHeatmap.vue'
import { useStreamlitDataStore } from './stores/streamlit-data'
import { Streamlit, type RenderData } from 'streamlit-component-lib'

export default defineComponent({
  name: 'App',
  components: {
    PlotlyHeatmap
  },
  setup() {
    const streamlitDataStore = useStreamlitDataStore()

    return { streamlitDataStore }
  },
  mounted() {
    Streamlit.events.addEventListener(Streamlit.RENDER_EVENT, this.updateStreamlitData)
    Streamlit.setComponentReady()
  },
  unmounted() {
    Streamlit.events.removeEventListener(Streamlit.RENDER_EVENT, this.updateStreamlitData)
  },
  methods: {
    updateStreamlitData(event: Event): void {
      console.log('got data')
      this.streamlitDataStore.updateRenderData((event as CustomEvent<RenderData>).detail)
    }
  }
})
</script>

<style scoped>
body {
  margin: 0;
}
</style>
