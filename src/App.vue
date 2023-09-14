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
    async updateStreamlitData(event: EventTargetShim.Event): Promise<void> {
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
