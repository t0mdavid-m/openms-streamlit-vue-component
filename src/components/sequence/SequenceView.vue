<template>
  <div class="d-flex justify-center">
    <h4>Sequence View</h4>
  </div>

  <v-sheet class="pa-4 rounded-lg" style="max-width: 97%" :theme="theme?.base ?? 'light'" border>
    <div class="sequence-and-scale">
    <div id="sequence-part">
      <div class="d-flex justify-space-evenly">
        <template v-if="massData.length != 0">
          <h3>{{massTitle}}</h3>
          <v-divider :vertical="true"></v-divider>
          <template v-for="(item, p_index) in massData" :key="p_index">
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
                  <v-list-item-title>Visibility</v-list-item-title>
                  <div class="d-flex justify-space-evenly">
                    <v-checkbox
                      v-for="visibilityOption in visibilityOptions"
                      :key="visibilityOption.text"
                      v-model="visibilityOption.selected"
                      hide-details
                      density="comfortable"
                      :label="visibilityOption.text"
                    ></v-checkbox>
                  </div>
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
                      v-for="category in Object.keys(ionTypesExtra)"
                      :key="category"
                      v-model="ionTypesExtra[category as ExtraFragmentType]"
                      hide-details
                      density="comfortable"
                      :label="category"
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
      <div class="pb-4 px-2" :class="gridClasses" style="width: 100%; max-width: 100%">
        <template v-for="(aminoAcidObj, aa_index) in sequenceObjects" :key="aa_index">
          <div
            v-if="aa_index !== 0 && aa_index % rowWidth === 0"
            class="d-flex justify-center align-center"
          >
            {{ aa_index + 1 }}
          </div>
          <ProteinTerminalCell v-if="aa_index === 0" protein-terminal="N-term" :truncated=n_truncation :index="-1" />
          <AminoAcidCell
            :index="aa_index"
            :sequence-object="aminoAcidObj"
            :fixed-modification="fixedModification(aminoAcidObj.aminoAcid)"
            :disable-variable-modification-selection="disableVariableModifications"
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
            protein-terminal="C-term" :truncated=c_truncation
            :index="sequence.length"
          />
        </template>
      </div>
    </div>
    <div v-if="maxCoverage > 0" class="scale-container" title="Coverage">
      <div class="scale-text"> {{ maxCoverage + "x" }}</div>
      <div class="scale"></div>
      <div class="scale-text">1x</div>
    </div>
  </div>
    <div id="sequence-view-table">
      <template v-if="fragmentTableTitle !== ''">
        <TabulatorTable
          :table-data="fragmentTableData"
          :column-definitions="fragmentTableColumnDefinitions"
          :index="index"
          :selected-row-index-from-listening="selectedFragTableRowIndex"
          table-layout-param="fitColumns"
        >
          <template #default>{{ fragmentTableTitle }}</template>
          <template #end-title-row
            >% Residue cleavage: {{ residueCleavagePercentage.toFixed(3) }}%</template
          >
        </TabulatorTable>
      </template>
    </div>
  </v-sheet>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useStreamlitDataStore } from '@/stores/streamlit-data'
import { useSelectionStore, type TagData } from '@/stores/selection'
import { useModificationStore } from '@/stores/variable-modification'
import type { Theme } from 'streamlit-component-lib'
import type { ModificationData } from '@/types/sequence-data'
import TabulatorTable from '@/components/tabulator/TabulatorTable.vue'
import AminoAcidCell from './AminoAcidCell.vue'
import ProteinTerminalCell from './ProteinTerminalCell.vue'
import type { ColumnDefinition } from 'tabulator-tables'
import type { SequenceData } from '@/types/sequence-data'
import type { SequenceObject } from '@/types/sequence-object'
import SvgScreenshot from '../ui/SvgScreenshot.vue'
import SequenceViewInformation from '@/components/sequence/SequenceViewInformation.vue'
import { extraFragmentTypeObject, type ExtraFragmentType } from '@/components/sequence/modification'
import { toFixedFormatter } from '@/components/tabulator/tabulator-formatters'

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
      massData: [] as string[],
      massTitle: "" as string,
      ionTypes: [
        { text: 'a', selected: false },
        { text: 'b', selected: true },
        { text: 'c', selected: false },
        { text: 'x', selected: false },
        { text: 'y', selected: true },
        { text: 'z', selected: false },
      ] as { text: string; selected: boolean }[],
      ionTypesExtra: {
        'water loss': true,
        'ammonium loss': true,
        'proton loss/addition': true,
      } as Record<ExtraFragmentType, boolean>,
      fragmentMassTolerance: 10 as number,
      visibilityOptions: [
        { text: 'Fragments', selected: true },
        { text: 'Modifications', selected: true },
      ],
      fragmentTableColumnDefinitions: [
        { title: 'Name', field: 'Name' },
        { title: 'Ion type', field: 'IonType' },
        { title: 'Ion number', field: 'IonNumber' },
        { title: 'Theoretical mass', field: 'TheoreticalMass' },
        {
          title: 'Observed mass',
          field: 'ObservedMass',
          formatter: toFixedFormatter(),
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
    selectedSequence(): number | undefined {
      const pid = this.selectionStore.selectedProteinIndex
      if (typeof pid === 'number') {
        return pid
      }
      return 0
    },
    selectedTag(): TagData | undefined {
      return this.selectionStore.selectedTag
    },
    sequence(): string[] {
      let key = this.selectedSequence;
      if (key === undefined) {
        key = 0
      }
      return this.streamlitDataStore.sequenceData?.[key]?.sequence ?? []
    },
    sequence_start(): number {
      let key = this.selectedSequence;
      if (key === undefined) {
        key = 0
      }
      return this.streamlitDataStore.sequenceData?.[key]?.proteoform_start ?? 0
    },
    n_truncation(): boolean {
      return this.sequence_start > 0
    },
    sequence_end(): number {
      let key = this.selectedSequence;
      if (key === undefined) {
        key = 0
      }
      return this.streamlitDataStore.sequenceData?.[key]?.proteoform_end ?? this.sequence.length-1
    },
    c_truncation(): boolean {
      return this.sequence_end < (this.sequence.length - 1)
    },
    modifications(): ModificationData[] {
      let key = this.selectedSequence;
      if (key === undefined) {
        key = 0
      }
      return this.streamlitDataStore.sequenceData?.[key]?.modifications ?? []
    },
    coverage(): number[] {
      const key = this.selectedSequence;
      if (typeof key === 'number') {
        return this.streamlitDataStore.sequenceData?.[key]?.coverage ?? []
      }
      return []
    },
    maxCoverage() : number {
      const key = this.selectedSequence;
      if (typeof key === 'number') {
        return  this.streamlitDataStore.sequenceData?.[key]?.maxCoverage ?? -1
      }
      return -1
    },
    theoreticalMass(): number {
      let key = this.selectedSequence;
      if (key === undefined) {
        key = 0
      }
      return this.streamlitDataStore.sequenceData?.[key]?.theoretical_mass ?? 0
    },
    computedMass(): number | undefined {
      let key = this.selectedSequence;
      if (key === undefined) {
        key = 0
      }
      return this.streamlitDataStore.sequenceData?.[key]?.computed_mass
    },
    fixedModificationSites(): string[] {
      let key = this.selectedSequence;
      if (key === undefined) {
        key = 0
      }
      return this.streamlitDataStore.sequenceData?.[key]?.fixed_modifications ?? []
    },
    variableModifications(): Record<number, number> {
      return {}
      //return this.variableModData.variableModifications ?? {}
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
    selectedScanIndex(): number {
      if (this.selectionStore.selectedScanIndex !== undefined) {
        return this.selectionStore.selectedScanIndex
      }
      return 0
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
    disableVariableModifications(): boolean {
      if (this.displayTnT) {
        return true
      }
      return false
    },
    displayTnT(): boolean {
      if (this.computedMass !== undefined) {
        return true
      }
      return false
    },
  },
  watch: {
    selectedScanIndex() {
      this.preparePrecursorInfo()
      this.initializeSequenceObjects()
      this.prepareFragmentTable()
      this.prepareAmbigiousModifications()
    },
    sequence() {
      this.selectionStore.updateSelectedAA(undefined)
      this.preparePrecursorInfo()
      this.initializeSequenceObjects()
      this.prepareFragmentTable()
      this.prepareAmbigiousModifications()
    },
    selectedTag() {
      this.updateTagPosition()
    },
    fragmentMassTolerance() {
      this.prepareFragmentTable()
    },
    ionTypes: {
      handler() {
        this.initializeSequenceObjects()
        this.prepareFragmentTable()
        this.prepareAmbigiousModifications()
      },
      deep: true,
    },
    ionTypesExtra: {
      handler() {
        this.initializeSequenceObjects()
        this.prepareFragmentTable()
        this.prepareAmbigiousModifications()
      },
      deep: true,
    },
    variableModifications() {
      this.preparePrecursorInfo()
      this.initializeSequenceObjects()
      this.prepareFragmentTable()
      this.prepareAmbigiousModifications()
    },
  },
  mounted() {
    this.selectionStore.updateSelectedAA(undefined)
    this.initializeSequenceObjects()
    this.preparePrecursorInfo()
    this.prepareFragmentTable()
    this.prepareAmbigiousModifications()
  },
  methods: {
    getFragmentMasses(iontype: string): number[][] {
      let key = this.selectedSequence;
      if (key === undefined) {
        key = 0
      }
      return this.streamlitDataStore.sequenceData?.[key][
        `fragment_masses_${iontype}` as keyof SequenceData
      ] as number[][]
    },
    updateMassTolerance(event: Event) {
      this.fragmentMassTolerance = Number.parseInt((event.target as any).value as string)
    },
    toggleIonTypeSelected(index: number) {
      this.ionTypes[index].selected = !this.ionTypes[index].selected
    },
    preparePrecursorInfo(): void {
      if (this.selectedScanIndex == undefined) {
        this.massData = [] // if no scan is selected, nothing to show
        return
      }

      if (this.computedMass !== undefined) {
        console.log('this mass')
        console.log(this.computedMass)
        this.massTitle = 'Proteoform'
        let proteoform_mass = '-'
        let delta_mass = '-'
        if (this.computedMass > 0) {
          proteoform_mass = this.computedMass.toFixed(2)
          delta_mass = Math.abs(this.theoreticalMass - this.computedMass).toFixed(2)
        }


        this.massData = [
          `Theoretical protein mass : ${this.theoreticalMass.toFixed(2)}`,
          `Observed proteoform mass : ${proteoform_mass}`,
          `Δ Mass (Da) : ${delta_mass}`,
        ]

        this.visibilityOptions.push({ text: 'Tags', selected: true })
        return

      }

      const selectedScanInfo =
        this.streamlitDataStore.allDataForDrawing.per_scan_data[this.selectedScanIndex]
      const observedMass = selectedScanInfo.PrecursorMass as number
      if (observedMass === 0) {
        // if selected scan is not eligible for this view
        this.massData = []
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
      this.massTitle = 'Precursor'
      this.massData = [
        `Theoretical mass : ${theoreticalMass.toFixed(2)}`,
        `Observed mass : ${observedMass.toFixed(2)}`,
        `Δ Mass (Da) : ${deltaMassDa.toFixed(2)}`,
      ]
    },
    prepareFragmentTable(): void {

      if (this.sequence.length <= 0) {
        this.fragmentTableTitle = '' // if no sequence is selected, nothing to show
        return
      }

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
      const sequence_size = this.sequence_end

      this.ionTypes
        .filter((iontype) => iontype.selected)
        .forEach((iontype) => {
          const theoretical_frags = this.getFragmentMasses(iontype.text)

          for (
            let theoIndex = 0, FragSize = theoretical_frags.length;
            theoIndex < FragSize;
            ++theoIndex
          ) {
            const aaIndex = theoIndex + this.sequence_start
            let theoretical_mass = theoretical_frags[theoIndex]
              // if any variable modifications are given, change the theoretical mass accordingly
            if (!this.variableModData.isEmpty) {
              if (iontype.text === 'a' || iontype.text === 'b' || iontype.text === 'c')
                // if this is prefix, add modification mass starting from the theoretical index
                Object.entries(this.variableModifications).forEach(([varIndex, varMass]) => {
                  if (parseInt(varIndex) <= aaIndex) {
                    theoretical_mass += varMass
                  }
                })
              if (iontype.text === 'x' || iontype.text === 'y' || iontype.text === 'z')
                // if this is suffix, add modification mass string from the theoretical index (reverse)
                Object.entries(this.variableModifications).forEach(([varIndex, varMass]) => {
                  if (sequence_size - parseInt(varIndex) <= aaIndex) {
                    theoretical_mass += varMass
                  }
                })
            }
            const extraFragments = Object.entries(extraFragmentTypeObject)
              .filter(
                ([extraFragmentType]) =>
                  this.ionTypesExtra[extraFragmentType as ExtraFragmentType] ||
                  extraFragmentType === 'default'
              )
              .map(([_, extraFragment]) => extraFragment)
              .flat()
            for (
              let obsIndex = 0, obsSize = observed_masses.length;
              obsIndex < obsSize;
              ++obsIndex
            ) {
              extraFragments.forEach(({ typeName, typeMass }) => {
                // Mass difference = (observed-theoretical)/theoretical*1e6
                const thisTypeMass = theoretical_mass + typeMass
                const massDiffDa = observed_masses[obsIndex] - thisTypeMass
                const massDiffPpm = (massDiffDa / thisTypeMass) * 1e6
                if (Math.abs(massDiffPpm) > this.fragmentMassTolerance) {
                  // if mass difference is larger than tolerance, ignore
                  return
                }

                const matched = {
                  Name: `${iontype.text}${theoIndex + 1}`,
                  IonType: `${iontype.text}${typeName}`,
                  IonNumber: theoIndex + 1,
                  TheoreticalMass: thisTypeMass.toFixed(3),
                  ObservedMass: observed_masses[obsIndex], // should not have "toFixed" to be used as comparison factor
                  MassDiffDa: massDiffDa.toFixed(3),
                  MassDiffPpm: massDiffPpm.toFixed(3),
                }
                matching_fragments.push(matched)
                // setting the fragment mark for fragment map
                let aa_index = aaIndex
                if (iontype.text === 'a' || iontype.text === 'b' || iontype.text === 'c')
                  this.sequenceObjects[aa_index][`${iontype.text}Ion`] = true
                if (iontype.text === 'x' || iontype.text === 'y' || iontype.text === 'z') {
                  this.sequenceObjects[sequence_size - theoIndex][`${iontype.text}Ion`] = true
                  aa_index = sequence_size - theoIndex
                }
                if (typeName) {
                  this.sequenceObjects[aaIndex]['extraTypes'].push(`${iontype.text}${typeName}`)
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
      this.sequence.forEach((aa, index) => {
        const cov = this.coverage[index]
        let truncated = false
        if ((this.sequence_start > index) || (this.sequence_end < index)) {
          truncated = true
        }
        
        this.sequenceObjects.push({
          aminoAcid: aa,
          coverage: cov,
          truncated: truncated,
          aIon: false,
          bIon: false,
          cIon: false,
          xIon: false,
          yIon: false,
          zIon: false,
          tagStart: false,
          tagEnd : false,
          modStart : false,
          modEnd : false,
          modCenter : false,
          modMass : '',
          extraTypes: [],
        })
      })
    },
    aminoAcidSelected(aaIndex: number) {
      let ionName = ''
      const this_seqObj = this.sequenceObjects[aaIndex]
      if (this_seqObj.aIon) {
        ionName = `a${aaIndex - this.sequence_start + 1}`
      } else if (this_seqObj.bIon) {
        ionName = `b${aaIndex - this.sequence_start + 1}`
      } else if (this_seqObj.cIon) {
        ionName = `c${aaIndex - this.sequence_start + 1}`
      } else if (this_seqObj.xIon) {
        ionName = `x${this.sequence_end - aaIndex + 1}`
      } else if (this_seqObj.yIon) {
        ionName = `y${this.sequence_end - aaIndex + 1}`
      } else {
        ionName = `z${this.sequence_end - aaIndex + 1}`
      }
      // find matching fragments from the table
      this.selectedFragTableRowIndex = this.fragmentTableData.findIndex((x) => x.Name === ionName)
      // set observed mass in data store for the mass table
      this.selectionStore.selectedAminoAcid(
        this.fragmentTableData[this.selectedFragTableRowIndex].ObservedMass as number
      )
    },
    updateTagPosition() {
      if (this.sequenceObjects.length <= 0) {
        return
      }
      this.sequence.forEach((aa, index) => {
        const start = this.selectedTag?.startPos == index
        const end = this.selectedTag?.endPos == index
        this.sequenceObjects[index].tagStart = start
        this.sequenceObjects[index].tagEnd = end
      })
    },
    prepareAmbigiousModifications() {
      this.modifications.forEach((modification) => {
        const start = modification.start
        const end = modification.end
        const mass = modification.mass_diff.toFixed(2)
        const mass_display = parseFloat(mass).toLocaleString('en-US', { signDisplay: 'always' })
        for (let index = start; index <= end; index++) {
          if (index == start) {
            this.sequenceObjects[index].modStart = true
          }
          if (index == end) {
            this.sequenceObjects[index].modEnd = true
            this.sequenceObjects[index].modMass = mass_display
          }
          if ((index != start) && (index != end)) {
            this.sequenceObjects[index].modCenter = true
          }
        }
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

.sequence-and-scale {
    display: flex;
    align-items: center;
  }

  .scale-container {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  #sequence-part {
    flex-grow: 1;
  }

  .scale {
    width: 60px;
    height: 100px; /* Adjust the width as needed */
    background: linear-gradient(
      to top, 
      rgba(228, 87, 46, 0.1),
      rgba(228, 87, 46, 0.2) 10%,
      rgba(228, 87, 46, 0.4) 20%,
      rgba(228, 87, 46, 0.6) 40%,
      rgba(228, 87, 46, 0.8) 70%,
      rgba(228, 87, 46, 1) 100%
    );
  }

  .scale-text {
    text-align: center;
    font-size: 14pt;
    font-weight: bold;
  }
</style>
@/types/sequence-data