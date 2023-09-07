<template>
  <div class="pa-4" style="width: 97%">
    <v-row class="flex-nowrap">
      <div class="flex-grow-1 flex-shrink-0">
        <v-file-input
          v-model="uploadedResultFile"
          label="FLASHQuant .tsv results file"
        ></v-file-input>
      </div>
      <div class="flex-grow-1 flex-shrink-0">
        <v-file-input
          v-model="uploadedTraceFile"
          label="FLASHQuant _shared.tsv trace file"
        ></v-file-input>
      </div>
      <div class="d-flex justify-center ma-3 flex-grow-0 flex-shrink-0">
        <v-btn @click="parseFiles">Upload</v-btn>
      </div>
    </v-row>
  </div>
  <v-dialog v-model="loading" :scrim="false" persistent width="auto">
    <v-card color="primary">
      <v-card-text>
        Please stand by
        <v-progress-linear indeterminate color="white" class="mb-0"></v-progress-linear>
      </v-card-text>
    </v-card>
  </v-dialog>
  <!--  <div v-if="parsedResultFile.length > 0 && parsedTraceFile.length > 0">-->
  <!--    <TabulatorTable-->
  <!--      title="Feature groups"-->
  <!--      :table-data="parsedResultFile"-->
  <!--      :column-definitions="featureGroupTableColumnDefinitions"-->
  <!--      :index="0"-->
  <!--      table-index-field="FeatureGroupIndex"-->
  <!--    />-->
  <!--  </div>-->
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { parse, type ParseResult } from 'papaparse'
import { Streamlit } from 'streamlit-component-lib'
import TabulatorTable from '@/components/tabulator/TabulatorTable.vue'
import type { ColumnDefinition } from 'tabulator-tables'
import { useFileStore } from '@/stores/file'

export default defineComponent({
  name: 'FLASHQuantView',
  components: { TabulatorTable },
  setup() {
    const fileStore = useFileStore()
    return { fileStore }
  },
  data() {
    return {
      setHeightInterval: null as NodeJS.Timer | null, // currently just for development
      uploadedResultFile: null as File[] | null,
      uploadedTraceFile: null as File[] | null,
      parsedResultFile: [] as Record<string, unknown>[],
      parsedTraceFile: [] as Record<string, unknown>[],
      parsingResultFile: false,
      parsingTraceFile: false,
      featureGroupTableData: [] as Record<string, unknown>[],
      featureGroupTableColumnDefinitions: [
        { title: 'Index', field: 'FeatureGroupIndex' },
        { title: 'Monoisotopic Mass', field: 'MonoisotopicMass' },
        { title: 'Average Mass', field: 'AverageMass' },
        { title: 'Start Retention Time (FWHM)', field: 'StartRetentionTime(FWHM)' },
        { title: 'End Retention Time (FWHM)', field: 'EndRetentionTime(FWHM)' },
        { title: 'Feature Group Quantity', field: 'FeatureGroupQuantity' },
        { title: 'Feature Group Quantity', field: 'FeatureGroupQuantity' },
        { title: 'Min Charge', field: 'MinCharge' },
        { title: 'Max Charge', field: 'MaxCharge' },
        { title: 'Most Abundant Charge', field: 'MostAbundantFeatureCharge' },
        { title: 'Isotope Cosine Score', field: 'IsotopeCosineScore' },
      ] as ColumnDefinition[],
    }
  },
  computed: {
    loading(): boolean {
      return this.parsingResultFile || this.parsingTraceFile
    },
    resultFile(): File[] | null {
      if (this.uploadedResultFile) return this.uploadedResultFile
      return this.fileStore.getResultFile
    },
    traceFile(): File[] | null {
      if (this.uploadedTraceFile) return this.uploadedTraceFile
      return this.fileStore.getTreaceFile
    },
  },
  watch: {
    loading(newState: boolean) {
      if (!newState && this.parsedResultFile.length !== 0 && this.parsedTraceFile.length !== 0) {
        console.log('files loaded')
        this.connectTraceWithResult()
      }
    },
  },
  mounted() {
    this.setHeightInterval = setInterval(() => Streamlit.setFrameHeight(), 500)
    this.parseFiles()
  },
  unmounted() {
    if (this.setHeightInterval !== null) clearInterval(this.setHeightInterval)
  },
  methods: {
    parseFiles() {
      if (this.resultFile !== null && this.traceFile !== null) {
        if (this.uploadedResultFile) this.fileStore.updateResult(this.uploadedResultFile)
        if (this.uploadedTraceFile) this.fileStore.updateTrace(this.uploadedTraceFile)
        this.parsingResultFile = true
        this.parsingTraceFile = true
        parse(this.resultFile[0], {
          header: true,
          worker: true,
          delimiter: '\t',
          dynamicTyping: true,
          complete: (result: ParseResult<any>) => {
            this.parsedResultFile = result.data
            this.parsingResultFile = false
          },
        })
        parse(this.traceFile[0], {
          header: true,
          worker: true,
          delimiter: '\t',
          dynamicTyping: true,
          complete: (result: ParseResult<any>) => {
            this.parsedTraceFile = result.data
            this.parsingTraceFile = false
          },
        })
      }
      // TODO: add checker for validating two input files
    },
    connectTraceWithResult() {
      console.log('are we here?')
      const oldIndices = [
        ...new Set(this.parsedTraceFile.map((item) => item.FeatureGroupID)),
      ] as number[]
      let indexMap = new Map<number, number>(oldIndices.map((value) => [value, -1]))

      let counter = 0
      this.parsedResultFile.forEach((featureGroup) => {
        const thisIndex = featureGroup.FeatureGroupIndex
        const thisMass = featureGroup.MonoisotopicMass

        // const correspondingTraces = this.parsedTraceFile.filter((item) => item.Mass == thisMass)
        let correspondingTraces = []
        this.parsedTraceFile.forEach((item) => {
          if (item['Mass'] === thisMass) correspondingTraces.push(item)
        })
        if (correspondingTraces.length == 0) counter += 1
      })
      console.log('notFound/all = ', counter, this.parsedResultFile.length)
    },
  },
})
</script>

<style scoped lang="less"></style>
