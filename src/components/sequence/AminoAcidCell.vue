<template>
  <div class="d-flex justify-center align-center rounded-lg" :class="aminoAcidCellClass(sequenceObject.aminoAcid)"
    :style="aminoAcidCellStyles">
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
  </div>
</template>

<script lang="ts">
import { useStreamlitDataStore } from '@/stores/streamlit-data';
import type { SequenceObject } from '@/types/sequence-object';
import type { Theme } from 'streamlit-component-lib';
import type { PropType } from 'vue';
import { defineComponent } from 'vue';
import IonMarker from './IonMarker.vue';

export default defineComponent({
  name: 'AminoAcidCell',
  components: {
    IonMarker
  },
  props: {
    sequenceObject: {
      type: Object as PropType<SequenceObject>,
      required: true
    },
    index: {
      type: Number,
      required: true
    },
    fixedModification: {
      type: Boolean,
      default: false
    }
  },
  setup() {
    const streamlitData = useStreamlitDataStore()
    return { streamlitData }
  },
  computed: {
    theme(): Theme | undefined {
      return this.streamlitData.theme
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
  },
  methods: {
    aminoAcidCellClass(aminoAcid: string): Record<string, boolean> {
      return {
        'sequence-amino-acid': !this.fixedModification,
        'sequence-amino-acid-highlighted': this.fixedModification,
      }
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