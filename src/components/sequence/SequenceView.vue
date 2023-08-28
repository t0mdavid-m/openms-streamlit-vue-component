<template>
  <div class="d-flex justify-space-evenly">
    <template v-if="precursorData.length != 0">
      <h3>Precursor</h3>
      <v-divider vertical="true"></v-divider>
      <template v-for="(item, p_index) in precursorData" :key="p_index">
        {{ item }}
        <v-divider vertical="true"></v-divider>
      </template>
    </template>
  </div>
  <div style="max-width: 97%">
    <div class="d-flex justify-end px-4 mb-4">
      <!-- TODO: add legend (fixed mod, etc) -->
      <div>
        <v-btn id="settings-button" variant="text" icon="mdi-cog" size="large"></v-btn>
        <v-menu :close-on-content-click="false" activator="#settings-button" location="bottom">
          <v-card min-width="300">
            <v-list>
              <v-list-item>
                <v-list-item-title># amino acids per row</v-list-item-title>
                <v-slider v-model="rowWidth" :ticks="tickLabels" :min="20" :max="40" step="5" show-ticks="always"
                  tick-size="4"></v-slider>
              </v-list-item>
              <v-list-item>
                <v-list-item-title>Fragment ion types</v-list-item-title>
                <v-layout row wrap>
                  <div class="d-flex">
                    <!-- TODO: why is there space between this and the next v-list-item? -->
                    <v-checkbox v-for="(category, ionIndex) in ionTypes" :key="category.text" v-model="category.selected"
                      light :label="category.text" @click="toggleIonTypeSelected(ionIndex)">
                    </v-checkbox>
                  </div>
                </v-layout>
              </v-list-item>
              <v-list-item>
                <v-list-item-title>Fragment mass tolerance</v-list-item-title>
                <v-text-field v-model="fragmentMassTolerance" type="number" hide-details="auto"
                  label="mass tolerance in ppm" @change="updateMassTolerance"></v-text-field>
                <!-- TODO: add "required" -->
              </v-list-item>
            </v-list>
          </v-card>
        </v-menu>
      </div>
    </div>
    <div :class="gridClasses" style="width: 100%; max-width: 100%">
      <template v-for="(aminoAcidObj, aa_index) in sequenceObjects" :key="aa_index">
        <div v-if="aa_index !== 0 && aa_index % rowWidth === 0" class="d-flex justify-center align-center">
          {{ aa_index + 1 }}
        </div>
        <div v-if="aa_index === 0" class="d-flex justify-center align-center rounded-lg protein-terminal"
          :style="proteinTerminalCellStyles">
          N
          <v-tooltip activator="parent">N</v-tooltip>
        </div>
        <AminoAcidCell :index="aa_index" :sequence-object="aminoAcidObj"
          :fixed-modification="fixedModification(aminoAcidObj.aminoAcid)" />
        <div v-if="aa_index % rowWidth === rowWidth - 1 && aa_index !== sequence.length - 1"
          class="d-flex justify-center align-center">
          {{ aa_index + 1 }}
        </div>
        <div v-if="aa_index === sequence.length - 1"
          class="d-flex justify-center align-center rounded-lg protein-terminal" :style="proteinTerminalCellStyles">
          C
          <v-tooltip activator="parent">C</v-tooltip>
        </div>
      </template>
    </div>
    <template v-if="fragmentTableTitle !== ''">
      <TabulatorTable :table-data="fragmentTableData" :column-definitions="fragmentTableColumnDefinitions"
        :title="fragmentTableTitle" :index="index" />
    </template>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useStreamlitDataStore } from '@/stores/streamlit-data'
import { useSelectionStore } from '@/stores/selection'
import { useModificationStore } from '@/stores/variable-modification'
import type { Theme } from 'streamlit-component-lib'
import TabulatorTable from '@/components/tabulator/TabulatorTable.vue'
import AminoAcidCell from './AminoAcidCell.vue'
import type { ColumnDefinition } from 'tabulator-tables'
import type { SequenceData } from '@/types/sequence-data'
import type { SequenceObject } from '@/types/sequence-object'

export default defineComponent({
  name: 'SequenceView',
  components: { TabulatorTable, AminoAcidCell },
  props: {
    index: {
      type: Number,
      required: true,
    },
  },
  setup() {
    const streamlitDataStore = useStreamlitDataStore()
    const selectionStore = useSelectionStore()
    const variableModData = useModificationStore()
    return { streamlitDataStore, selectionStore, variableModData }
  },
  data() {
    return {
      rowWidth: 35 as number,
      precursorData: [] as string[],
      ionTypes: [
        { text: 'a', selected: false },
        { text: 'b', selected: true },
        { text: 'c', selected: false },
        { text: 'x', selected: false },
        { text: 'y', selected: true },
        { text: 'z', selected: false },
      ] as { text: string; selected: boolean }[],
      fragmentMassTolerance: 10 as number,
      fragmentTableColumnDefinitions: [
        { title: 'Name', field: 'Name' },
        { title: 'Ion type', field: 'IonType' },
        { title: 'Ion number', field: 'IonNumber' },
        { title: 'Theoretical mass', field: 'TheoreticalMass' },
        { title: 'Observed mass', field: 'ObservedMass' },
        { title: 'Mass difference (Da)', field: 'MassDiffDa' },
        { title: 'Mass difference (ppm)', field: 'MassDiffPpm' },
      ] as ColumnDefinition[],
      fragmentTableData: [] as Record<string, unknown>[],
      fragmentTableTitle: '' as string,
      sequenceObjects: [] as SequenceObject[],
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
    fixedModificationSites(): string[] {
      return this.streamlitDataStore.sequenceData?.fixed_modifications ?? []
    },
    variableModifications(): Record<number, number> {
      return this.variableModData.variableModifications ?? {}
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
      this.initializeSequenceObjects()
      this.prepareFragmentTable()
    },
    fragmentMassTolerance() {
      this.prepareFragmentTable()
    },
    ionTypes: {
      handler() {
        this.initializeSequenceObjects()
        this.prepareFragmentTable()
      },
      deep: true,
    },
    variableModifications() {
      this.preparePrecursorInfo()
      this.initializeSequenceObjects()
      this.prepareFragmentTable()
    },
  },
  mounted() {
    this.initializeSequenceObjects()
    this.preparePrecursorInfo()
    this.prepareFragmentTable()
  },
  methods: {
    updateMassTolerance(event: Event) {
      this.fragmentMassTolerance = Number.parseInt((event.target as any).value as string)
    },
    toggleIonTypeSelected(index: number) {
      this.ionTypes[index].selected = !this.ionTypes[index].selected
    },
    preparePrecursorInfo(): void {
      if (this.selectedScanIndex == undefined) {
        this.precursorData = [] // if no scan is selected, nothing to show
        return
      }

      const selectedScanInfo =
        this.streamlitDataStore.allDataForDrawing.per_scan_data[this.selectedScanIndex]
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
    prepareFragmentTable(): void {
      if (this.selectedScanIndex == undefined) {
        this.fragmentTableTitle = '' // if no scan is selected, nothing to show
        return
      }

      const selectedScanInfo =
        this.streamlitDataStore.allDataForDrawing.per_scan_data[this.selectedScanIndex]
      const observedMass = selectedScanInfo.PrecursorMass as number
      if (observedMass === 0) {
        // if selected scan is not eligible for this view
        this.fragmentTableTitle = ''
        return
      }

      // get the observed mass table info
      const observed_masses = selectedScanInfo.MonoMass as number[]

      // calculate matching masses
      let matching_fragments: Record<string, unknown>[] = []
      const sequence_size = this.sequence.length - 1
      this.ionTypes
        .filter((iontype) => iontype.selected)
        .forEach((iontype) => {
          const theoretical_frags = this.streamlitDataStore.sequenceData?.[
            `fragment_masses_${iontype.text}` as keyof SequenceData
          ] as number[]

          for (
            let theoIndex = 0, FragSize = theoretical_frags.length;
            theoIndex < FragSize;
            ++theoIndex
          ) {
            let theoretical_mass = theoretical_frags[theoIndex]
            // if any variable modifications are given, change the theoretical mass accordingly
            if (!this.variableModData.isEmpty) {
              if (iontype.text === 'a' || iontype.text === 'b' || iontype.text === 'c')
                // if this is prefix, add modification mass starting from the theoretical index
                Object.entries(this.variableModifications).forEach(([varIndex, varMass]) => {
                  if (parseInt(varIndex) <= theoIndex) {
                    theoretical_mass += varMass
                  }
                })
              if (iontype.text === 'x' || iontype.text === 'y' || iontype.text === 'z')
                // if this is suffix, add modification mass string from the theoretical index (reverse)
                Object.entries(this.variableModifications).forEach(([varIndex, varMass]) => {
                  if ((sequence_size - parseInt(varIndex)) <= theoIndex) {
                    theoretical_mass += varMass
                  }
                })
            }
            for (
              let obsIndex = 0, obsSize = observed_masses.length;
              obsIndex < obsSize;
              ++obsIndex
            ) {
              // Mass difference = (observed-theoretical)/theoretical*1e6
              const massDiffDa = observed_masses[obsIndex] - theoretical_mass
              const massDiffPpm = (massDiffDa / theoretical_mass) * 1e6
              if (Math.abs(massDiffPpm) > this.fragmentMassTolerance) {
                // if mass difference is larger than tolerance, ignore
                continue
              }
              const matched = {
                Name: `${iontype.text}${theoIndex + 1}`,
                IonType: iontype.text,
                IonNumber: theoIndex + 1,
                TheoreticalMass: theoretical_mass.toFixed(3),
                ObservedMass: observed_masses[obsIndex].toFixed(3),
                MassDiffDa: massDiffDa.toFixed(3),
                MassDiffPpm: massDiffPpm.toFixed(3),
              }
              matching_fragments.push(matched)
              // setting the fragment mark for fragment map
              if (iontype.text === 'a' || iontype.text === 'b' || iontype.text === 'c')
                this.sequenceObjects[theoIndex][`${iontype.text}Ion`] = true
              if (iontype.text === 'x' || iontype.text === 'y' || iontype.text === 'z')
                this.sequenceObjects[sequence_size - theoIndex][`${iontype.text}Ion`] = true
            }
          }
        })

      this.fragmentTableData = matching_fragments
      this.fragmentTableTitle = `Matching fragments (# ${matching_fragments.length})`
    },
    fixedModification(aminoAcid: string): boolean {
      return this.fixedModificationSites.includes(aminoAcid)
    },
    initializeSequenceObjects(): void {
      this.sequenceObjects = []
      this.sequence.forEach((aa) => {
        this.sequenceObjects.push({
          aminoAcid: aa,
          aIon: false,
          bIon: false,
          cIon: false,
          xIon: false,
          yIon: false,
          zIon: false,
        })
      })
    },
  },
})
</script>

<style scoped lang="less">
.sequence-grid {
  display: grid;
  grid-template-rows: auto;
  gap: 4px 4px;

  >div {
    aspect-ratio: 1;
  }
}

.protein-terminal {
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
