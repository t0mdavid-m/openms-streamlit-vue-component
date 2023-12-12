<template>
  <div class="d-flex justify-center">
    <h4>Internal Fragment View</h4>
  </div>
  <div class="d-flex justify-space-between">
    <div class="d-flex justify-start align-center px-4 mb-4">
      <div class="by-fragment mr-2" style="border: 1px solid white" :style="fragmentStyle"></div>
      <div class="mr-4">by/cz</div>
      <div class="bz-fragment mr-2" style="border: 1px solid white" :style="fragmentStyle"></div>
      <div class="mr-4">bz</div>
      <div class="cy-fragment mr-2" style="border: 1px solid white" :style="fragmentStyle"></div>
      <div class="mr-4">cy</div>
    </div>
    <div class="d-flex justify-end px-4 mb-4" style="max-width: 97%">
      <v-btn id="settings-button" variant="text" icon="mdi-cog" size="medium"></v-btn>
      <v-menu :close-on-content-click="false" activator="#settings-button" location="bottom">
        <v-card min-width="300">
          <v-list>
            <v-list-item>
              <v-list-item-title>Fragments display style</v-list-item-title>
              <div class="d-flex">
                <v-switch v-model="fragmentDisplayOverlay" hide-details :label="`${fragmentDisplayOverlayLabels}`"
                  class="mr-4" />
              </div>
            </v-list-item>
            <v-list-item>
              <v-list-item-title>Opacity of each fragment (If overlay display style)</v-list-item-title>
              <div :style="{ background: `rgba(240, 164, 65, ${fragOpacity})` }">
                <v-slider v-model="fragOpacity" class="align-center ml-4" :max="fragOpacityMax" :min="fragOpacityMin"
                  hide-details>
                  <template #append>
                    <v-text-field v-model="fragOpacity" hide-details single-line :min="fragOpacityMin"
                      :max="fragOpacityMax" step="0.01" density="compact" type="number"
                      class="textFieldFontSize"></v-text-field>
                  </template>
                </v-slider>
              </div>
            </v-list-item>
            <v-list-item>
              <v-list-item-title>Fragment mass tolerance</v-list-item-title>
              <div class="d-flex justify-space-between">
                <v-switch v-model="fragmentMassToleranceUnit" true-value="ppm" false-value="Da" hide-details
                  :label="`${fragmentMassToleranceUnit}`" class="mr-4" />
                <v-text-field v-model="fragmentMassTolerance" type="number" hide-details="auto" label="mass tolerance"
                  @change="updateMassTolerance"></v-text-field>
              </div>
            </v-list-item>
          </v-list>
        </v-card>
      </v-menu>
    </div>
  </div>
  <v-sheet class="pa-4 rounded-lg" style="max-width: 97%" :theme="theme?.base ?? 'light'" border>
    <div id="internal-fragment-part">
      <div class="d-flex" style="border-bottom: white; border-bottom-width: 1px; border-bottom-style: solid">
        <div v-for="(aa, aaIndex) in sequence" :key="`${aa}-${aaIndex}`"
          class="d-flex justify-center align-center fragment-segment sequence-text" :style="fragmentStyle">
          {{ aa }}
        </div>
      </div>
      <div :style="fragmentTypeContainerStyle">
        <div v-for="fragmentData in byData" :key="fragmentData.mass" class="d-flex" :style="fragmentTypeOverlayStyle">
          <div v-for="(aa, aaIndex) in sequence" :key="`${aa}-${aaIndex}`"
            :class="fragmentClasses(aaIndex, fragmentData.start, fragmentData.end, 'by-fragment')"
            style="border: 1px solid white" :style="fragmentStyle"></div>
        </div>
      </div>
      <div :style="fragmentTypeContainerStyle">
        <div v-for="fragmentData in cyData" :key="fragmentData.mass" class="d-flex" :style="fragmentTypeOverlayStyle">
          <div v-for="(aa, aaIndex) in sequence" :key="`${aa}-${aaIndex}`"
            :class="fragmentClasses(aaIndex, fragmentData.start, fragmentData.end, 'cy-fragment')"
            style="border: 1px solid white" :style="fragmentStyle"></div>
        </div>
      </div>
      <div :style="fragmentTypeContainerStyle">
        <div v-for="fragmentData in bzData" :key="fragmentData.mass" class="d-flex" :style="fragmentTypeOverlayStyle">
          <div v-for="(aa, aaIndex) in sequence" :key="`${aa}-${aaIndex}`"
            :class="fragmentClasses(aaIndex, fragmentData.start, fragmentData.end, 'bz-fragment')"
            style="border: 1px solid white" :style="fragmentStyle"></div>
        </div>
      </div>
    </div>
  </v-sheet>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useStreamlitDataStore } from '@/stores/streamlit-data'
import { useSelectionStore } from '@/stores/selection'
import type { InternalFragmentData } from '@/types/internal-fragment-data'
import type { StyleValue } from 'vue'

type CombinedFragmentData = { mass: number; start: number; end: number }

export default defineComponent({
  name: 'InternalFragmentView',
  props: {
    index: {
      type: Number,
      required: true,
    },
  },
  setup() {
    const streamlitData = useStreamlitDataStore()
    const selectionStore = useSelectionStore()

    return { streamlitData, selectionStore }
  },
  data() {
    return {
      fragmentMassTolerance: 10 as number,
      fragmentMassToleranceUnit: 'ppm' as 'ppm' | 'Da',
      fragmentMassTypes: {
        by: true,
        cy: true,
        bz: true,
      } as Record<'by' | 'cy' | 'bz', boolean>,
      fragmentDisplayOverlay: false,
      fragOpacity: 0.2,
      fragOpacityMin: 0.01,
      fragOpacityMax: 1,
    }
  },
  computed: {
    theme() {
      return this.streamlitData.theme
    },
    internalFragmentData() {
      return this.streamlitData.internalFragmentData
    },
    sequence() {
      return this.internalFragmentData?.sequence
    },
    fragmentStyle() {
      return {
        height: (94 / (this.sequence?.length ?? 1)).toFixed(2) + 'vw',
        '--frag-block-opacity-value': this.fragOpacity,
        //'--amino-acid-cell-color': this.theme?.textColor ?? '#fff',
      }
    },
    fragmentTypeContainerStyle() {
      return {
        height: this.fragmentDisplayOverlay ? this.fragmentStyle.height : 'auto',
        //'--amino-acid-cell-color': this.theme?.textColor ?? '#fff',
      }
    },
    fragmentTypeOverlayStyle(): StyleValue {
      return {
        position: this.fragmentDisplayOverlay ? 'absolute' : 'static',
      }
    },
    fragmentDisplayOverlayLabels() {
      return this.fragmentDisplayOverlay ? 'Overlay fragments from the same type' : 'Stacked'
    },
    selectedScanInfo(): Record<string, unknown> | undefined {
      if (this.selectionStore.selectedScanIndex === undefined) return undefined
      return this.streamlitData.allDataForDrawing.per_scan_data[
        this.selectionStore.selectedScanIndex
      ]
    },
    byData(): CombinedFragmentData[] {
      if (
        this.selectedScanInfo === undefined ||
        !this.internalFragmentData?.fragment_masses_by ||
        !this.internalFragmentData?.start_indices_by ||
        !this.internalFragmentData?.end_indices_by
      )
        return []

      const observedMass = this.selectedScanInfo.PrecursorMass as number
      if (observedMass === 0) {
        // if selected scan is not eligible for this view (MS1)
        return []
      }

      const combinedByData: CombinedFragmentData[] = []

      // get the observed mass table info
      const observed_masses = this.selectedScanInfo.MonoMass as number[]

      // calculating matching masses
      this.filterMatchingMasses(
        observed_masses,
        this.internalFragmentData.fragment_masses_by,
        this.internalFragmentData.start_indices_by,
        this.internalFragmentData.end_indices_by,
        combinedByData
      )

      console.log(combinedByData)

      return combinedByData
    },
    cyData(): CombinedFragmentData[] {
      if (
        this.selectedScanInfo === undefined ||
        !this.internalFragmentData?.fragment_masses_cy ||
        !this.internalFragmentData?.start_indices_cy ||
        !this.internalFragmentData?.end_indices_cy
      )
        return []

      const observedMass = this.selectedScanInfo.PrecursorMass as number
      if (observedMass === 0) {
        // if selected scan is not eligible for this view (MS1)
        return []
      }

      const combinedByData: CombinedFragmentData[] = []

      // get the observed mass table info
      const observed_masses = this.selectedScanInfo.MonoMass as number[]

      // calculating matching masses
      this.filterMatchingMasses(
        observed_masses,
        this.internalFragmentData.fragment_masses_cy,
        this.internalFragmentData.start_indices_cy,
        this.internalFragmentData.end_indices_cy,
        combinedByData
      )

      console.log(combinedByData)

      return combinedByData
    },
    bzData(): CombinedFragmentData[] {
      if (
        this.selectedScanInfo === undefined ||
        !this.internalFragmentData?.fragment_masses_bz ||
        !this.internalFragmentData?.start_indices_bz ||
        !this.internalFragmentData?.end_indices_bz
      )
        return []

      const observedMass = this.selectedScanInfo.PrecursorMass as number
      if (observedMass === 0) {
        // if selected scan is not eligible for this view (MS1)
        return []
      }

      const combinedByData: CombinedFragmentData[] = []

      // get the observed mass table info
      const observed_masses = this.selectedScanInfo.MonoMass as number[]

      // calculating matching masses
      this.filterMatchingMasses(
        observed_masses,
        this.internalFragmentData.fragment_masses_bz,
        this.internalFragmentData.start_indices_bz,
        this.internalFragmentData.end_indices_bz,
        combinedByData
      )

      console.log(combinedByData)

      return combinedByData
    },
  },
  methods: {
    updateMassTolerance(event: Event) {
      this.fragmentMassTolerance = Number.parseInt((event.target as any).value as string)
    },
    fragmentClasses(
      sequenceIndex: number,
      startIndex: number,
      endIndex: number,
      className: string
    ) {
      const inFragment = sequenceIndex > startIndex && sequenceIndex <= endIndex
      let thisClassName = className
      if (this.fragmentDisplayOverlay) thisClassName += '-overlayed'
      return {
        [thisClassName]: inFragment,
        'not-in-fragment': !inFragment,
      }
    },
    filterMatchingMasses(
      observedMassses: number[],
      fragmentMasses: number[],
      startIndices: number[],
      endIndices: number[],
      target: CombinedFragmentData[]
    ) {
      for (let i = 0, frag_size = fragmentMasses.length; i < frag_size; i++) {
        const theoretical_mass = fragmentMasses[i]

        for (let obsIndex = 0, obsSize = observedMassses.length; obsIndex < obsSize; ++obsIndex) {
          const massDiffDa = observedMassses[obsIndex] - theoretical_mass
          const massDiffPpm = (massDiffDa / theoretical_mass) * 1e6
          if (Math.abs(massDiffPpm) > this.fragmentMassTolerance) {
            // if mass difference is larger than tolerance, ignore
            continue
          }
          // if valid push
          target.push({
            mass: theoretical_mass,
            start: startIndices[i],
            end: endIndices[i],
          })
          break
        }
      }
    },
  },
})
</script>

<style scoped lang="less">
.sequence-text {
  font-size: 8px;
}

.fragment-segment {
  aspect-ratio: 1;
}

.by-fragment:extend(.fragment-segment) {
  background: #f0a441;
}

.by-fragment-overlayed:extend(.by-fragment) {
  opacity: var(--frag-block-opacity-value);
}

.cy-fragment:extend(.fragment-segment) {
  background: #12871d;
}

.cy-fragment-overlayed:extend(.cy-fragment) {
  opacity: var(--frag-block-opacity-value);
}

.bz-fragment:extend(.fragment-segment) {
  background: #7831cc;
}

.bz-fragment-overlayed:extend(.bz-fragment) {
  opacity: var(--frag-block-opacity-value);
}

.not-in-fragment:extend(.fragment-segment) {
  background: transparent;
  aspect-ratio: 1;
}

.v-input.textFieldFontSize {
  width: 100px;
}
</style>
