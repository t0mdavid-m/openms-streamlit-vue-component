<template>
  <v-btn id="info-button" variant="text" size="large" icon="mdi-information"> </v-btn>
  <v-dialog v-model="dialog" activator="#info-button" width="auto" :theme="theme?.base ?? 'light'">
    <v-card>
      <v-card-title>Sequence View legend</v-card-title>
      <v-divider></v-divider>
      <v-card-text>
        <div class="text-h6 d-flex justify-center">Legend for Sequence Map</div>
        <div class="d-flex justify-center">
          <div class="sequence-grid pa-6" style="width: 150px; max-width: 100%">
            <AminoAcidCellTagger :index="0" :sequence-object="aaSequenceObject" @selected.stop />
          </div>
        </div>
        Fragment ion types
        <v-row>
          <div class="d-flex">
            <v-checkbox v-model="aIon" label="a"></v-checkbox>
            <v-checkbox v-model="bIon" label="b"></v-checkbox>
            <v-checkbox v-model="cIon" label="c"></v-checkbox>
            <v-checkbox v-model="xIon" label="x"></v-checkbox>
            <v-checkbox v-model="yIon" label="y"></v-checkbox>
            <v-checkbox v-model="zIon" label="z"></v-checkbox>
            <v-checkbox v-model="waterLoss" label="water loss"></v-checkbox>
            <v-checkbox v-model="ammoniumLoss" label="ammonium loss"></v-checkbox>
            <v-checkbox v-model="proton" label="proton loss/addition"></v-checkbox>
          </div>
        </v-row>
        Modifications
        <div class="d-flex">
          <v-checkbox
            v-model="fixed_mod"
            label="Fixed modifications"
            hide-details
            density="comfortable"
            @update:model-value="setAAWithVarMod"
          ></v-checkbox>
          <v-checkbox
            v-model="variable_mod"
            label="Variable modifications"
            hide-details
            density="comfortable"
            @update:model-value="setAAWithVarMod"
          ></v-checkbox>
          <div class="text-subtitle-2 d-flex justify-end align-end">
            * Click checkboxes to see the styles
          </div>
        </div>
        <v-list density="compact">
          <v-list-item-title>Interaction tips</v-list-item-title>
          <v-list-item
            >Left click: highlights corresponding entries in Fragment Table and Mass
            Table</v-list-item
          >
          <v-list-item
            >Right click: opens variable modification menu (custom modification is
            available)</v-list-item
          >
        </v-list>
      </v-card-text>
      <v-card-actions>
        <v-btn color="primary" block="true" @click="dialog = false">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import { useStreamlitDataStore } from '@/stores/streamlit-data'
import type { Theme } from 'streamlit-component-lib'
import { defineComponent } from 'vue'
import AminoAcidCellTagger from '@/components/sequence/AminoAcidCellTagger.vue'
import type { SequenceObject } from '@/types/sequence-objectTagger'

export default defineComponent({
  name: 'SequenceViewInformationTagger',
  components: { AminoAcidCellTagger },
  setup() {
    const streamlitDataStore = useStreamlitDataStore()
    return { streamlitDataStore }
  },
  data() {
    return {
      dialog: false,
      aIon: true,
      bIon: false,
      cIon: false,
      xIon: true,
      yIon: true,
      zIon: false,
      fixed_mod: false,
      variable_mod: false,
      originalAAClasses: undefined as string | undefined,
      waterLoss: false,
      ammoniumLoss: false,
      proton: false,
    }
  },
  computed: {
    theme(): Theme | undefined {
      return this.streamlitDataStore.theme
    },
    aaSequenceObject(): SequenceObject {
      return {
        aminoAcid: 'AA',
        aIon: this.aIon,
        bIon: this.bIon,
        cIon: this.cIon,
        xIon: this.xIon,
        yIon: this.yIon,
        zIon: this.zIon,
        extraTypes: this.extraFragTypes(),
        coverage: 0
      }
    },
  },
  methods: {
    setAAWithVarMod() {
      if (this.originalAAClasses === undefined) {
        this.originalAAClasses = document.getElementById('AA0')?.getAttribute('class') ?? ''
      }

      const foundID = document.getElementById('AA0')
      if (foundID) {
        let class_string = this.originalAAClasses

        if (this.fixed_mod) class_string = 'sequence-amino-acid-highlighted ' + class_string
        if (this.variable_mod) class_string = 'sequence-amino-acid-modified ' + class_string

        foundID.setAttribute('class', class_string)
      }
    },
    extraFragTypes(): string[] {
      let ionType = ''
      if (this.aIon) ionType = 'a'
      else if (this.bIon) ionType = 'b'
      else if (this.cIon) ionType = 'c'
      else if (this.xIon) ionType = 'x'
      else if (this.yIon) ionType = 'y'
      else if (this.zIon) ionType = 'z'
      else return []

      let extraTypes = []
      if (this.waterLoss) extraTypes.push(`${ionType}-H20`)
      if (this.ammoniumLoss) extraTypes.push(`${ionType}-NH3`)
      if (this.proton) {
        extraTypes.push(`${ionType}-H`)
        extraTypes.push(`${ionType}+H`)
      }
      return extraTypes
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
.sequence-amino-acid-modified {
  background-color: #9c1e1e !important;

  &:hover {
    background-color: #ff1e1e;
  }
}
.sequence-amino-acid-highlighted {
  background-color: var(--amino-acid-cell-bg-color);
  color: #f0a441;

  &:hover {
    background-color: var(--amino-acid-cell-hover-bg-color);
  }
}
</style>
