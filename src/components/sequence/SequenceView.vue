<template>
  <div style="max-width: 95%">
    <v-slider
      :ticks="tickLabels"
      :min="20"
      :max="40"
      step="5"
      show-ticks="always"
      tick-size="4"
      v-model="rowWidth"
    ></v-slider>
    <div :class="gridClasses" style="width: 100% max-width: 100%">
      <template v-for="(aminoAcid, index) in sequence" :key="index">
        <div
          class="d-flex justify-center align-center sequence-count"
          v-if="index !== 0 && index % rowWidth === 0"
        >
          {{ index + 1 }}
        </div>
        <div
          class="d-flex justify-center align-center rounded-lg protein-terminal"
          :style="proteinTerminalCellStyles"
          v-if="index === 0"
        >
          N
          <v-tooltip activator="parent">N</v-tooltip>
        </div>
        <div
          class="d-flex justify-center align-center rounded-lg sequence-amino-acid"
          :style="aminoAcidCellStyles"
        >
          {{ aminoAcid }}
          <v-tooltip activator="parent">{{ aminoAcid + (index + 1) }}</v-tooltip>
        </div>
        <div
          class="d-flex justify-center align-center sequence-count"
          v-if="index % rowWidth === rowWidth - 1 && index !== sequence.length - 1"
        >
          {{ index + 1 }}
        </div>
        <div
          class="d-flex justify-center align-center rounded-lg protein-terminal"
          :style="proteinTerminalCellStyles"
          v-if="index === sequence.length - 1"
        >
          C
          <v-tooltip activator="parent">C</v-tooltip>
        </div>
      </template>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useStreamlitDataStore } from '@/stores/streamlit-data'
import { useSelectionStore } from '@/stores/selection'
import type { Streamlit, Theme } from 'streamlit-component-lib'

export default defineComponent({
  name: 'SequenceView',
  data() {
    return {
      rowWidth: 25 as number,
    }
  },
  setup() {
    const streamlitDataStore = useStreamlitDataStore()
    const selectionStore = useSelectionStore()
    return { streamlitDataStore, selectionStore }
  },
  computed: {
    theme(): Theme | undefined {
      return this.streamlitDataStore.theme
    },
    sequence(): string[] {
      return this.streamlitDataStore.sequenceData?.sequence ?? []
    },
    tickLabels(): Record<number, string> {
      return {
        20: '20',
        25: '25',
        30: '30',
        35: '35',
        40: '40',
      }
    },
    gridClasses(): Record<string, boolean> {
      return {
        'sequence-grid': true,
        [`grid-width-${this.rowWidth}`]: true,
      }
    },
    aminoAcidCellStyles(): Record<string, string> {
      return {
        '--amino-acid-cell-color': this.theme?.textColor ?? '#fff',
        '--amino-acid-cell-bg-color': this.theme?.secondaryBackgroundColor ?? '#000',
        '--amino-acid-cell-hover-color': '#fff',
        '--amino-acid-cell-hover-bg-color': this.theme?.backgroundColor ?? '#000',
      }
    },
    proteinTerminalCellStyles(): Record<string, string> {
      return {
        '--amino-acid-cell-hover-color': '#fff',
        '--amino-acid-cell-hover-bg-color': this.theme?.secondaryBackgroundColor ?? '#000',
      }
    },
  },
})
</script>

<style scoped lang="less">
.sequence-grid {
  display: grid;
  grid-template-rows: auto;
  gap: 4px 4px;
}

.sequence-count {
  aspect-ratio: 1;
}

.protein-terminal {
  aspect-ratio: 1;

  &:hover {
    background-color: var(--amino-acid-cell-hover-bg-color);
    color: var(--amino-acid-cell-hover-color);
  }
}

.sequence-amino-acid {
  aspect-ratio: 1;
  background-color: var(--amino-acid-cell-bg-color);
  color: var(--amino-acid-cell-color);

  &:hover {
    background-color: var(--amino-acid-cell-hover-bg-color);
    color: var(--amino-acid-cell-hover-color);
  }
}

.grid-width-20 {
  grid-template-columns: repeat(22, 1fr);
}

.grid-width-25 {
  grid-template-columns: repeat(27, 1fr);
}

.grid-width-30 {
  grid-template-columns: repeat(32, 1fr);
}

.grid-width-35 {
  grid-template-columns: repeat(37, 1fr);
}

.grid-width-40 {
  grid-template-columns: repeat(42, 1fr);
}
</style>
