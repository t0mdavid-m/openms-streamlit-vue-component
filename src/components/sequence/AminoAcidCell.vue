<template>
  <div
    class="d-flex justify-center align-center rounded-lg"
    :class="aminoAcidCellClass"
    :style="aminoAcidCellStyles"
  >
    <div class="svg-container-b">
      <svg viewBox="0 0 10 10">
        <path v-if="sequenceObject.bIon" stroke="blue" d="M10, 0 V5 M10, 0 H5 z" stroke-width="3" />
      </svg>
    </div>
    <div class="svg-container-y">
      <svg viewBox="0 0 10 10">
        <path v-if="sequenceObject.yIon" stroke="blue" d="M0, 10 V5 M0, 10 H5 z" stroke-width="3" />
      </svg>
    </div>
    <div class="aa-text">
      {{ sequenceObject.aminoAcid }}
      <v-tooltip activator="parent">{{ sequenceObject.aminoAcid + (index + 1) }}</v-tooltip>
    </div>
    <v-menu
      v-model="menuOpen"
      activator="parent"
      location="end"
      :close-on-content-click="false"
      width="200px"
    >
      <v-list>
        <v-list-item>
          <v-select
            v-model="selectedModification"
            clearable
            label="Modification"
            density="compact"
            :items="modificationsForSelect"
            @update:modelValue="updateSelectedModificaion"
            @click:clear="updateSelectedModificaion(undefined)"
          >
          </v-select>
        </v-list-item>
      </v-list>
    </v-menu>
  </div>
</template>

<script lang="ts">
import { useStreamlitDataStore } from '@/stores/streamlit-data'
import type { SequenceObject } from '@/types/sequence-object'
import type { Theme } from 'streamlit-component-lib'
import type { PropType } from 'vue'
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'AminoAcidCell',
  props: {
    sequenceObject: {
      type: Object as PropType<SequenceObject>,
      required: true,
    },
    index: {
      type: Number,
      required: true,
    },
    fixedModification: {
      type: Boolean,
      default: false,
    },
    potentialModifications: {
      type: Array as PropType<string[]>,
      default: () => [],
    },
  },
  setup() {
    const streamlitData = useStreamlitDataStore()
    return { streamlitData }
  },
  data() {
    return {
      menuOpen: false,
      selectedModification: undefined as string | undefined,
    }
  },
  computed: {
    id(): string {
      return `${this.sequenceObject.aminoAcid}${this.index}`
    },
    theme(): Theme | undefined {
      return this.streamlitData.theme
    },
    modificationsForSelect(): string[] {
      if (this.potentialModifications.length === 0) return []
      return ['none', ...this.potentialModifications]
    },
    aminoAcidCellStyles(): Record<string, string> {
      return {
        '--amino-acid-cell-color': this.theme?.textColor ?? '#fff',
        '--amino-acid-cell-bg-color': this.theme?.secondaryBackgroundColor ?? '#000',
        '--amino-acid-cell-hover-color': '#fff',
        '--amino-acid-cell-hover-bg-color': this.theme?.backgroundColor ?? '#000',
        position: 'relative',
      }
    },
    aminoAcidCellClass(): Record<string, boolean> {
      return {
        'sequence-amino-acid': !this.fixedModification,
        'sequence-amino-acid-highlighted': this.fixedModification,
        'sequence-amino-acid-modified': this.selectedModification !== undefined,
      }
    },
  },
  methods: {
    updateSelectedModificaion(modification: string | undefined) {
      if (modification === 'none') {
        this.selectedModification = undefined
      } else {
        this.selectedModification = modification
      }
      this.menuOpen = false
      console.log(this.selectedModification, modification)
    },
  },
})
</script>

<style scoped lang="less">
.sequence-amino-acid {
  background-color: var(--amino-acid-cell-bg-color);
  color: var(--amino-acid-cell-color);

  &:hover {
    background-color: var(--amino-acid-cell-hover-bg-color);
    color: var(--amino-acid-cell-hover-color);
  }
}

.sequence-amino-acid-highlighted {
  background-color: var(--amino-acid-cell-bg-color);
  color: #9c1e1e;

  &:hover {
    background-color: var(--amino-acid-cell-hover-bg-color);
  }
}

.sequence-amino-acid-modified {
  background-color: #9c1e1e;
  color: var(--amino-acid-cell-color);

  &:hover {
    background-color: #ff1e1e;
  }
}

.svg-container {
  width: 100%;
  height: 100%;
  position: absolute;
  z-index: 1000;
}

.svg-container-b:extend(.svg-container) {
  top: -3px;
  left: 5px;
}

.svg-container-y:extend(.svg-container) {
  bottom: -3px;
  left: -5px;
}

.aa-text {
  position: absolute;
}
</style>
