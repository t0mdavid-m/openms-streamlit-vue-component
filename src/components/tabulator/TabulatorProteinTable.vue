<template>
  <TabulatorTable
    :table-data="tableData"
    :column-definitions="columnDefinitions"
    title="Protein Table"
    :index="index"
    :selected-row-index-from-listening="selectedRow"
    :default-row=0
    @row-selected="updateSelectedProtein"
  />
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'
import { useStreamlitDataStore } from '@/stores/streamlit-data'
import type { TabulatorTableArguments } from './tabulator-table'
import { useSelectionStore } from '@/stores/selection'
import TabulatorTable from './TabulatorTable.vue'
import type { ColumnDefinition } from 'tabulator-tables'
import { toFixedFormatter } from '@/components/tabulator/tabulator-formatters'

export default defineComponent({
  name: 'TabulatorProteinTable',
  components: {
    TabulatorTable,
  },
  props: {
    args: {
      type: Object as PropType<TabulatorTableArguments>,
      required: true,
    },
    index: {
      type: Number,
      required: true,
    },
  },
  setup() {
    const streamlitDataStore = useStreamlitDataStore()
    const selectionStore = useSelectionStore()
    return { streamlitDataStore, selectionStore }
  },
  data() {
    return {
      columnDefinitions: [
        //{ title: 'Index', field: 'id' },
        { title: 'Accession', field: 'accession'},
        { title: 'Description', field: 'description'},
        { title: 'Length', field: 'length'},
        { title: '#Matched Amino Acids', field: 'MatchedAminoAcidCount'},
        { title: 'Coverage (%)', field: 'Coverage(%)'},
        { title: 'Score', field: 'ProteinScore'},
        { title: 'Q-Value', field: 'ProteinQvalue'},
      ] as ColumnDefinition[],
    }
  },
  computed: {
    selectedRow(): number | undefined {
      return this.selectionStore.selectedProteinIndex
    },
    tableData(): Record<string, unknown>[] {
      const rows = this.streamlitDataStore.dataForDrawing.protein_table
      rows.forEach((row) => (row['id'] = row['index']))
      return rows
    },
  },
  methods: {
    updateSelectedProtein(selectedRow?: number) {
      console.log('SelectedProtein!!')
      console.log(selectedRow)
      if (selectedRow !== undefined) {
        this.selectionStore.updateSelectedProtein(selectedRow)
        this.selectionStore.updateSelectedTag(undefined)
        this.selectionStore.updateTagData(undefined)
      }
    },
  },
},
)
</script>
