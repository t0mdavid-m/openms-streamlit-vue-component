<template>
  <TabulatorTable
    :table-data="tableData"
    :column-definitions="columnDefinitions"
    title="Tag Table"
    :index="index"
    :selected-row-index-from-listening="selectedRow"
    @row-selected="updateSelectedTag"
    :default-row=1
    :initial-sort="initialSort"
  />
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'
import { useStreamlitDataStore } from '@/stores/streamlit-data'
import type { TabulatorTableArguments } from './tabulator-table'
import { useSelectionStore } from '@/stores/selection'
import TabulatorTable from './TabulatorTable.vue'
import type { ColumnDefinition, Sorter } from 'tabulator-tables'

export default defineComponent({
  name: 'TabulatorTagTable',
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
        { 
          title: 'Scan Number', field: 'Scan', sorter: 'number',  
          headerTooltip: 'The identifier of the mass spectrometry scan containing the sequence tag.'
        },
        { 
          title: 'Start Position', field: 'StartPos', sorter: 'number',  
          headerTooltip: 'The position in the protein sequence where the sequence tag begins.'
        },
        { 
          title: 'End Position', field: 'EndPos' , sorter: 'number',
          headerTooltip: 'The position in the protein sequence where the sequence tag ends.'
        },
        { 
          title: 'Sequence', field: 'TagSequence', sorter: 'number',
          headerTooltip: 'The amino acid sequence of the identified tag.'
        },
        { 
          title: 'Length', field: 'Length' , sorter: 'number',
          headerTooltip: 'The number of amino acids in the sequence tag.'
        },
        { 
          title: 'Tag Score', field: 'Score' , sorter: 'number',
          headerTooltip: 'A score indicating the confidence of the sequence tag identification (higher is better).'
        },
        { 
          title: 'N mass', field: 'Nmass' , sorter: 'number',
          headerTooltip: 'The N-terminal mass offset from the start of the sequence tag in Daltons.',
          formatter: function (cell) {
            const value = cell.getValue();
            return value == -1 ? '-' : value;
          }
        },
        { 
          title: 'C mass', field: 'Cmass' , sorter: 'number',
          headerTooltip: 'The C-terminal mass offset from the end of the sequence tag in Daltons.',
          formatter: function (cell) {
            const value = cell.getValue();
            return value == -1 ? '-' : value;
          }
        },
        { 
          title: 'Δ mass', field: 'DeltaMass' , sorter: 'number',
          // ToDo: Add example
          headerTooltip: 'Delta mass is the difference between the tag flanking mass and the (partial) proteoform mass, from its terminal to the tag boundary.'
        },
      ] as ColumnDefinition[],
      initialSort: [
        {column: 'Score', dir: 'desc'},
      ] as Sorter[],
      selectedTagIndex: undefined as number | undefined,

    }
  },
  computed: {
    selectedRow(): number | undefined {
      return this.selectionStore.selectedTagIndex
    },
    tableData(): Record<string, unknown>[] {
      const rows = this.streamlitDataStore.dataForDrawing.tag_table
      let filteredRows = rows.filter(row => row['ProteinIndex'] === this.selectionStore.selectedProteinIndex)
      const selectedAA = this.selectionStore.selectedAApos
      if (selectedAA !== undefined) {
        filteredRows = filteredRows.filter(row => {
          const startPos = row['StartPos'];
          const endPos = row['EndPos'];
          return (typeof startPos === 'number' && typeof endPos === 'number' && startPos <= selectedAA && endPos >= selectedAA);
        });
      }
      filteredRows.forEach(row => row['id'] = row['TagIndex'])
      return filteredRows
    }
  },
  watch: {
  },
  methods: {
    getRowByTagIndex(tagIndex : number) {
      const rows = this.tableData
      const row = rows.find(r => r['id'] === tagIndex)
      return row
    },

    updateSelectedTag(selectedRow?: number) {
      if (selectedRow === undefined) {
        return
      }
      this.selectionStore.updateSelectedTag(selectedRow)

      const row = this.getRowByTagIndex(selectedRow)
      if (row === undefined) {
        return
      }
      
      const mzs = row['mzs']
      let masses : number[] = []
      if (typeof mzs === 'string') {
        masses = mzs.split(',').map(Number).filter(number => number !== 0);
      }
      const startPos: number = typeof row['StartPos'] === 'number' ? row['StartPos'] : 0
      const endPos: number = typeof row['EndPos'] === 'number' ? row['EndPos'] : 0
      let tagPos : number = -1000

      if (
        (startPos !== undefined) && 
        (this.selectionStore.selectedAApos !== undefined) &&
        (typeof startPos === "number")
      ) {
        tagPos = this.selectionStore.selectedAApos - startPos
      }
      const sequence = row['TagSequence']
      let tagSequence : String = ""
      if (typeof sequence === "string") {
        tagSequence = sequence
      }

      let nTerminal : Boolean = false
      if (row["N mass"] === -1) {
          nTerminal = true
      }

      this.selectionStore.updateTagData(
        {
          sequence: tagSequence,
          nTerminal: nTerminal,
          masses: masses,
          selectedAA: tagPos,
          startPos: startPos,
          endPos: endPos
        }
      )
    },
  },
})
</script>
