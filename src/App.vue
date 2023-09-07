<template>
  <div v-if="streamlitDataStore.args">
    <ComponentsLayout :components="components" />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useStreamlitDataStore } from './stores/streamlit-data'
import { Streamlit, type RenderData } from 'streamlit-component-lib'
import type { FlashViewerComponent } from './types/grid-layout'
import ComponentsLayout from './components/ui/ComponentsLayout.vue'

export default defineComponent({
  name: 'App',
  components: {
    ComponentsLayout,
  },
  setup() {
    const streamlitDataStore = useStreamlitDataStore()

    return { streamlitDataStore }
  },
  data() {
    return {
      timer: undefined as NodeJS.Timer | undefined
    }
  },
  computed: {
    components(): FlashViewerComponent[][] {
      return this.streamlitDataStore.args?.components
    },
  },
  created() {
    Streamlit.setComponentReady()
    Streamlit.events.addEventListener(Streamlit.RENDER_EVENT, this.updateStreamlitData)
  },
  mounted() {
    this.timer = setInterval(() => {
      Streamlit.setFrameHeight()
    }, 500)
  },
  unmounted() {
    Streamlit.events.removeEventListener(Streamlit.RENDER_EVENT, this.updateStreamlitData)
    clearInterval(this.timer)
  },
  updated() {
    Streamlit.setFrameHeight()
  },
  methods: {
    updateStreamlitData(event: EventTargetShim.Event): void {
      this.streamlitDataStore.updateRenderData((event as CustomEvent<RenderData>).detail)
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

.tabulator-tooltip {
  background: #fff;
  color: #000;
}
</style>
