<template>
  <div class="component-layout">
    <template v-for="(componentRow, index) in components" :key="index">
      <ComponentsRow :components="componentRow" :row-index="index" />
    </template>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'
import ComponentsRow from './ComponentsRow.vue'
import type { FlashViewerComponent } from '@/types/grid-layout'

export default defineComponent({
  name: 'ComponentsLayout',
  components: {
    ComponentsRow,
  },
  props: {
    components: {
      type: Object as PropType<FlashViewerComponent[][]>,
      required: true,
    },
  },
  data() {
    return {
      columns: 6 as number,
    }
  },
  methods: {
    componentRowClasses(): Record<string, boolean> {
      return {
        '[`height-${layout.height ?? 1}`]': true,
        [`component-width-${this.components.length}`]: true,
      }
    },
  },
})
</script>

<style lang="less" scoped>
.component-layout {
  display: flex;
  flex-direction: column;
}
</style>
