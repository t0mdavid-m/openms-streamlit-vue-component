<template>
  <div class="d-flex justify-center align-center rounded-lg protein-terminal" :class="proteinTerminalCellClasses"
    :style="proteinTerminalCellStyles" @click.stop @contextmenu.prevent="toggleMenuOpen">
    <div>
      {{ proteinTerminalText }}
    </div>
    <v-menu activator="parent" v-model="menuOpen" location="end" :open-on-click="false" :close-on-content-click="false"
      width="200px">
      <v-list>
        <v-list-item>
          <v-select v-model="selectedModification" clearable label="Modification" density="compact"
            :items="modificationsForSelect" @update:modelValue="updateSelectedModification"
            @click:clear="updateSelectedModification(undefined)">
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
      {{ proteinTerminalText }}
    </v-tooltip>
  </div>
</template>

<script lang="ts">
import { useStreamlitDataStore } from '@/stores/streamlit-data'
import { useModificationStore } from '@/stores/variable-modification'
import type { Theme } from 'streamlit-component-lib'
import type { PropType } from 'vue'
import { defineComponent } from 'vue'
import { potentialModificationMap, type KnownModification, modificationMassMap } from './modification'

export default defineComponent({
  name: 'ProteinTerminalCell',
  props: {
    proteinTerminal: {
      type: String as PropType<'N-term' | 'C-term'>,
      required: true,
    },
    index: {
      type: Number,
      required: true,
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
      return `${this.proteinTerminal}${this.index}`
    },
    theme(): Theme | undefined {
      return this.streamlitData.theme
    },
    proteinTerminalText(): string {
      return this.proteinTerminal.charAt(0)
    },
    hasVariableModification(): boolean {
      return this.variableModData.variableModifications[this.index] !== undefined
        && this.variableModData.variableModifications[this.index] !== 0
    },
    modificationsForSelect(): string[] {
      return ['None', 'Custom', ...this.potentialModifications]
    },
    proteinTerminalCellStyles(): Record<string, string> {
      return {
        '--protein-terminal-cell-color': this.theme?.textColor ?? '#fff',
        '--protein-terminal-cell-hover-color': '#fff',
        '--protein-terminal-cell-hover-bg-color': this.theme?.secondaryBackgroundColor ?? '#000',
      }
    },
    proteinTerminalCellClasses(): Record<string, boolean> {
      return {
        'protein-terminal': true,
        'protein-terminal-modified': this.selectedModification !== undefined || this.hasVariableModification,
      }
    },
    potentialModifications(): KnownModification[] {
      return potentialModificationMap[this.proteinTerminal] ?? []
    },
  },
  methods: {
    toggleMenuOpen(): void {
      this.menuOpen = !this.menuOpen
    },
    updateSelectedModification(modification: string | undefined) {
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
.protein-terminal {
  &:hover {
    background-color: var(--protein-terminal-cell-hover-bg-color);
    color: var(--protein-terminal-cell-hover-color);
  }
}

.protein-terminal-modified {
  background-color: #9c1e1e;
  color: var(--amino-acid-cell-color);

  &:hover {
    background-color: #ff1e1e;
  }
}
</style>
