<template>
  <v-btn id="download-button" variant="text" size="large" icon="mdi-download" @click="triggerDownload"></v-btn>
  <v-tooltip text="Save as SVG" location="bottom" activator="#download-button"></v-tooltip>
  <a ref="downloadLink" style="visibility: hidden;"></a>
  <v-dialog v-model="svgDownloadTriggered" persistent width="auto">
    <v-card color="primary">
      <v-card-text>
        Please stand by
        <v-progress-linear indeterminate color="white" class="mb-0"></v-progress-linear>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import domtoimage from 'dom-to-image-more'
import { useStreamlitDataStore } from '@/stores/streamlit-data'

export default defineComponent({
  name: 'SvgScreenshot',
  props: {
    elementId: {
      type: String,
      required: true
    }
  },
  setup() {
    const streamlitDataStore = useStreamlitDataStore()
    return { streamlitDataStore }
  },
  data() {
    return {
      svgDownloadTriggered: false as boolean
    }
  },
  computed: {
    elementToScreenshot(): HTMLElement | null {
      return document.getElementById(this.elementId)
    }
  },
  watch: {
    svgDownloadTriggered(value) {
      if (value) setTimeout(this.downloadSvg, 200)
    }
  },
  methods: {
    triggerDownload() {
      this.svgDownloadTriggered = true
    },
    async downloadSvg() {
      if (this.elementToScreenshot) {
        await domtoimage.toSvg(this.elementToScreenshot, {
          filter(element: HTMLElement) {
            return (element.tagName !== 'BUTTON');
          },
          bgcolor: this.streamlitDataStore.theme?.backgroundColor ?? '#fff'
        }).then((dataUrl: string) => {
          const element = this.$refs.downloadLink as HTMLAnchorElement
          element.download = 'FLASHViewer-sequence.svg'
          element.href = dataUrl
          element.click()
        }).finally(() => {
          this.svgDownloadTriggered = false
        })
      }
    }
  },
})
</script>
