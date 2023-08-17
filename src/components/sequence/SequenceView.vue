<template>
  <div class="d-flex justify-space-evenly">
    <template v-if="precursorData.length != 0">
      <h3>Precursor</h3>
      <v-divider vertical></v-divider>
      <template v-for="(item, index) in precursorData" :key="index">
        {{ item }}
        <v-divider vertical></v-divider>
      </template>
    </template>
  </div>
  <div style="max-width: 97%">
    <div class="d-flex justify-end px-4 mb-4">
      <div>
        <v-btn id="settings-button" variant="text" icon="mdi-cog" size="large"></v-btn>
        <v-menu activator="#settings-button" location="bottom">
          <v-card min-width="300">
            <v-list>
              <v-list-item>
                <v-list-item-title># amino acids per row</v-list-item-title>
                <v-slider
                  v-model="rowWidth"
                  :ticks="tickLabels"
                  :min="20"
                  :max="40"
                  step="5"
                  show-ticks="always"
                  tick-size="4"
                ></v-slider>
              </v-list-item>
            </v-list>
          </v-card>
        </v-menu>
      </div>
    </div>
    <div :class="gridClasses" style="width: 100%; max-width: 100%">
      <template v-for="(aminoAcid, index) in sequence" :key="index">
        <div
          v-if="index !== 0 && index % rowWidth === 0"
          class="d-flex justify-center align-center"
        >
          {{ index + 1 }}
        </div>
        <div
          v-if="index === 0"
          class="d-flex justify-center align-center rounded-lg protein-terminal"
          :style="proteinTerminalCellStyles"
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
          v-if="index % rowWidth === rowWidth - 1 && index !== sequence.length - 1"
          class="d-flex justify-center align-center"
        >
          {{ index + 1 }}
        </div>
        <div
          v-if="index === sequence.length - 1"
          class="d-flex justify-center align-center rounded-lg protein-terminal"
          :style="proteinTerminalCellStyles"
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
  setup() {
    const streamlitDataStore = useStreamlitDataStore()
    const selectionStore = useSelectionStore()
    return { streamlitDataStore, selectionStore }
  },
  data() {
    return {
      rowWidth: 25 as number,
      precursorData: [] as string[],
    }
  },
  computed: {
    theme(): Theme | undefined {
      return this.streamlitDataStore.theme
    },
    sequence(): string[] {
      return this.streamlitDataStore.sequenceData?.sequence ?? []
    },
    theoreticalMass(): number {
      return this.streamlitDataStore.sequenceData?.theoretical_mass ?? 0
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
    selectedScanIndex(): number | undefined {
      return this.selectionStore.selectedScanIndex
    },
  },
  watch: {
    selectedScanIndex() {
      this.preparePrecursorInfo()
    },
  },
  methods: {
    preparePrecursorInfo(): void {
      let selectedScan = this.selectedScanIndex
      if (selectedScan == undefined) {
        this.precursorData = [] // if no scan is selected, nothing to show
        return
      }

      const selectedScanInfo = this.streamlitDataStore.allDataForDrawing.per_scan_data[selectedScan]
      const observedMass = selectedScanInfo.PrecursorMass as number
      if (observedMass === 0) {
        // if selected scan is not eligible for this view
        this.precursorData = []
        return
      }

      const theoreticalMass = this.theoreticalMass
      const deltaMassDa = Math.abs(theoreticalMass - observedMass)

      this.precursorData = [
        `Theoretical mass: ${theoreticalMass.toFixed(2)}`,
        `Observed mass :${observedMass.toFixed(2)}`,
        `Δ Mass (Da) :${deltaMassDa.toFixed(2)}`,
      ]
    },
  },
})
</script>

<style scoped lang="less">
.sequence-grid {
  display: grid;
  grid-template-rows: auto;
  gap: 4px 4px;

  > div {
    aspect-ratio: 1;
  }
}

.protein-terminal {
  &:hover {
    background-color: var(--amino-acid-cell-hover-bg-color);
    color: var(--amino-acid-cell-hover-color);
  }
}

.sequence-amino-acid {
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
