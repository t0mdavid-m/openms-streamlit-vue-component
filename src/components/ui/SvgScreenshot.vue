<template>
  <v-btn variant="text" size="large" icon="mdi-download" @click="downloadSvg"></v-btn>
  <a ref="downloadLink" style="visibility: hidden;"></a>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'
import { toSvg } from 'html-to-image'

export default defineComponent({
  name: 'SvgScreenshot',
  props: {
    elementId: {
      type: String,
      required: true
    }
  },
  computed: {
    elementToScreenshot(): HTMLElement | null {
      return document.getElementById(this.elementId)
    }
  },
  methods: {
    downloadSvg() {
      if (this.elementToScreenshot) {
        toSvg(this.elementToScreenshot, {
          filter(element) {
            return (element.tagName !== 'BUTTON');
          }
        }).then((dataUrl) => {
          const element = this.$refs.downloadLink as HTMLAnchorElement
          element.download = 'screenshot.svg'
          element.href = dataUrl
          element.click()
        })
      }
    }
  },
})
</script>
