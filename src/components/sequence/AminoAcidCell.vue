<template>
  <div
   :id="id"
   class="d-flex justify-center align-center rounded-lg"
   :class="[aminoAcidCellClass, { highlighted: isHighlighted }, { truncated: isTruncated }]"
   :style="aminoAcidCellStyles"
   @click="selectCell"
   @contextmenu.prevent="toggleMenuOpen"
   >
    <div v-if="showFragments && sequenceObject.aIon" class="frag-marker-container-a">
      <svg viewBox="0 0 10 10">
        <path stroke="green" d="M7, 1 L9, 3 L9, 7 L9, 3 L7, 1 z" stroke-width="1.5" />
      </svg>
    </div>
    <div v-if="showFragments && sequenceObject.bIon" class="frag-marker-container-b">
      <svg viewBox="0 0 10 10">
        <path stroke="blue" d="M10, 0 V5 M10, 0 H5 z" stroke-width="3" />
      </svg>
    </div>
    <div v-if="showFragments && sequenceObject.cIon" class="frag-marker-container-c">
      <svg viewBox="0 0 10 10">
        <path stroke="red" d="M4, 1 L9, 3 L9, 7 L9, 3 L4, 1 z" stroke-width="1.5" />
      </svg>
    </div>
    <div v-if="showFragments && sequenceObject.xIon" class="frag-marker-container-x">
      <svg viewBox="0 0 10 10">
        <path stroke="green" d="M1, 3 L1, 7 L3, 9 L1, 7 L1, 3 z" stroke-width="1.5" />
      </svg>
    </div>
    <div v-if="showFragments && sequenceObject.yIon" class="frag-marker-container-y">
      <svg viewBox="0 0 10 10">
        <path stroke="blue" d="M0, 10 V5 M0, 10 H5 z" stroke-width="3" />
      </svg>
    </div>
    <div v-if="showFragments && sequenceObject.zIon" class="frag-marker-container-z">
      <svg viewBox="0 0 10 10">
        <path stroke="red" d="M1, 3 L1, 7 L6, 9 L1, 7 L1, 3 z" stroke-width="1.5" />
      </svg>
    </div>
    <div v-if="showTags && sequenceObject.tagStart" class="rounded-lg tag-marker tag-start"></div>
    <div v-if="showTags && sequenceObject.tagEnd" class="rounded-lg tag-marker tag-end"></div>
    <div v-if="showModifications && sequenceObject.modStart" class="rounded-lg mod-marker mod-start"></div>
    <div v-if="showModifications && sequenceObject.modEnd" class="rounded-lg mod-marker mod-end"></div>
    <div v-if="showModifications && sequenceObject.modStart && !sequenceObject.modEnd" class="mod-marker mod-start-cont"></div>
    <div v-if="showModifications && !sequenceObject.modStart && sequenceObject.modEnd" class="mod-marker mod-end-cont"></div>
    <div v-if="showModifications && sequenceObject.modCenter" class="mod-marker mod-center-cont"></div>
    <div v-if="showModifications && sequenceObject.modEnd" class="rounded-lg mod-mass">{{ sequenceObject.modMass }}
      <v-tooltip activator="parent" class="foreground">
        {{ `Modification Mass: ${sequenceObject.modMass} Da` }}
        <br />
        {{ `Possible Modifications: ${sequenceObject.modLabels}` }}
        <br />
      </v-tooltip>
    </div>
    <div v-if="showFragments && showModifications && sequenceObject.modEnd && sequenceObject.aIon && !sequenceObject.bIon" class="rounded-lg mod-mass-a">{{ sequenceObject.modMass }}</div>
    <div v-if="showFragments && showModifications && sequenceObject.modEnd && sequenceObject.bIon" class="rounded-lg mod-mass-b">{{ sequenceObject.modMass }}</div>
    <div v-if="showFragments && showModifications && sequenceObject.modEnd && sequenceObject.cIon && !sequenceObject.bIon" class="rounded-lg mod-mass-c">{{ sequenceObject.modMass }}</div>

    
    <div v-if="showModifications && DoesThisAAHaveExtraFragTypes" class="frag-marker-extra-type">
      <svg viewBox="0 0 10 10">
        <circle cx="5" cy="5" r="0.5" stroke="black" stroke-width="0.3" fill="gold" />
      </svg>
    </div>
    <div class="aa-text">
      {{ aminoAcid }}
    </div>
    <v-menu
      v-model="menuOpen"
      activator="parent"
      location="end"
      :open-on-click="false"
      :close-on-content-click="false"
      width="200px"
    >
      <v-list>
        <v-list-item>
          <v-select
            v-model="selectedModification"
            clearable="true"
            label="Modification"
            density="compact"
            :items="modificationsForSelect"
            @update:model-value="updateSelectedModification"
            @click:clear="selectedModification = undefined"
          >
          </v-select>
        </v-list-item>
        <v-list-item v-if="customSelected">
          <v-form @submit.prevent>
            <v-text-field
              v-model="customModMass"
              hide-details
              label="Monoisotopic mass in Da"
              type="number"
            />
            <v-btn type="submit" block="true" class="mt-2" @click="updateCustomModification"
              >Submit</v-btn
            >
          </v-form>
        </v-list-item>
      </v-list>
    </v-menu>
    <v-tooltip activator="parent">
      <template v-if="prefix !== undefined">
        {{ `Prefix: ${prefix}` }}
        <br />
      </template>
      <template v-if="truncated_prefix !== undefined">
        {{ `Truncated Prefix: ${truncated_prefix}` }}
        <br />
      </template>
      <template v-if="suffix !== undefined">
        {{ `Suffix: ${suffix}` }}
        <br />
      </template>
      <template v-if="truncated_suffix !== undefined">
        {{ `Truncated Suffix: ${truncated_suffix}` }}
        <br />
      </template>
      <div v-if="DoesThisAAHaveExtraFragTypes">
        {{ sequenceObject.extraTypes.join(', ') }}
      </div>
    </v-tooltip>
  </div>
</template>

<script lang="ts">
import { useStreamlitDataStore } from '@/stores/streamlit-data'
import { useModificationStore } from '@/stores/variable-modification'
import { useSelectionStore } from '@/stores/selection'
import type { SequenceObject } from '@/types/sequence-object'
import type { Theme } from 'streamlit-component-lib'
import type { PropType } from 'vue'
import { defineComponent } from 'vue'
import {
  potentialModificationMap,
  type KnownModification,
  modificationMassMap,
} from './modification'

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
    disableVariableModificationSelection: {
      type: Boolean,
      default: false,
    },
    showTags: {
      type: Boolean,
      default: false,
    },
    showModifications: {
      type: Boolean,
      default: true,
    },
    showFragments: {
      type: Boolean,
      default: true,
    },
  },
  emits: ['selected'],
  setup() {
    const streamlitData = useStreamlitDataStore()
    const variableModData = useModificationStore()
    const selectionStore = useSelectionStore()
    return { streamlitData, variableModData, selectionStore }
  },
  data() {
    return {
      menuOpen: false,
      selectedModification: undefined as KnownModification | undefined,
      customSelected: false,
      customModMass: '0' as string,
    }
  },
  computed: {
    id(): string {
      return `${this.aminoAcid}${this.index}`
    },
    theme(): Theme | undefined {
      return this.streamlitData.theme
    },
    aminoAcid(): string {
      return this.sequenceObject.aminoAcid
    },
    start(): number | undefined {
      return this.streamlitData.sequenceData?.[this.selectedSequence].proteoform_start
    },
    end(): number | undefined {
      return this.streamlitData.sequenceData?.[this.selectedSequence].proteoform_end
    },
    length(): number | undefined {
      return this.streamlitData.sequenceData?.[this.selectedSequence].sequence.length
    },
    prefix(): number | undefined {
      if ((this.start === undefined) && (this.end === undefined)) {
        return this.index + 1
      }
      else if ((this.end !== undefined) && (this.index > this.end)) {
        return undefined
      }
      else if ((this.start !== undefined) && (this.index >= this.start)) {
        return this.index + 1 - this.start
      }
      return undefined
    },
    truncated_prefix(): number | undefined {
      if ((this.start === undefined) || (this.index >= this.start)) {
        return undefined
      }
      return this.index + 1
    },
    suffix(): number | undefined {
      if ((this.start === undefined) && (this.end === undefined)) {
        return (length ?? 0) - this.index
      }
      else if ((this.start !== undefined) && (this.index < this.start)) {
        return undefined
      }
      else if ((this.end !== undefined) && (this.index <= this.end)) {
        return this.end + 1 - this.index
      }
      return undefined
    },
    truncated_suffix(): number | undefined {
      const end = this.streamlitData.sequenceData?.[this.selectedSequence].proteoform_end
      const length = this.streamlitData.sequenceData?.[this.selectedSequence].sequence.length
      if ((end == undefined) || (this.index <= end)) {
        return undefined
      }
      return (length ?? 0) - this.index
    },
    modificationsForSelect(): string[] {
      return ['None', 'Custom', ...this.potentialModifications]
    },
    aminoAcidCellStyles(): Record<string, string> {
      // Get coverage and scale between 0.1 and 1.0
      let alpha = this.coverage

      if (alpha < 0) {
        return {
          '--amino-acid-cell-color': this.theme?.textColor ?? '#fff',
          '--amino-acid-cell-bg-color': this.theme?.secondaryBackgroundColor ?? '#000',
          '--amino-acid-cell-hover-color': this.theme?.textColor ?? '#fff',
          '--amino-acid-cell-hover-bg-color': this.theme?.backgroundColor ?? '#000',
          position: 'relative',
        }
      }

      if (!this.showTags) {
        alpha = 0
      }
      else if (alpha !== 0) {
        alpha = (alpha * 0.9) + 0.1
      }
      
      return {
        '--amino-acid-cell-color': this.theme?.textColor ?? '#fff',
        '--amino-acid-cell-bg-color': `rgba(228, 87, 46, ${alpha})`,
        '--amino-acid-cell-hover-color': this.theme?.textColor ?? '#fff',
        '--amino-acid-cell-hover-bg-color': this.theme?.backgroundColor ?? '#000',
        position: 'relative',
      }
    },
    aminoAcidCellClass(): Record<string, boolean> {
      return {
        'sequence-amino-acid': !this.fixedModification,
        'sequence-amino-acid-highlighted': this.fixedModification,
      }
    },
    potentialModifications(): KnownModification[] {
      return potentialModificationMap[this.aminoAcid] ?? []
    },
    isThisAAmodified(): boolean {
      const variableModifications = this.variableModData.variableModifications ?? {}
      if (this.selectedModification !== undefined) return true
      return (
        variableModifications[this.index] !== undefined && variableModifications[this.index] !== 0
      )
    },
    DoesThisAAHaveMatchingFragments(): boolean {
      return (
        this.sequenceObject.aIon ||
        this.sequenceObject.bIon ||
        this.sequenceObject.cIon ||
        this.sequenceObject.xIon ||
        this.sequenceObject.yIon ||
        this.sequenceObject.zIon
      )
    },
    DoesThisAAHaveExtraFragTypes(): boolean {
      return this.sequenceObject.extraTypes.length > 0
    },
    selectedSequence(): number {
      if (this.selectionStore.selectedProteinIndex !== undefined) {
        return this.selectionStore.selectedProteinIndex
      }
      return 0
    },
    coverage(): number {
      if (this.sequenceObject.coverage !== undefined) 
      {
        return this.sequenceObject.coverage
      }
      return -1
    },
    isHighlighted(): boolean {
      return (this.index === this.selectionStore.selectedAApos)
    },
    isTruncated(): boolean {
      return this.sequenceObject.truncated
    },
    DoesThisAAHaveSequenceTags() : boolean {
      return this.coverage > 0
    },
  },
  methods: {
    toggleMenuOpen(): void {
      if (this.disableVariableModificationSelection) {
        return
      }
      this.menuOpen = !this.menuOpen
    },
    selectCell(): void {
      if (this.DoesThisAAHaveSequenceTags && this.showTags) {
        if ((this.selectionStore.selectedAApos === this.index)){
          this.selectionStore.updateSelectedAA(undefined)
        }
        else {
          this.selectionStore.updateSelectedAA(this.index)
        }
      }
      if (this.DoesThisAAHaveMatchingFragments) {
        this.$emit('selected', this.index)
      }
    },
    updateSelectedModification(modification: 'None' | 'Custom' | KnownModification) {
      if (modification === 'None') {
        this.selectedModification = undefined
      } else if (modification === 'Custom') {
        this.customSelected = true
        return
      } else {
        this.selectedModification = modification as KnownModification
      }
      this.toggleMenuOpen()
      this.customSelected = false
      this.variableModData.updateVariableModifications(
        this.index,
        this.selectedModification ? modificationMassMap[this.selectedModification] : 0
      )
    },
    updateCustomModification() {
      this.variableModData.updateVariableModifications(this.index, parseFloat(this.customModMass))
      this.toggleMenuOpen()
    },
  },
  watch: {
    isThisAAmodified() {
      this.sequenceObject.modStart = true
      this.sequenceObject.modEnd = true
    },
    customModMass() {
      this.sequenceObject.modMass = parseFloat(this.customModMass).toLocaleString('en-US', { signDisplay: 'always' })
    },
    selectedModification() {
      if ((this.selectedModification !== undefined) && (modificationMassMap[this.selectedModification] !== undefined)) {
        this.sequenceObject.modMass = parseFloat(modificationMassMap[this.selectedModification].toFixed(2)).toLocaleString('en-US', { signDisplay: 'always' })
      }
    },
    showTags() {
      if (!this.showTags) {
        this.selectionStore.updateSelectedAA(undefined)
      }
    },
  },
})
</script>

<style scoped lang="less">

.foreground {
  position: relative;
  z-index: 1000; 
}

.sequence-amino-acid-highlighted, .sequence-amino-acid.highlighted {
  /* New style for highlighted state */
  background-color: #F3A712; /* Gold background for highlighted state */
  color: #000000; /* Black text for highlighted state */
  outline: 3px solid #29335C; /* Thicker border for highlighted state */
  font-weight: bold;
}

.sequence-amino-acid-truncated, .sequence-amino-acid.truncated .aa-text {
  color: rgba(128, 128, 128, 0.3);
  outline: rgba(128, 128, 128, 0.3);
  text-decoration: line-through !important;
}

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
  color: #F3A712;

  &:hover {
    background-color: var(--amino-acid-cell-hover-bg-color);
  }
}

.sequence-amino-acid-modified {
  background-color: #a79c91;

  &:hover {
    background-color: #C5BAAF;
  }
}

.frag-marker-container {
  width: 100%;
  height: 100%;
  position: absolute;
  z-index: 1000;
}

.frag-marker-container-a:extend(.frag-marker-container) {
  top: -28%;
  left: 15%;
}

.frag-marker-container-b:extend(.frag-marker-container) {
  top: -8%;
  left: 13%;
}

.frag-marker-container-c:extend(.frag-marker-container) {
  top: -28%;
  left: 15%;
}

.frag-marker-container-x:extend(.frag-marker-container) {
  bottom: -32%;
  left: -10%;
}

.frag-marker-container-y:extend(.frag-marker-container) {
  bottom: -8%;
  left: -10%;
}

.frag-marker-container-z:extend(.frag-marker-container) {
  bottom: -32%;
  left: -10%;
}

.frag-marker-extra-type:extend(.frag-marker-container) {
  top: -30%;
}

.aa-text {
  position: absolute;
}

.tag-marker {
  position: absolute;
  top: -7.5%;
  left: -7.5%;
  width: 115%;
  height: 115%;
  display: flex;
  align-items: center;
  justify-content: right;
  border-top: 0.3em solid black;
  border-right: 0.3em solid black;
  border-bottom: 0.3em solid black;
  border-left: 0.3em solid black;
  z-index: 1100;
}

.tag-start {
  clip-path: inset(0 50% 0 0);
}

.tag-end {
  clip-path: inset(0 0 0 50%);
}

.mod-marker {
  position: absolute;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: right;
  background-image:  radial-gradient(#676a9c 0.5px, transparent 0.5px), radial-gradient(#444cf7 0.5px, #e5e5f7 0.5px);
  background-size: 15px 15px;
  background-position: 0 0,10px 10px;
  background-repeat: repeat;
}

.mod-mass {
  background-color: white;
  display: inline-block;
  position: absolute;
  top: -15%;
  right: -25%;
  display: flex;
  align-items: center;
  justify-content: right;
  border-top: 0.1em solid #a79c91;
  border-right: 0.1em solid #a79c91;
  border-bottom: 0.1em solid #a79c91;
  border-left: 0.1em solid #a79c91;
  font-size: 0.7em;
  padding: 0.0em 0.2em 0.0em 0.2em;
  z-index: 1100;
}

.mod-mass-a {
  display: inline-block;
  position: absolute;
  top: -15%;
  right: -25%;
  display: flex;
  align-items: center;
  border-top: 0.2em solid green;
  border-right: 0.2em solid green;
  border-bottom: 0.2em solid green;
  border-top-right-radius: 0.5rem; /* Ensure the pseudo-element also has rounded corners */
  border-top-left-radius: 0.5rem;
  border-bottom-right-radius: 0.5rem;
  border-bottom-left-radius: 0.5rem;
  padding: 0.0em 0.2em 0.0em 0.2em;
  z-index: 1200;
  font-size: 0.7em;
  color: rgba(0, 0, 0, 0);
}

.mod-mass-b {
  display: inline-block;
  position: absolute;
  top: -15%;
  right: -25%;
  display: flex;
  align-items: center;
  border-top: 0.2em solid blue;
  border-right: 0.2em solid blue;
  border-bottom: 0.2em solid blue;
  border-top-right-radius: 0.5rem; /* Ensure the pseudo-element also has rounded corners */
  border-top-left-radius: 0.5rem;
  border-bottom-right-radius: 0.5rem;
  border-bottom-left-radius: 0.5rem;
  z-index: 1200;
  padding: 0.0em 0.2em 0.0em 0.2em;
  font-size: 0.7em;
  color: rgba(0, 0, 0, 0);
}

.mod-mass-c {
  display: inline-block;
  position: absolute;
  top: -15%;
  right: -25%;
  display: flex;
  align-items: center;
  border-top: 0.2em solid red;
  border-right: 0.2em solid red;
  border-bottom: 0.2em solid red;
  border-top-right-radius: 0.5rem; /* Ensure the pseudo-element also has rounded corners */
  border-top-left-radius: 0.5rem;
  border-bottom-right-radius: 0.5rem;
  border-bottom-left-radius: 0.5rem;
  z-index: 1200;
  font-size: 0.7em;
  padding: 0.0em 0.2em 0.0em 0.2em;
  color: rgba(0, 0, 0, 0);
}

.mod-start {
  clip-path: inset(0 50% 0 0);
}

.mod-end {
  clip-path: inset(0 0 0 50%);
}

.mod-start-cont {
  clip-path: inset(0 0 0 50%);
}

.mod-end-cont {
  clip-path: inset(0 50% 0 0);
}

.mod-center-cont {
  width: 125%;
}

</style>
