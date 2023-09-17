<template>
  <div class="d-flex justify-center">
    <h4>Internal Fragment View</h4>
  </div>
  <div class="d-flex justify-end px-4 mb-4" style="max-width: 97%">
    <v-btn id="settings-button" variant="text" icon="mdi-cog" size="medium"></v-btn>
    <v-menu :close-on-content-click="false" activator="#settings-button" location="bottom">
      <v-card min-width="300">
        <v-list>
          <v-list-item>
            <v-list-item-title>Fragment mass tolerance</v-list-item-title>
            <v-btn-toggle v-model="fragmentMassToleranceUnit">Text</v-btn-toggle>
          </v-list-item>
        </v-list>
      </v-card>
    </v-menu>
  </div>
  <v-sheet class="pa-4 rounded-lg" style="max-width: 97%" :theme="theme?.base ?? 'light'" border>
    <div id="internal-fragment-part">
      <div
        class="d-flex"
        style="border-bottom: white; border-bottom-width: 1px; border-bottom-style: solid"
      >
        <div
          v-for="(aa, aaIndex) in sequence"
          :key="`${aa}-${aaIndex}`"
          class="d-flex justify-center align-center fragment-segment sequence-text"
          :style="fragmentStyle"
        >
          {{ aa }}
        </div>
      </div>
      <div v-for="fragmentData in byData" :key="fragmentData.mass" class="d-flex">
        <div
          v-for="(aa, aaIndex) in sequence"
          :key="`${aa}-${aaIndex}`"
          :class="fragmentClasses(aaIndex, fragmentData.start, fragmentData.end, 'by-fragment')"
          style="border: 1px solid white"
          :style="fragmentStyle"
        ></div>
      </div>
      <div v-for="fragmentData in cyData" :key="fragmentData.mass" class="d-flex">
        <div
          v-for="(aa, aaIndex) in sequence"
          :key="`${aa}-${aaIndex}`"
          :class="fragmentClasses(aaIndex, fragmentData.start, fragmentData.end, 'cy-fragment')"
          style="border: 1px solid white"
          :style="fragmentStyle"
        ></div>
      </div>
      <div v-for="fragmentData in bzData" :key="fragmentData.mass" class="d-flex">
        <div
          v-for="(aa, aaIndex) in sequence"
          :key="`${aa}-${aaIndex}`"
          :class="fragmentClasses(aaIndex, fragmentData.start, fragmentData.end, 'bz-fragment')"
          style="border: 1px solid white"
          :style="fragmentStyle"
        ></div>
      </div>
    </div>
  </v-sheet>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useStreamlitDataStore } from '@/stores/streamlit-data'
import { useSelectionStore } from '@/stores/selection'
import { ExtraFragmentType } from '@/components/sequence/modification'
import type { InternalFragmentData } from '@/types/internal-fragment-data'

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
      fragmentMassToleranceUnit: true,
      fragmentMassTypes: {
        by: true,
        cy: true,
        bz: true,
      } as Record<'by' | 'cy' | 'bz', boolean>,
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
        height: (94 / (this.sequence?.length ?? 1)).toString() + 'vw',
        //'--amino-acid-cell-color': this.theme?.textColor ?? '#fff',
      }
    },
    fragToleranceUnit(): 'ppm' | 'Da' {
      console.log(this.fragmentMassToleranceUnit)
      return this.fragmentMassToleranceUnit ? 'ppm' : 'Da'
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
    fragmentClasses(
      sequenceIndex: number,
      startIndex: number,
      endIndex: number,
      className: string
    ) {
      const inFragment = sequenceIndex > startIndex && sequenceIndex <= endIndex
      return {
        [className]: inFragment,
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

.cy-fragment:extend(.fragment-segment) {
  background: #12871d;
}

.bz-fragment:extend(.fragment-segment) {
  background: #7831cc;
}

.not-in-fragment:extend(.fragment-segment) {
  background: transparent;
  aspect-ratio: 1;
}
</style>
