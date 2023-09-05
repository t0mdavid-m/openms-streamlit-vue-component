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
            <AminoAcidCell :index="0" :sequence-object="aaSequenceObject" @selected.stop />
          </div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr">
          <div style="grid-column: 1 / span 1">
            Fragment ion types
            <v-layout row wrap>
              <div class="d-flex">
                <v-checkbox v-model="aIon" label="a"></v-checkbox>
                <v-checkbox v-model="bIon" label="b"></v-checkbox>
                <v-checkbox v-model="cIon" label="c"></v-checkbox>
                <v-checkbox v-model="xIon" label="x"></v-checkbox>
                <v-checkbox v-model="yIon" label="y"></v-checkbox>
                <v-checkbox v-model="zIon" label="z"></v-checkbox>
              </div>
            </v-layout>
          </div>
          <div style="grid-column: 2 / span 1">
            Modifications
            <v-layout row wrap>
              <div class="d-flex">
                <v-checkbox
                  v-model="fixed_mod"
                  label="Fixed modifications"
                  @update:modelValue="setAAWithVarMod"
                ></v-checkbox>
                <v-checkbox
                  v-model="variable_mod"
                  label="Variable modifications"
                  @update:modelValue="setAAWithVarMod"
                ></v-checkbox>
              </div>
            </v-layout>
          </div>
          <div class="text-subtitle-2 d-flex justify-end" style="grid-column: 2 / span 1">
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
        <v-btn color="primary" block @click="dialog = false">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import { useStreamlitDataStore } from '@/stores/streamlit-data'
import type { Theme } from 'streamlit-component-lib'
import { defineComponent } from 'vue'
import AminoAcidCell from '@/components/sequence/AminoAcidCell.vue'
import type { SequenceObject } from '@/types/sequence-object'

export default defineComponent({
  name: 'SequenceViewInformation',
  components: { AminoAcidCell },
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
