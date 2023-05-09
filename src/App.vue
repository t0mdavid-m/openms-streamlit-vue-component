<template>
  <div>
    <WithStreamlitConnection v-slot="{ args, theme }">
      <PlotlyHeatmap :args="args" :theme="theme" />
    </WithStreamlitConnection>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import WithStreamlitConnection from './components/streamlit/WithStreamlitConnection.vue'
import PlotlyHeatmap from './components/PlotlyHeatmap.vue'

export default defineComponent({
  name: 'App',
  components: {
    WithStreamlitConnection,
    PlotlyHeatmap
  }
})
</script>

<style scoped>
body {
  margin: 0;
}
</style>
