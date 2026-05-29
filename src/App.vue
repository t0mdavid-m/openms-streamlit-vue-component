<template>
  <div v-if="components !== undefined && components.length > 0">
    <ComponentsLayout :components="components" />
  </div>
  <div v-else class="d-flex w-100" style="height: 400px">
    <v-alert
      class="h-50 ma-16 pr-16"
      icon="mdi-application-variable-outline"
      title="FLASHViewer loading"
      type="info"
    >
      <v-progress-linear indeterminate></v-progress-linear>
      Please wait...
    </v-alert>
  </div>
</template>

<script lang="ts">
import { defineComponent, watch, toRaw } from 'vue'
import { useStreamlitDataStore } from './stores/streamlit-data'
import { useSelectionStore } from '@/stores/selection'
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
    const selectionStore = useSelectionStore()
    
    watch(
      selectionStore.$state,
      (newState) => {
        // Streamlit serializes the component value as JSON, which silently drops
        // keys whose value is `undefined`. A *cleared* selection (set back to
        // undefined) would therefore never reach Python, so the StateTracker keeps
        // echoing the stale value and the clear is lost (e.g. deselecting an amino
        // acid, or switching proteoform). Send `null` for undefined fields so the
        // cleared value round-trips; streamlit-data converts it back to undefined.
        const raw = toRaw(newState) as unknown as Record<string, unknown>
        const payload: Record<string, unknown> = {}
        for (const key in raw) {
          payload[key] = raw[key] === undefined ? null : raw[key]
        }
        Streamlit.setComponentValue(payload)
      },
      { deep: true, immediate: true }
    )
    return { streamlitDataStore, selectionStore }
  },
  data() {
    return {
      timer: undefined as NodeJS.Timer | undefined,
    }
  },
  computed: {
    components(): FlashViewerComponent[][] | undefined {
      return this.streamlitDataStore.args?.components
    },
  },
  created() {
    Streamlit.setComponentReady()
    Streamlit.setFrameHeight(500)
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
    async updateStreamlitData(event: Event): Promise<void> {
      this.streamlitDataStore.updateRenderData((event as CustomEvent<RenderData>).detail)
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
