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
            @update:modelValue="updateSelectedModification"
            @click:clear="updateSelectedModification(undefined)"
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
            <v-btn type="submit" block class="mt-2" @click="updateCustomModification">Submit</v-btn>
          </v-form>
        </v-list-item>
      </v-list>
    </v-menu>
    <v-tooltip activator="parent">{{ sequenceObject.aminoAcid + (index + 1) }}</v-tooltip>
  </div>
</template>

<script lang="ts">
import { useStreamlitDataStore } from '@/stores/streamlit-data'
import { useModificationStore } from '@/stores/variable-modification'
import type { SequenceObject } from '@/types/sequence-object'
import type { Theme } from 'streamlit-component-lib'
import type { PropType } from 'vue'
import { defineComponent } from 'vue'

type KnownModification = 'Methyl' | 'Acetyl' | 'Phospho' | 'Oxidation' | 'Deamidated'

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
  setup() {
    const streamlitData = useStreamlitDataStore()
    const variableModData = useModificationStore()
    return { streamlitData, variableModData }
  },
  data() {
    return {
      menuOpen: false,
      selectedModification: undefined as KnownModification | undefined,
      customSelected: false,
      customModMass: 0 as number,
      modificationMass: {
        Acetyl: 42.010565,
        Methyl: 14.01565,
        Phospho: 79.966331,
        Oxidation: 15.994915,
        Deamidated: 0.984016,
      } as Record<KnownModification, number>,
    }
  },
  computed: {
    id(): string {
      return `${this.sequenceObject.aminoAcid}${this.index}`
    },
    theme(): Theme | undefined {
      return this.streamlitData.theme
    },
    variableModifications(): Record<number, number> {
      return this.variableModData.variableModifications ?? {}
    },
    modificationsForSelect(): string[] {
      if (this.potentialModifications.length === 0) return ['None', 'Custom']
      return ['None', 'Custom', ...this.potentialModifications]
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
        'sequence-amino-acid-modified': this.isThisAAmodified(),
      }
    },
    potentialModifications(): KnownModification[] {
      const aminoAcid = this.sequenceObject.aminoAcid
      // N-term: 'Acetyl', 'Methyl', 'Phospho'
      // C-term: 'Amidated'
      if (aminoAcid === 'C') return ['Acetyl', 'Methyl', 'Phospho']
      else if (aminoAcid === 'D') return ['Methyl', 'Phospho']
      else if (aminoAcid === 'E') return ['Methyl', 'Phospho']
      else if (aminoAcid === 'H') return ['Methyl', 'Phospho']
      else if (aminoAcid === 'I') return ['Methyl']
      else if (aminoAcid === 'K') return ['Methyl', 'Phospho']
      else if (aminoAcid === 'L') return ['Methyl']
      else if (aminoAcid === 'M') return ['Oxidation']
      else if (aminoAcid === 'N') return ['Methyl']
      else if (aminoAcid === 'Q') return ['Deamidated', 'Methyl']
      else if (aminoAcid === 'R') return ['Methyl', 'Phospho']
      else if (aminoAcid === 'S') return ['Acetyl', 'Methyl']
      else if (aminoAcid === 'T') return ['Acetyl', 'Methyl']
      else if (aminoAcid === 'Y') return ['Phospho']
      return []
    },
  },
  methods: {
    updateSelectedModification(modification: string | undefined) {
      if (modification === 'None') {
        this.selectedModification = undefined
      } else if (modification === 'Custom') {
        this.customSelected = true
        return
      } else {
        this.selectedModification = modification as KnownModification
      }
      this.menuOpen = false
      this.customSelected = false
      console.log('updated modification!', this.selectedModification, this.index)
      this.variableModData.updateVariableModifications(
        this.index,
        this.selectedModification ? this.modificationMass[this.selectedModification] : 0
      )
      console.log('saved variables=', this.variableModifications)
    },
    updateCustomModification() {
      console.log('Submitted!', this.index)
      this.variableModData.updateVariableModifications(this.index, this.customModMass)
      console.log('updated custom mod!', this.selectedModification, this.customModMass)
      this.menuOpen = false
      console.log('saved variables=', this.variableModifications)
    },
    isThisAAmodified() {
      if (this.selectedModification !== undefined) return true
      else if (
        this.index in this.variableModifications &&
        this.variableModifications[this.index] !== 0
      )
        return true
      return false
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
