<template>
  <div class="d-flex justify-center"><h4>Sequence View</h4></div>

  <v-sheet class="pa-4 rounded-lg" style="max-width: 97%" :theme="theme?.base ?? 'light'" border>
    <div id="sequence-part">
      <div class="d-flex justify-space-evenly">
        <template v-if="precursorData.length != 0">
          <h3>Precursor</h3>
          <v-divider :vertical="true"></v-divider>
          <template v-for="(item, p_index) in precursorData" :key="p_index">
            {{ item }}
            <v-divider :vertical="true"></v-divider>
          </template>
        </template>
      </div>
      <div class="d-flex justify-end px-4 mb-4">
        <div>
          <SvgScreenshot element-id="sequence-part" />
          <SequenceViewInformation />
          <v-btn id="settings-button" variant="text" icon="mdi-cog" size="large"></v-btn>
          <v-menu :close-on-content-click="false" activator="#settings-button" location="bottom">
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
                <v-list-item>
                  <v-list-item-title>Fragment ion types</v-list-item-title>
                  <div class="d-flex justify-space-evenly">
                    <v-checkbox
                      v-for="(category, ionIndex) in ionTypes"
                      :key="category.text"
                      v-model="category.selected"
                      hide-details
                      density="comfortable"
                      :label="category.text"
                      @click="toggleIonTypeSelected(ionIndex)"
                    >
                    </v-checkbox>
                  </div>
                  <div class="d-flex justify-space-evenly">
                    <v-checkbox
                      v-for="(category, ionIndex) in ionTypesExtra"
                      :key="category.text"
                      v-model="category.selected"
                      hide-details
                      density="comfortable"
                      :label="category.text"
                      @click="toggleIonTypeExtraSelected(ionIndex)"
                    >
                    </v-checkbox>
                  </div>
                </v-list-item>
                <v-list-item>
                  <v-list-item-title>Fragment mass tolerance</v-list-item-title>
                  <v-text-field
                    v-model="fragmentMassTolerance"
                    type="number"
                    hide-details="auto"
                    label="mass tolerance in ppm"
                    @change="updateMassTolerance"
                  ></v-text-field>
                  <!-- TODO: add "required" -->
                </v-list-item>
              </v-list>
            </v-card>
          </v-menu>
        </div>
      </div>
      <div :class="gridClasses" style="width: 100%; max-width: 100%">
        <template v-for="(aminoAcidObj, aa_index) in sequenceObjects" :key="aa_index">
          <div
            v-if="aa_index !== 0 && aa_index % rowWidth === 0"
            class="d-flex justify-center align-center"
          >
            {{ aa_index + 1 }}
          </div>
          <ProteinTerminalCell v-if="aa_index === 0" protein-terminal="N-term" :index="-1" />
          <AminoAcidCell
            :index="aa_index"
            :sequence-object="aminoAcidObj"
            :fixed-modification="fixedModification(aminoAcidObj.aminoAcid)"
            @selected="aminoAcidSelected"
          />
          <div
            v-if="aa_index % rowWidth === rowWidth - 1 && aa_index !== sequence.length - 1"
            class="d-flex justify-center align-center"
          >
            {{ aa_index + 1 }}
          </div>
          <ProteinTerminalCell
            v-if="aa_index === sequence.length - 1"
            protein-terminal="C-term"
            :index="sequence.length"
          />
        </template>
      </div>
    </div>
    <div id="sequence-view-table">
      <template v-if="fragmentTableTitle !== ''">
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr">
          <!-- empty div in front of others for styling -->
          <div class="d-flex justify-center" style="grid-column: 2 / span 1">
            <h4>{{ fragmentTableTitle }}</h4>
          </div>
          <div class="d-flex justify-end" style="grid-column: 3 / span 1">
            <h4>% Residue cleavage: {{ residueCleavagePercentage.toFixed(3) }}%</h4>
          </div>
        </div>
        <TabulatorTable
          :table-data="fragmentTableData"
          :column-definitions="fragmentTableColumnDefinitions"
          :index="index"
          :selected-row-index-from-listening="selectedFragTableRowIndex"
        />
      </template>
    </div>
  </v-sheet>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useStreamlitDataStore } from '@/stores/streamlit-data'
import { useSelectionStore } from '@/stores/selection'
import { useModificationStore } from '@/stores/variable-modification'
import type { Theme } from 'streamlit-component-lib'
import TabulatorTable from '@/components/tabulator/TabulatorTable.vue'
import AminoAcidCell from './AminoAcidCell.vue'
import ProteinTerminalCell from './ProteinTerminalCell.vue'
import type { ColumnDefinition } from 'tabulator-tables'
import type { SequenceData } from '@/types/sequence-data'
import type { SequenceObject } from '@/types/sequence-object'
import SvgScreenshot from '../ui/SvgScreenshot.vue'
import SequenceViewInformation from '@/components/sequence/SequenceViewInformation.vue'
import { extraFragmentTypeObject } from '@/components/sequence/modification'

export default defineComponent({
  name: 'SequenceView',
  components: {
    SequenceViewInformation,
    TabulatorTable,
    AminoAcidCell,
    ProteinTerminalCell,
    SvgScreenshot,
  },
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
      ionTypesExtra: [
        { text: 'water loss', selected: true },
        { text: 'ammonium loss', selected: true },
        { text: 'proton loss/addition', selected: true },
      ] as { text: string; selected: boolean }[],
      fragmentMassTolerance: 10 as number,
      fragmentTableColumnDefinitions: [
        { title: 'Name', field: 'Name' },
        { title: 'Ion type', field: 'IonType' },
        { title: 'Ion number', field: 'IonNumber' },
        { title: 'Theoretical mass', field: 'TheoreticalMass' },
        {
          title: 'Observed mass',
          field: 'ObservedMass',
          formatter: (cell) => {
            return (cell.getValue() as number).toFixed(3)
          },
        },
        { title: 'Mass difference (Da)', field: 'MassDiffDa' },
        { title: 'Mass difference (ppm)', field: 'MassDiffPpm' },
      ] as ColumnDefinition[],
      fragmentTableData: [] as Record<string, unknown>[],
      fragmentTableTitle: '' as string,
      residueCleavagePercentage: 0 as number,
      sequenceObjects: [] as SequenceObject[],
      selectedFragTableRowIndex: undefined as number | undefined,
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
    calculateCleavagePercentage(): number {
      let explained_cleavage = 0
      for (let i = 0, end_site = this.sequenceObjects.length - 1; i < end_site; ++i) {
        const preAA = this.sequenceObjects[i]
        const postAA = this.sequenceObjects[i + 1]
        if (preAA.aIon || preAA.bIon || preAA.cIon || postAA.xIon || postAA.yIon || postAA.zIon) {
          ++explained_cleavage
        }
      }
      return (explained_cleavage / (this.sequenceObjects.length - 1)) * 100
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
    ionTypesExtra: {
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
    toggleIonTypeExtraSelected(index: number) {
      this.ionTypesExtra[index].selected = !this.ionTypesExtra[index].selected
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

      let theoreticalMass = this.theoreticalMass
      // if variable modification is added, update theoretical mass accordingly
      if (!this.variableModData.isEmpty) {
        this.variableModifications.valueOf()
        Object.values(this.variableModifications).forEach((varMass) => {
          theoreticalMass += varMass
        })
      }
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
                  if (sequence_size - parseInt(varIndex) <= theoIndex) {
                    theoretical_mass += varMass
                  }
                })
            }
            for (
              let obsIndex = 0, obsSize = observed_masses.length;
              obsIndex < obsSize;
              ++obsIndex
            ) {
              Object.entries(extraFragmentTypeObject).forEach(([typeName, typeValues]) => {
                // Mass difference = (observed-theoretical)/theoretical*1e6
                const thisTypeMass = theoretical_mass + (typeValues[1] as number)
                const massDiffDa = observed_masses[obsIndex] - thisTypeMass
                const massDiffPpm = (massDiffDa / thisTypeMass) * 1e6
                if (Math.abs(massDiffPpm) > this.fragmentMassTolerance) {
                  // if mass difference is larger than tolerance, ignore
                  return
                }

                const matched = {
                  Name: `${iontype.text}${theoIndex + 1}`,
                  IonType: `${iontype.text}${typeValues[0]}`,
                  IonNumber: theoIndex + 1,
                  TheoreticalMass: thisTypeMass.toFixed(3),
                  ObservedMass: observed_masses[obsIndex], // should not have "toFixed" to be used as comparison factor
                  MassDiffDa: massDiffDa.toFixed(3),
                  MassDiffPpm: massDiffPpm.toFixed(3),
                }
                matching_fragments.push(matched)
                // setting the fragment mark for fragment map
                let aa_index = theoIndex
                if (iontype.text === 'a' || iontype.text === 'b' || iontype.text === 'c')
                  this.sequenceObjects[aa_index][`${iontype.text}Ion`] = true
                if (iontype.text === 'x' || iontype.text === 'y' || iontype.text === 'z') {
                  this.sequenceObjects[sequence_size - theoIndex][`${iontype.text}Ion`] = true
                  aa_index = sequence_size - theoIndex
                }
                if (typeValues[0]) {
                  this.sequenceObjects[aa_index]['extraTypes'].push(
                    `${iontype.text}${typeValues[0]}`
                  )
                }
              })
            }
          }
        })
      this.residueCleavagePercentage = this.calculateCleavagePercentage
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
          extraTypes: [],
        })
      })
    },
    aminoAcidSelected(aaIndex: number) {
      let ionName = ''
      const this_seqObj = this.sequenceObjects[aaIndex]
      if (this_seqObj.aIon) {
        ionName = `a${aaIndex + 1}`
      } else if (this_seqObj.bIon) {
        ionName = `b${aaIndex + 1}`
      } else if (this_seqObj.cIon) {
        ionName = `c${aaIndex + 1}`
      } else if (this_seqObj.xIon) {
        ionName = `x${this.sequence.length - aaIndex}`
      } else if (this_seqObj.yIon) {
        ionName = `y${this.sequence.length - aaIndex}`
      } else {
        ionName = `z${this.sequence.length - aaIndex}`
      }
      // find matching fragments from the table
      this.selectedFragTableRowIndex = this.fragmentTableData.findIndex((x) => x.Name === ionName)
      // set observed mass in data store for the mass table
      this.selectionStore.selectedAminoAcid(
        this.fragmentTableData[this.selectedFragTableRowIndex].ObservedMass as number
      )
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
