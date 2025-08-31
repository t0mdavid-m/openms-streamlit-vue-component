<template>
  <TabulatorTable
    :table-data="tableData"
    :column-definitions="columnDefinitions"
    title="Protein Table"
    :index="index"
    :selected-row-index-from-listening="selectedRow"
    :default-row=0
    :initial-sort="initialSort"
    :go-to-fields="['Scan', 'accession']"
    @row-selected="updateSelectedProtein"
  />
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'
import { useStreamlitDataStore } from '@/stores/streamlit-data'
import type { TabulatorTableArguments } from './tabulator-table'
import { useSelectionStore } from '@/stores/selection'
import TabulatorTable from './TabulatorTable.vue'
import type { ColumnDefinition, Sorter } from 'tabulator-tables'
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
        { 
          title: 'Scan No.', field: 'Scan', sorter: 'number',  
          headerTooltip: 'The identifier of the mass spectrometry scan associated with the identified proteoform.'
        },
        { 
          title: 'Accession', field: 'accession',
          headerTooltip: 'The unique identifier for the protein in the reference database.'
        },
        { 
          title: 'Description', field: 'description', responsive: 10
        },
        { 
          title: 'Length', field: 'length', responsive: 6, sorter: 'number',
          headerTooltip: 'The total number of amino acids in the matched protein.'
        },
        { 
          title: 'Mass', field: 'ProteoformMass', responsive: 8, sorter: 'number',
          headerTooltip: 'The calculated mass of the proteoform in Daltons.',
          formatter: function (cell) {
            const value = cell.getValue();
            return value == -1 ? '-' : value;
          }
        },
        { 
          title: 'No. of Matched Fragments', field: 'MatchingFragments', sorter: 'number',
          headerTooltip: 'The number of fragment ions that match the protein sequence.'
        },
        // { 
        //   title: 'Coverage (%)', field: 'Coverage(%)', responsive: 7, sorter: 'number',
        // },
        { 
          title: 'No. of Modifications', field: 'ModCount', sorter: 'number',
          headerTooltip: 'The number of modifications identified in the protein.'
        },
        { 
          title: 'No. of Tags', field: 'TagCount', sorter: 'number',
          headerTooltip: 'The number of sequence tags associated with the proteoform match.'
        },
        { 
          title: 'Score', field: 'Score', sorter: 'number',
          headerTooltip: 'A score indicating the confidence of the protein match (higher is better).'
        },
        { 
          title: 'Q-Value (Proteoform Level)', field: 'ProteoformLevelQvalue', sorter: 'number',
          headerTooltip: 'The confidence value of the protein match at the proteoform level.',
          formatter: function (cell) {
            const value = cell.getValue();
            return value == -1 ? '-' : value;
          }
        },
      ] as ColumnDefinition[],
      initialSort: [
        {column: 'Score', dir: 'desc'}
      ] as Sorter[]
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
      if (selectedRow !== undefined) {
        this.selectionStore.updateSelectedProtein(selectedRow)
        
        // Add diagnostic logging for debugging
        const proteinTable = this.streamlitDataStore.dataForDrawing.protein_table
        console.log('[DEBUG] updateSelectedProtein called:')
        console.log('  selectedRow (from getIndex()):', selectedRow)
        console.log('  protein_table length:', proteinTable?.length)
        
        // Validate protein table exists
        if (!proteinTable || !Array.isArray(proteinTable) || proteinTable.length === 0) {
          console.error('[ERROR] protein_table is not available or empty')
          return
        }
        
        // FIX: Find protein by index field instead of using selectedRow as array index
        // selectedRow is actually the ProteoformIndex (ID), not array position
        const selectedProtein = proteinTable.find(protein =>
          protein && (protein.index === selectedRow || protein.id === selectedRow)
        )
        
        if (!selectedProtein) {
          console.error('[ERROR] Could not find protein with index/id:', selectedRow)
          console.error('  Available protein indices:', proteinTable.map(p => p?.index || p?.id).slice(0, 10))
          return
        }
        
        console.log('  Found protein:', selectedProtein)
        const scan_number = selectedProtein['Scan']
        console.log('  scan_number found:', scan_number)
        
        if ((scan_number !== undefined) && (typeof scan_number == 'number')) {
          const scan_id = this.streamlitDataStore.allDataForDrawing.per_scan_data.findIndex((data) => data['Scan'] === scan_number)
          this.selectionStore.updateSelectedScan(scan_id)
        }
        this.selectionStore.updateSelectedTag(undefined)
        this.selectionStore.updateTagData(undefined)
      }
    },
  },
},
)
</script>
