<template>
  <div :id="id" class="d-flex justify-center align-center rounded-lg" :class="[aminoAcidCellClass, { highlighted: isHighlighted }]"
    :style="aminoAcidCellStyles" @click="selectCell" @contextmenu.prevent="toggleMenuOpen">
    <div v-if="sequenceObject.aIon" class="frag-marker-container-a">
      <svg viewBox="0 0 10 10">
        <path stroke="green" d="M7, 1 L9, 3 L9, 7 L9, 3 L7, 1 z" stroke-width="1.5" />
      </svg>
    </div>
    <div v-if="sequenceObject.bIon" class="frag-marker-container-b">
      <svg viewBox="0 0 10 10">
        <path stroke="#669BBC" d="M10, 0 V5 M10, 0 H5 z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </div>
    <div v-if="sequenceObject.cIon" class="frag-marker-container-c">
      <svg viewBox="0 0 10 10">
        <path stroke="red" d="M4, 1 L9, 3 L9, 7 L9, 3 L4, 1 z" stroke-width="1.5" />
      </svg>
    </div>
    <div v-if="sequenceObject.xIon" class="frag-marker-container-x">
      <svg viewBox="0 0 10 10">
        <path stroke="green" d="M1, 3 L1, 7 L3, 9 L1, 7 L1, 3 z" stroke-width="1.5" />
      </svg>
    </div>
    <div v-if="sequenceObject.yIon" class="frag-marker-container-y">
      <svg viewBox="0 0 10 10">
        <path stroke="#669BBC" d="M0, 10 V5 M0, 10 H5 z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>
    <div v-if="sequenceObject.zIon" class="frag-marker-container-z">
      <svg viewBox="0 0 10 10">
        <path stroke="red" d="M1, 3 L1, 7 L6, 9 L1, 7 L1, 3 z" stroke-width="1.5" />
      </svg>
    </div>
    <div v-if="DoesThisAAHaveExtraFragTypes" class="frag-marker-extra-type">
      <svg viewBox="0 0 10 10">
        <circle cx="5" cy="5" r="0.5" stroke="black" stroke-width="0.3" fill="gold" />
      </svg>
    </div>
    <div class="aa-text">
      {{ aminoAcid }}
    </div>
    <v-menu v-model="menuOpen" activator="parent" location="end" :open-on-click="false" :close-on-content-click="false"
      width="200px">
      <v-list>
        <v-list-item>
          <v-select v-model="selectedModification" clearable="true" label="Modification" density="compact"
            :items="modificationsForSelect" @update:model-value="updateSelectedModification"
            @click:clear="selectedModification = undefined">
          </v-select>
        </v-list-item>
        <v-list-item v-if="customSelected">
          <v-form @submit.prevent>
            <v-text-field v-model="customModMass" hide-details label="Monoisotopic mass in Da" type="number" />
            <v-btn type="submit" block="true" class="mt-2" @click="updateCustomModification">Submit</v-btn>
          </v-form>
        </v-list-item>
      </v-list>
    </v-menu>
    <v-tooltip activator="parent">
      {{ `Prefix: ${index + 1}` }}
      <br />
      {{ `Suffix: ${(streamlitData.sequenceData?.[selectedSequence].sequence.length ?? 0) - index}` }}
      <br />
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
      customModMass: '0' as string
    }
  },
  computed: {
    id(): string {
      return `${this.aminoAcid}${this.index}`
    },
    selectedSequence(): number {
      const pid = this.selectionStore.selectedProteinIndex
      if (typeof pid === 'number') {
        return pid
      }
      return 1
    },
    theme(): Theme | undefined {
      return this.streamlitData.theme
    },
    aminoAcid(): string {
      return this.sequenceObject.aminoAcid
    },
    coverage(): number {
      return this.sequenceObject.coverage
    },
    modificationsForSelect(): string[] {
      return ['None', 'Custom', ...this.potentialModifications]
    },
    aminoAcidCellStyles(): Record<string, string> {
      // Get coverage and scale between 0.1 and 1.0
      let alpha : number = typeof this.sequenceObject.coverage === 'number' ? this.sequenceObject.coverage : 0.9
      if (alpha !== 0) {
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
        'sequence-amino-acid-modified': this.isThisAAmodified,
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
    DoesThisAAHaveSequenceTags() : boolean {
      return this.coverage > 0
    },
    DoesThisAAHaveExtraFragTypes(): boolean {
      return this.sequenceObject.extraTypes.length > 0
    },
    isHighlighted(): boolean {
      return (this.index === this.selectionStore.selectedAApos)
    },
  },
  methods: {
    toggleMenuOpen(): void {
      this.menuOpen = !this.menuOpen
    },
    selectCell(): void {

      if (this.DoesThisAAHaveSequenceTags) {
        if (this.selectionStore.selectedAApos === this.index) {
          this.selectionStore.updateSelectedAA(undefined)
        }
        else {
          this.selectionStore.updateSelectedAA(this.index)
        }
      }
      //if (this.DoesThisAAHaveMatchingFragments) {
      //  this.$emit('selected', this.index)
      //}
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
})
</script>

<style scoped lang="less">


.sequence-amino-acid-highlighted, .sequence-amino-acid.highlighted {
  /* New style for highlighted state */
  background-color: #F3A712; /* Gold background for highlighted state */
  color: #000000; /* Black text for highlighted state */
  outline: 3px solid #29335C; /* Thicker border for highlighted state */
  font-weight: bold;
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
  background-color: #9c1e1e;

  &:hover {
    background-color: #ff1e1e;
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
</style>
