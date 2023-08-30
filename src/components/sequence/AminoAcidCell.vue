<template>
  <div :id="id" class="d-flex justify-center align-center rounded-lg" :class="aminoAcidCellClass"
    :style="aminoAcidCellStyles" @click="selectCell" @contextmenu.prevent="toggleMenuOpen">
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
      {{ aminoAcid }}
    </div>
    <v-menu activator="parent" v-model="menuOpen" location="end" :open-on-click="false" :close-on-content-click="false"
      width="200px">
      <v-list>
        <v-list-item>
          <v-select v-model="selectedModification" clearable label="Modification" density="compact"
            :items="modificationsForSelect" @update:modelValue="updateSelectedModification"
            @click:clear="selectedModification = undefined">
          </v-select>
        </v-list-item>
        <v-list-item v-if="customSelected">
          <v-form @submit.prevent>
            <v-text-field v-model="customModMass" hide-details label="Monoisotopic mass in Da" type="number" />
            <v-btn type="submit" block class="mt-2" @click="updateCustomModification">Submit</v-btn>
          </v-form>
        </v-list-item>
      </v-list>
    </v-menu>
    <v-tooltip activator="parent">
      {{ `Prefix: ${index + 1}` }}
      <br />
      {{ `Suffix: ${((streamlitData.sequenceData?.sequence.length ?? 0) - index)}` }}
    </v-tooltip>
  </div>
</template>

<script lang="ts">
import { useStreamlitDataStore } from '@/stores/streamlit-data'
import { useModificationStore } from '@/stores/variable-modification'
import type { SequenceObject } from '@/types/sequence-object'
import type { Theme } from 'streamlit-component-lib'
import type { PropType } from 'vue'
import { defineComponent } from 'vue'
import { potentialModificationMap, type KnownModification, modificationMassMap } from './modification'

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
    modificationsForSelect(): string[] {
      return ['None', 'Custom', ...this.potentialModifications]
    },
    aminoAcidCellStyles(): Record<string, string> {
      return {
        '--amino-acid-cell-color': this.theme?.textColor ?? '#fff',
        '--amino-acid-cell-bg-color': this.theme?.secondaryBackgroundColor ?? '#000',
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
        variableModifications[this.index] !== undefined &&
        variableModifications[this.index] !== 0
      )
    },
  },
  methods: {
    toggleMenuOpen(): void {
      this.menuOpen = !this.menuOpen
    },
    selectCell(): void {
      // do something later
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
  color: #f0a441;

  &:hover {
    background-color: var(--amino-acid-cell-hover-bg-color);
  }
}

.sequence-amino-acid-modified {
  background-color: #9c1e1e;
  //color: var(--amino-acid-cell-color);

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
