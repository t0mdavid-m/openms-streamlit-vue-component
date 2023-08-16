<template>
  <div class="component-layout">
    <div v-for="(componentRow, index) in componentRows" :key="index" class="component-row">
      <ComponentsRow :components="componentRow" :row-index="index" />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'
import ComponentsRow from './ComponentsRow.vue'
import type { FlashViewerComponent } from '@/types/grid-layout'
import type { ComponentLayout } from '@/types/component-layout'

export default defineComponent({
  name: 'ComponentsLayout',
  components: {
    ComponentsRow,
  },
  props: {
    components: {
      type: Object as PropType<FlashViewerComponent[]>,
      required: true,
    },
  },
  data() {
    return {
      columns: 6 as number,
    }
  },
  computed: {
    componentRows(): FlashViewerComponent[][] {
      const componentRows: FlashViewerComponent[][] = []
      let currentRowWidth: number = 0
      let currentRowComponents: FlashViewerComponent[] = []
      this.components.forEach((component) => {
        if (currentRowWidth + (component.componentLayout.width ?? 1) <= this.columns) {
          currentRowWidth = currentRowWidth + (component.componentLayout.width ?? 1)
          currentRowComponents.push(component)
        } else {
          componentRows.push([...currentRowComponents])
          currentRowWidth = component.componentLayout.width ?? 1
          currentRowComponents = [component]
        }
      })
      componentRows.push([...currentRowComponents])
      console.log(componentRows)
      return componentRows
    },
  },
  methods: {
    componentRowClasses(layout: ComponentLayout): Record<string, boolean> {
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

.component-row {
  display: flex;
  flex-direction: row;
  align-items: center;
}
</style>
