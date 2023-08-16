<template>
  <div v-if="streamlitDataStore.args">
    <ComponentsLayout :components="components" />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useStreamlitDataStore } from './stores/streamlit-data'
import { Streamlit, type RenderData } from 'streamlit-component-lib'
import type { ComponentLayout } from './types/component-layout'
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

.tabulator-tooltip {
  background: #fff;
  color: #000;
}
</style>
