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
          <v-btn
            variant="text"
            icon="mdi-content-copy"
            size="large"
            :disabled="sequence.length === 0"
            @click="copySequence"
          >
            <v-icon>mdi-content-copy</v-icon>
            <v-tooltip activator="parent" location="bottom">
              Copy sequence to clipboard
            </v-tooltip>
          </v-btn>
          <v-btn
            v-if="shouldShowSequenceChangeButton"
            variant="text"
            icon="mdi-dna"
            size="large"
            @click="openSequenceDialog"
          >
            <v-icon>mdi-dna</v-icon>
            <v-tooltip activator="parent" location="bottom">
              Change sequence
            </v-tooltip>
          </v-btn>
          <v-btn
            variant="text"
            icon="mdi-magnify"
            size="large"
            :disabled="sequence.length === 0"
            @click="toggleRegexHighlight"
          >
            <v-icon>mdi-magnify</v-icon>
            <v-tooltip activator="parent" location="bottom">
              {{ showRegexHighlight ? 'Hide regex highlighting' : 'Show regex highlighting' }}
            </v-tooltip>
          </v-btn>
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
                  <v-list-item-title>Font Size</v-list-item-title>
                  <v-slider
                    v-model="fontSize"
                    :ticks="fontSizeTickLabels"
                    :min="8"
                    :max="16"
                    step="2"
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
                      :disabled="!showFragments"
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
                      :disabled="!showFragments"
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
                    :disabled="!showFragments"
                    @change="updateMassTolerance"
                  ></v-text-field>
                  <!-- TODO: add "required" -->
                </v-list-item>
              </v-list>
            </v-card>
          </v-menu>
        </div>
      </div>
      <!-- Regex highlighting input -->
      <div v-if="showRegexHighlight" class="pb-4 px-4">
        <v-card variant="outlined" class="pa-3">
          <v-row align="center">
            <v-col cols="12" md="8">
              <v-text-field
                v-model="regexPattern"
                label="Regex pattern for highlighting"
                placeholder="e.g., A+, [KR], M.*L"
                :error-messages="regexError"
                hide-details="auto"
                density="compact"
                @input="onRegexInput"
              >
                <template #prepend-inner>
                  <v-icon>mdi-regex</v-icon>
                </template>
              </v-text-field>
            </v-col>
            <v-col cols="12" md="4">
              <div v-if="regexHighlightedIndices.size > 0" class="text-caption text-medium-emphasis">
                {{ regexHighlightedIndices.size }} cells highlighted
              </div>
              <div v-else-if="regexPattern && !regexError" class="text-caption text-medium-emphasis">
                No matches found
              </div>
            </v-col>
          </v-row>
        </v-card>
      </div>
      <div class="pb-4 px-2" :class="gridClasses" style="width: 100%; max-width: 100%">
        <template v-for="(aminoAcidObj, aa_index) in sequenceObjects" :key="aa_index">
          <div
            v-if="(showTruncations && (aa_index !== 0) && (aa_index % rowWidth === 0)) || (!showTruncations && ((aa_index - sequence_start) !== 0) && ((aa_index - sequence_start) % rowWidth === 0) && (aa_index < sequence_end) && (aa_index > sequence_start))"
            class="d-flex justify-center align-center"
          >
          {{ showTruncations ? aa_index + 1 : aa_index - sequence_start + 1 }}
          </div>
          <ProteinTerminalCell v-if="aa_index === 0" protein-terminal="N-term" :truncated=n_truncation :index="-1" :disable-variable-modification-selection="disableVariableModifications" :determined="n_determined" :font-size="fontSize"/>
          <AminoAcidCell
            v-if="showTruncations || ((sequence_start <= aa_index) && (sequence_end >= aa_index))"
            :index="aa_index"
            :sequence-object="aminoAcidObj"
            :fixed-modification="fixedModification(aminoAcidObj.aminoAcid)"
            :disable-variable-modification-selection="disableVariableModifications"
            :show-tags="showTags"
            :show-fragments="showFragments"
            :show-modifications="showModifications"
            :font-size="fontSize"
            :is-regex-highlighted="regexHighlightedIndices.has(aa_index)"
            @selected="aminoAcidSelected"
          />
          <div
            v-if="(showTruncations && (aa_index % rowWidth === rowWidth - 1 && aa_index !== sequence.length - 1)) || (!showTruncations && ((aa_index - sequence_start) % rowWidth === rowWidth - 1) && (aa_index < sequence_end) && (aa_index > sequence_start))"
            class="d-flex justify-center align-center"
          >
            {{ showTruncations ? aa_index + 1 : aa_index - sequence_start + 1 }}
          </div>
          <ProteinTerminalCell
            v-if="aa_index === sequence.length - 1"
            protein-terminal="C-term" :truncated=c_truncation
            :index="sequence.length"
            :disable-variable-modification-selection="disableVariableModifications"
            :determined="c_determined"
            :font-size="fontSize"
          />
          </template>
      </div>
    </div>
    <div v-if="(maxCoverage > 0) && showTags" class="scale-container" title="Sequence Tag Coverage">
      <div class="scale-text"> {{ maxCoverage + "x" }}</div>
      <div class="scale"></div>
      <div class="scale-text">1x</div>
    </div>
  </div>
    <div id="sequence-view-table">
      <template v-if="(fragmentTableTitle !== '') && showFragments">
        <TabulatorTable
          :table-data="fragmentTableData"
          :column-definitions="fragmentTableColumnDefinitions"
          :index="index"
          :selected-row-index-from-listening="selectedFragTableRowIndex"
          :go-to-fields="['Name']"
          table-layout-param="fitColumns"
          @row-selected="onFragmentTableRowSelected"
        >
          <template #default>{{ fragmentTableTitle }}</template>
          <template #end-title-row
            >% Residue cleavage: {{ residueCleavagePercentage.toFixed(3) }}%</template
          >
        </TabulatorTable>
      </template>
    </div>
  </v-sheet>
  
  <v-snackbar
    v-model="copySnackbar"
    :timeout="3000"
    location="bottom"
  >
    {{ copySnackbarText }}
    <template #actions>
      <v-btn
        color="blue"
        variant="text"
        @click="copySnackbar = false"
      >
        Close
      </v-btn>
    </template>
  </v-snackbar>

  <!-- Sequence Input Dialog -->
  <v-dialog v-model="sequenceDialog" max-width="600" persistent>
    <v-card>
      <v-card-title class="text-h6">
        Enter Custom Sequence
      </v-card-title>
      <v-card-text>
        <v-textarea
          v-model="customSequenceInput"
          label="Protein Sequence"
          placeholder="Enter amino acid sequence (e.g., MKFLVNVALVF...)"
          :error-messages="sequenceInputError"
          rows="6"
          auto-grow
          counter
          hint="Enter single-letter amino acid codes only"
          persistent-hint
        >
          <template #prepend-inner>
            <v-icon>mdi-dna</v-icon>
          </template>
        </v-textarea>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn
          variant="text"
          @click="closeSequenceDialog"
        >
          Cancel
        </v-btn>
        <v-btn
          color="primary"
          variant="elevated"
          @click="submitCustomSequence"
        >
          Apply Sequence
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
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
      fontSize: 12 as number,
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
        'water loss': false,
        'ammonium loss': false,
        'proton loss/addition': false,
      } as Record<ExtraFragmentType, boolean>,
      fragmentMassTolerance: 10 as number,
      visibilityOptions: [
        { text: 'Fragments', selected: true },
        { text: 'Modifications', selected: true },
      ] as { text: string; selected: boolean }[],
      fragmentTableColumnDefinitions: [
        {
          title: 'Name', field: 'Name',
            headerTooltip: 'The name of the fragment ion, represented in Biemann notation.'
        },
        {
          title: 'Ion type', field: 'IonType',
          headerTooltip: 'The type of fragment ion identified in the spectrum.'
        },
        {
          title: 'Ion number', field: 'IonNumber', sorter: 'number',
          headerTooltip: 'The position of the fragment ion within the sequence.'
        },
        {
          title: 'Theoretical mass', field: 'TheoreticalMass', sorter: 'number',
          headerTooltip: 'The expected mass of the fragment ion.'
        },
        {
          title: 'Observed mass', field: 'ObservedMass', formatter: toFixedFormatter(), sorter: 'number',
          headerTooltip: 'The mass of the fragment ion as observed in the spectrum.'
        },
        {
          title: 'Mass difference (Da)', field: 'MassDiffDa', sorter: 'number',
          headerTooltip: 'The difference between the observed and theoretical masses of the fragment ion, in Daltons.'
        },
        {
          title: 'Mass difference (ppm)', field: 'MassDiffPpm', sorter: 'number',
          headerTooltip: 'The difference between the observed and theoretical masses of the fragment ion, in parts per million (ppm).'
        },
      ] as ColumnDefinition[],
      fragmentTableData: [] as Record<string, unknown>[],
      fragmentTableTitle: '' as string,
      residueCleavagePercentage: 0 as number,
      sequenceObjects: [] as SequenceObject[],
      selectedFragTableRowIndex: undefined as number | undefined,
      copySnackbar: false as boolean,
      copySnackbarText: '' as string,
      _updatingFromMass: false as boolean,
      _updatingFromFragment: false as boolean,
      showRegexHighlight: false as boolean,
      regexPattern: '' as string,
      regexError: '' as string,
      regexHighlightedIndices: new Set<number>(),
      // Sequence change dialog properties
      sequenceDialog: false as boolean,
      customSequenceInput: '' as string,
      sequenceInputError: '' as string,
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
    sequence_start_reported(): number {
      let key = this.selectedSequence;
      if (key === undefined) {
        key = 0
      }
      return this.streamlitDataStore.sequenceData?.[key]?.proteoform_start ?? 0
    },
    sequence_start(): number {
      if (this.sequence_start_reported < 0)
      {
        return 0
      }
      return this.sequence_start_reported
    },
    n_truncation(): boolean {
      return this.sequence_start > 0
    },
    n_determined(): boolean {
      return this.sequence_start_reported >= 0
    },
    sequence_end_reported(): number {
      let key = this.selectedSequence;
      if (key === undefined) {
        key = 0
      }
      return this.streamlitDataStore.sequenceData?.[key]?.proteoform_end ?? this.sequence.length-1
    },
    sequence_end(): number {
      if (this.sequence_end_reported < 0) {
        return this.sequence.length-1
      }
      return this.sequence_end_reported
    },
    c_truncation(): boolean {
      return this.sequence_end < (this.sequence.length - 1)
    },
    c_determined(): boolean {
      return this.sequence_end_reported >= 0
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
      // return {}
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
    fontSizeTickLabels(): Record<number, string> {
      return {
        8: '8',
        10: '10',
        12: '12',
        14: '14',
        16: '16',
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
      if (this.selectionStore.selectedScanIndex !== undefined) {
        if (this.streamlitDataStore.allDataForDrawing.per_scan_data.length === 1) {
          return 0
        }
        return this.selectionStore.selectedScanIndex
      }
      return undefined
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
      return (explained_cleavage / (this.sequence_end - this.sequence_start)) * 100
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
    showTags(): boolean {
      if (!this.displayTnT) {
        return false
      }
      if (this.visibilityOptions.find(option => option.text === 'Tags')?.selected) {
        return true
      }
      return false
    },
    showTruncations(): boolean {
      if (!this.displayTnT) {
        return false
      }
      if (this.visibilityOptions.find(option => option.text === 'Truncations')?.selected) {
        return true
      }
      return false
    },
    showModifications(): boolean {
      if (this.visibilityOptions.find(option => option.text === 'Modifications')?.selected) {
        return true
      }
      return false
    },
    showFragments(): boolean {
      if (this.visibilityOptions.find(option => option.text === 'Fragments')?.selected) {
        return true
      }
      return false
    },
    // Sequence change button computed properties
    shouldShowSequenceChangeButton(): boolean {
      return !this.displayTnT
    },
  },
  watch: {
    // ADDED — freeze fix. A FLASHDeconv scan change replaces only the (always
    // single-row) per_scan_data array reference; selectedScanIndex is pinned at 0
    // (length === 1) and `sequence` is constant (key 0), so this is the only
    // observable change and the only path to recompute ion markers. updateRenderData
    // replaces dataForDrawing wholesale on a hash change, so a shallow path-watch
    // fires reliably (no deep needed); render.py hashes the filtered data before
    // attaching selection_store, so pure mass/AA/tag highlights leave the hash
    // unchanged and do not over-fire. Mirrors PlotlyLineplotUnified.vue.
    'streamlitDataStore.allDataForDrawing.per_scan_data': {
      handler() {
        this.recomputeFragments()
      },
    },
    // KEPT — sole trigger for FLASHDeconv custom-sequence entry; also uniquely clears
    // the stale AA selection and re-pulls settings. Primary FLASHTnT protein-switch
    // trigger (sequence_data is re-keyed by proteinIndex).
    sequence() {
      this.selectionStore.updateSelectedAA(undefined)
      this.recomputeFragments()
      this.updateSettings()
    },
    // KEPT — FLASHTnT tag overlay; also clears tag marks when a protein switch resets
    // tagData to undefined.
    selectedTag() {
      this.updateTagPosition()
    },
    // KEPT — re-match fragments on a tolerance change (local state, no round-trip).
    fragmentMassTolerance() {
      this.recomputeFragments()
    },
    // KEPT — ion-type a/b/c/x/y/z toggles (both tools). deep required (nested .selected).
    ionTypes: {
      handler() {
        this.initializeSequenceObjects()
        this.prepareFragmentTable()
        this.prepareAmbigiousModifications()
      },
      deep: true,
    },
    // KEPT — extra fragment-type toggles (both tools). deep required (nested key).
    ionTypesExtra: {
      handler() {
        this.initializeSequenceObjects()
        this.prepareFragmentTable()
        this.prepareAmbigiousModifications()
      },
      deep: true,
    },
    // KEPT — FLASHDeconv variable modifications (local store; inert in FLASHTnT).
    variableModifications() {
      this.recomputeFragments()
    },
    // KEPT — mass-table selection -> highlight the matching fragment row (loop-guarded).
    'selectionStore.selectedMassIndex': {
      handler(newMassIndex: number | null) {
        if (newMassIndex !== null) {
          this.updateFragmentTableFromMassSelection(newMassIndex);
        }
      },
      immediate: false
    }
    // DROPPED: selectedScanIndex — dead in both tools (computed pinned at 0 by the
    //          length === 1 short-circuit); it was the freeze, not a fix. Its only
    //          undefined->0 first-selection transition is now covered by the
    //          per_scan_data empty->1-row reference change.
    // DROPPED: fontSize — debug console.log + redundant $forceUpdate(); fontSize is
    //          already reactive via v-model and the :font-size prop -> CSS var.
  },
  mounted() {
    this.selectionStore.updateSelectedAA(undefined)
    this.recomputeFragments()
  },
  methods: {
    // Full recompute of the sequence view: precursor info, per-residue objects,
    // fragment-ion matching, and ambiguous-modification marks. Shared by the
    // per_scan_data / sequence / fragmentMassTolerance / variableModifications
    // watchers and mounted() so the prepare* order stays consistent.
    recomputeFragments(): void {
      this.preparePrecursorInfo()
      this.initializeSequenceObjects()
      this.prepareFragmentTable()
      this.prepareAmbigiousModifications()
    },
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
    updateSettings() {
      if (this.streamlitDataStore.settings?.ion_types !== undefined) {
            this.ionTypes.forEach(item => {
              item.selected = this.streamlitDataStore!.settings!.ion_types.includes(item.text);
            })
          }

      if (this.streamlitDataStore.settings?.tolerance !== undefined) {
        this.fragmentMassTolerance = this.streamlitDataStore.settings.tolerance            
      }
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

        // Ensures this is only executed once
        if (!this.visibilityOptions.some(option => option.text === 'Tags')) {
          this.visibilityOptions.push({ text: 'Truncations', selected: true })
          this.visibilityOptions.push({ text: 'Tags', selected: true })
          this.updateSettings()
          
        }

        this.ionTypesExtra['ammonium loss'] = false
        this.ionTypesExtra['water loss'] = false
        this.ionTypesExtra['proton loss/addition'] = false
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

      if (this.selectedScanIndex === undefined) {
        this.fragmentTableTitle = '' // if no scan is selected, nothing to show
        return
      }

      const selectedScanInfo =
        this.streamlitDataStore.allDataForDrawing.per_scan_data[this.selectedScanIndex]

      // get the observed mass table info
      const observed_masses = selectedScanInfo.MonoMass as number[]

      // calculate matching masses
      let matching_fragments: Record<string, unknown>[] = []
      const sequence_size = this.sequence_end
      
      this.ionTypes
        .filter((iontype) => iontype.selected)
        .forEach((iontype) => {
          
          // Dont match fragments in FLASHTnT if end could not be determined
          if ((iontype.text === 'a' || iontype.text === 'b' || iontype.text === 'c') && (this.sequence_start_reported < 0))
            return
          if ((iontype.text === 'x' || iontype.text === 'y' || iontype.text === 'z') && (this.sequence_end_reported < 0))
            return

          const theoretical_frags = this.getFragmentMasses(iontype.text)
          
          for (
            let theoIndex = 0, FragSize = theoretical_frags.length;
            theoIndex < FragSize;
            ++theoIndex
          ) {
            const aaIndex = theoIndex + this.sequence_start

            theoretical_frags[theoIndex].forEach((theoretical_mass) => {
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
          })
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
          modLabels : '',
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
      // update mass table selection using the observed mass
      if (this.selectedFragTableRowIndex >= 0) {
        this.updateMassTableFromFragmentMass(
          this.fragmentTableData[this.selectedFragTableRowIndex].ObservedMass as number
        )
      }
    },
    onFragmentTableRowSelected(rowIndex?: number) {
      if (rowIndex !== undefined && this.fragmentTableData[rowIndex]) {
        const observedMass = this.fragmentTableData[rowIndex].ObservedMass as number
        this.updateMassTableFromFragmentMass(observedMass)
      }
    },
    updateMassTableFromFragmentMass(observedMass: number) {
      // Prevent circular updates
      if (this._updatingFromMass) {
        return
      }
      
      this._updatingFromFragment = true
      
      // Get mass data from available sources - work independently of scan selection
      let massArray: number[] | undefined = undefined
      
      // First try to get mass data from selected scan if available
      const selectedScanIndex = this.selectionStore.selectedScanIndex
      
      if (selectedScanIndex !== undefined) {
        const scanData = this.streamlitDataStore.allDataForDrawing.per_scan_data[selectedScanIndex]
        if (scanData && scanData.MonoMass) {
          massArray = scanData.MonoMass as number[]
        }
      }
      
      // If scan-specific data is not available, try to get mass data from fallback sources
      if (!massArray) {
        const allDrawingData = this.streamlitDataStore.allDataForDrawing
        if (allDrawingData.per_scan_data?.length > 0) {
          // Fall back to first available scan data if mass table data is not available
          for (const scanData of allDrawingData.per_scan_data) {
            if (scanData && scanData.MonoMass) {
              massArray = scanData.MonoMass as number[]
              break
            }
          }
        }
      }
      
      if (!massArray || massArray.length === 0) {
        this._updatingFromFragment = false
        return
      }

      // Try exact match first
      let massIndex = massArray.findIndex((mass) => mass === observedMass)
      
      // If no exact match, find the closest match within tolerance (floating point precision issue)
      if (massIndex < 0) {
        const tolerance = 0.001 // 0.001 Da tolerance for floating point precision
        const closeMatches = massArray.map((mass, index) => ({
          index,
          mass,
          diff: Math.abs(mass - observedMass)
        })).filter(item => item.diff < tolerance).sort((a, b) => a.diff - b.diff)
        
        if (closeMatches.length > 0) {
          massIndex = closeMatches[0].index
        }
      }
      
      if (massIndex >= 0) {
        this.selectionStore.updateSelectedMass(massIndex)
      }
      
      this._updatingFromFragment = false
    },
    updateFragmentTableFromMassSelection(massIndex: number) {
      // Prevent circular updates
      if (this._updatingFromFragment) {
        return
      }
      
      this._updatingFromMass = true
      
      // Get the mass value from the mass data at the given index
      let massArray: number[] | undefined = undefined
      let selectedMass: number | undefined = undefined
      
      // Try to get mass data from available sources - same approach as updateMassTableFromFragmentMass
      const selectedScanIndex = this.selectionStore.selectedScanIndex
      
      if (selectedScanIndex !== undefined) {
        const scanData = this.streamlitDataStore.allDataForDrawing.per_scan_data[selectedScanIndex]
        if (scanData && scanData.MonoMass) {
          massArray = scanData.MonoMass as number[]
        }
      }
      
      // If scan-specific data is not available, try alternative sources
      if (!massArray) {
        const allDrawingData = this.streamlitDataStore.allDataForDrawing
        if (allDrawingData.per_scan_data?.length > 0) {
          // Fall back to first available scan data
          for (const scanData of allDrawingData.per_scan_data) {
            if (scanData && scanData.MonoMass) {
              massArray = scanData.MonoMass as number[]
              break
            }
          }
        }
      }
      
      if (!massArray || massIndex >= massArray.length || massIndex < 0) {
        this._updatingFromMass = false
        return
      }
      
      selectedMass = massArray[massIndex]
      
      if (!selectedMass) {
        this._updatingFromMass = false
        return
      }
      
      // Find matching fragment in the fragment table data using tolerance-based matching
      const tolerance = 0.001 // 0.001 Da tolerance for floating point precision
      let bestMatch: { index: number; diff: number } | null = null
      
      for (let i = 0; i < this.fragmentTableData.length; i++) {
        const fragmentRow = this.fragmentTableData[i]
        const observedMass = fragmentRow.ObservedMass as number
        
        if (observedMass !== undefined) {
          const massDiff = Math.abs(observedMass - selectedMass)
          
          if (massDiff < tolerance) {
            if (!bestMatch || massDiff < bestMatch.diff) {
              bestMatch = { index: i, diff: massDiff }
            }
          }
        }
      }
      
      if (bestMatch) {
        if (this.selectedFragTableRowIndex !== bestMatch.index) {
          this.selectedFragTableRowIndex = bestMatch.index
        }
      } else {
        this.selectedFragTableRowIndex = undefined
      }
      
      this._updatingFromMass = false
    },
    updateTagPosition() {
      // Protein without sequence selected
      if (this.sequence.length <= 0) {
        return
      }
      // No sequences in data
      if (this.sequenceObjects.length !== this.sequence.length) {
        this.initializeSequenceObjects()
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
        const labels = modification.labels
        const mass_display = parseFloat(mass).toLocaleString('en-US', { signDisplay: 'always' })
        for (let index = start; index <= end; index++) {
          if (index == start) {
            this.sequenceObjects[index].modStart = true
          }
          if (index == end) {
            this.sequenceObjects[index].modEnd = true
            this.sequenceObjects[index].modMass = mass_display
            this.sequenceObjects[index].modLabels = labels
          }
          if ((index != start) && (index != end)) {
            this.sequenceObjects[index].modCenter = true
          }
        }
      })
    },
    async copySequence(): Promise<void> {
      try {
        if (this.sequence.length === 0) {
          return
        }
        
        const sequenceToCopy = this.sequence.slice(this.sequence_start, this.sequence_end + 1).join('')
        
        if (!navigator.clipboard) {
          throw new Error('Clipboard API not available')
        }
        
        await navigator.clipboard.writeText(sequenceToCopy)
        this.copySnackbarText = 'Sequence copied to clipboard!'
        this.copySnackbar = true
      } catch (error) {
        this.copySnackbarText = 'Failed to copy sequence to clipboard'
        this.copySnackbar = true
        console.error('Copy failed:', error)
      }
    },
    toggleRegexHighlight(): void {
      this.showRegexHighlight = !this.showRegexHighlight
      if (!this.showRegexHighlight) {
        this.regexPattern = ''
        this.regexError = ''
        this.regexHighlightedIndices.clear()
      }
    },
    onRegexInput(): void {
      this.regexError = ''
      this.regexHighlightedIndices.clear()
      
      if (!this.regexPattern) {
        return
      }
      
      try {
        const regex = new RegExp(this.regexPattern, 'gi')
        const sequenceString = this.sequence.join('')
        
        let match
        while ((match = regex.exec(sequenceString)) !== null) {
          // Highlight all characters in the match
          for (let i = match.index; i < match.index + match[0].length; i++) {
            this.regexHighlightedIndices.add(i)
          }
          
          // Prevent infinite loop for zero-length matches
          if (match[0].length === 0) {
            break
          }
        }
      } catch (error) {
        this.regexError = 'Invalid regex pattern'
        console.warn('Regex error:', error)
      }
    },
    // Sequence change dialog methods
    openSequenceDialog(): void {
      this.customSequenceInput = ''
      this.sequenceInputError = ''
      this.sequenceDialog = true
    },
    closeSequenceDialog(): void {
      this.sequenceDialog = false
      this.customSequenceInput = ''
      this.sequenceInputError = ''
    },
    submitCustomSequence(): void {
      // Update selection store with custom sequence
      this.selectionStore.updateSequenceOut(this.customSequenceInput.toUpperCase())
      
      // Close dialog
      this.sequenceDialog = false
      this.customSequenceInput = ''
      this.sequenceInputError = ''
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