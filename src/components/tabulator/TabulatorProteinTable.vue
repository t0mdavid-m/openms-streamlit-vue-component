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
  >
    <template #end-title-row>
      <v-checkbox
        v-model="bestPerSpectrumOnly"
        label="Best per spectrum"
        hide-details
        density="compact"
        color="primary"
      />
    </template>
  </TabulatorTable>
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
      // Show only the best (highest-Score) proteoform hit per spectrum by
      // default; users can switch this off to see every hit.
      bestPerSpectrumOnly: true,
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
      if (!rows) {
        return []
      }
      // Map to fresh row objects (never mutate the store array) so every
      // recompute yields a new reference -- this keeps the store's full list
      // intact for selection lookups and reliably triggers the base table's
      // `watch tableData -> drawTable` when the toggle flips.
      const rowsWithId = rows.map((row) => ({ ...row, id: row['index'] }))
      return this.bestPerSpectrumOnly
        ? this.filterBestPerSpectrum(rowsWithId)
        : rowsWithId
    },
  },
  watch: {
    // When the toggle changes and the currently selected proteoform is no
    // longer visible (its hit was filtered out), reselect the surviving best
    // hit of the same scan so the table highlight and the Python-synced side
    // panels (sequence view, tag table, spectrum) stay consistent.
    bestPerSpectrumOnly() {
      this.$nextTick(() => {
        const selected = this.selectionStore.selectedProteinIndex
        if (selected === undefined) {
          return
        }
        const stillVisible = this.tableData.some(
          (row) => row['index'] === selected || row['id'] === selected
        )
        if (stillVisible) {
          return
        }
        const current = this.streamlitDataStore.dataForDrawing.protein_table?.find(
          (row) => row['index'] === selected || row['id'] === selected
        )
        const scan = current?.['Scan']
        const replacement = this.tableData.find((row) => row['Scan'] === scan)
        if (replacement === undefined) {
          return
        }
        const replacementIndex = replacement['index']
        if (typeof replacementIndex === 'number') {
          this.updateSelectedProtein(replacementIndex)
        }
      })
    },
  },
  methods: {
    /**
     * Collapse the rows to the highest-Score proteoform hit per spectrum
     * (Scan). Rows without a numeric Scan are passed through unchanged so they
     * are never grouped together; ties keep the first-seen row.
     */
    filterBestPerSpectrum(
      rows: Record<string, unknown>[]
    ): Record<string, unknown>[] {
      const bestByScan = new Map<number, Record<string, unknown>>()
      const passthrough: Record<string, unknown>[] = []
      for (const row of rows) {
        const scan = row['Scan']
        if (typeof scan !== 'number' || Number.isNaN(scan)) {
          passthrough.push(row)
          continue
        }
        const existing = bestByScan.get(scan)
        if (
          existing === undefined ||
          this.toScore(row['Score']) > this.toScore(existing['Score'])
        ) {
          bestByScan.set(scan, row)
        }
      }
      return [...bestByScan.values(), ...passthrough]
    },
    /** Coerce an unknown Score to a comparable number; NaN/missing -> -Infinity. */
    toScore(value: unknown): number {
      const n = typeof value === 'number' ? value : Number(value)
      return Number.isNaN(n) ? Number.NEGATIVE_INFINITY : n
    },
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
