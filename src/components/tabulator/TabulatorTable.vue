<template>
  <div style="padding: 8px; width: 98%">
    <div class="d-flex">
      <div style="width: 100%; display: grid; grid-template-columns: 1fr 1fr 1fr">
        <div class="d-flex justify-start" style="grid-column: 1 / span 1">
          <v-btn
            variant="text"
            size="small"
            icon="mdi-filter"
            @click="openFilterDialog"
          />
          <v-btn
            variant="text"
            size="small"
            icon="mdi-download"
            @click="downloadTable"
          />
          <slot name="start-title-row"></slot>
        </div>
        <div class="d-flex justify-center" style="grid-column: 2 / span 1">
          <h4>
            <slot>{{ title ?? '' }}</slot>
          </h4>
        </div>
        <div class="d-flex justify-end" style="grid-column: 3 / span 1">
          <slot name="end-title-row"></slot>
        </div>
      </div>
    </div>
    <div :id="id" :class="tableClasses" @click="onTableClick"></div>
    
    <!-- Filter Dialog - Optimized for component constraints -->
    <v-dialog
      v-model="filterDialog"
      max-width="90%"
      :theme="streamlitDataStore.theme?.base ?? 'light'"
      class="filter-dialog-constrained"
    >
      <v-card>
        <v-card-title class="d-flex justify-space-between align-center">
          <span>Filter Options</span>
          <v-btn icon size="small" @click="filterDialog = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-divider></v-divider>
        <v-card-text>
          <!-- Plain white surface as specified -->
          <div style="height: 300px; background-color: white; border-radius: 4px; border: 1px solid #e0e0e0;">
            <div style="padding: 16px; text-align: center; color: #666;">
              Filter functionality will be implemented here
            </div>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" @click="filterDialog = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'
import { TabulatorFull as Tabulator, type ColumnDefinition, type Options, type Sorter } from 'tabulator-tables'
import { useStreamlitDataStore } from '@/stores/streamlit-data'

export default defineComponent({
  name: 'TabulatorTable',
  props: {
    tableIndexField: {
      type: String,
      required: false,
      default: () => 'id',
    },
    tableData: {
      type: Object as PropType<Record<string, unknown>[]>,
      required: true,
    },
    columnDefinitions: {
      type: Object as PropType<ColumnDefinition[]>,
      required: true,
    },
    title: {
      type: String,
      required: false,
    },
    index: {
      type: Number,
      required: true,
    },
    selectedRowIndexFromListening: {
      type: Number,
      required: false,
      default: () => undefined,
    },
    tableLayoutParam: {
      type: String as PropType<Options['layout']>,
      required: false,
      default: () => 'fitDataFill',
    },
    defaultRow: {
      type: Number,
      required: false,
      default: () => -1,
    },
    initialSort: {
      type: Array as PropType<Sorter[]>,
      required: false,
      default: () => undefined
    },
  },
  emits: ['rowSelected'],
  setup() {
    const streamlitDataStore = useStreamlitDataStore()
    return { streamlitDataStore }
  },
  data() {
    return {
      tabulator: undefined as Tabulator | undefined,
      initialized: 0 as number,
      filterDialog: false,
    }
  },
  computed: {
    id(): string {
      return `table-${this.index}`
    },
    containerStyles(): Record<string, any> {
      return {
        display: 'flex',
        'flex-direction': 'column',
        'align-items': 'center',
      }
    },
    tableClasses(): Record<string, boolean> {
      return {
        'table-dark': this.streamlitDataStore.theme?.base === 'dark',
        'table-light': this.streamlitDataStore.theme?.base === 'light',
        'table-striped': false,
        'table-bordered': true,
        'table-sm': true,
      }
    },
    preparedTableData(): Record<string, unknown>[] {

      const columns = [...this.columnDefinitions.map(col => col.field), 'id']
      if ((this.tableData !== undefined) && (this.tableData.length > 0)) {
        const tableDataWithId: Record<string, unknown>[] = []
        this.tableData.forEach((row, index) => {
          const filteredRow : Record<string, unknown> = {}
          columns.forEach(column => {
            if (column !== undefined) {
              filteredRow[column] = row[column];
            }
          })
          if (this.tableData[0][this.tableIndexField] === undefined) {
            tableDataWithId.push({
              ...filteredRow,
              [this.tableIndexField]: index,
            })
          }
          else {
            tableDataWithId.push({
              ...filteredRow
            })
          }
        })
        return tableDataWithId
      }
      return this.tableData
    },
  },
  watch: {
    tableData() {
      this.drawTable()
    },
    selectedRowIndexFromListening(newVal: number | undefined) {
      if (newVal !== undefined) {
        this.onSelectedRowListener(newVal)
      }
    },
  },
  mounted() {
    this.drawTable()
  },
  methods: {
    drawTable() {
      this.tabulator = new Tabulator(`#${this.id}`, {
        index: this.tableIndexField,
        data: this.preparedTableData,
        minHeight: 50,
        maxHeight: this.title ? 320 : 310,
        responsiveLayout : 'collapse',
        layout: this.tableLayoutParam,
        selectable: 1,
        columnDefaults: {
          title: '',
          hozAlign: 'right',
        },
        columns: this.columnDefinitions.map((col) => {
          if (col.headerTooltip === undefined) {
              col.headerTooltip = true;
          }
          return col
        }),
        initialSort: this.initialSort
      })
      this.tabulator.on('tableBuilt', () => {
        // First check if we have a selected row from listening
        if (this.selectedRowIndexFromListening !== undefined) {
          this.onSelectedRowListener(this.selectedRowIndexFromListening)
        } else {
          this.selectDefaultRow()
        }
      })
    },
    selectDefaultRow() {
      if (this.defaultRow >= 0) {
        // Get the visible rows after filtering
        const visibleRows = this.tabulator?.getRows('active');

        // Select the first visible row if there are any
        if (
          visibleRows 
          && visibleRows.length > 0 
          && this.defaultRow >= 0 
          && this.defaultRow < visibleRows.length
        ) {
            const firstRow = visibleRows[this.defaultRow];
            firstRow.select();
          this.onTableClick()

        }
      }
    },
    onTableClick() {
      const selectedRow = this.tabulator?.getSelectedRows()[0]?.getIndex()
      if (selectedRow !== undefined) {
        this.$emit('rowSelected', selectedRow)
      }
    },
    onSelectedRowListener(row: number) {
      this.tabulator?.scrollToRow(row, 'top', false)
      this.tabulator?.deselectRow()
      this.tabulator?.selectRow([row])
      this.onTableClick()
    },
    downloadTable() {
      if (this.tabulator !== undefined) this.tabulator.download('csv', `${this.title}.csv`)
    },
    openFilterDialog() {
      this.filterDialog = true
    },
  },
})
</script>

<style lang="scss">
// TODO overwrite bootstrap4 variables
//$borderColor:#ff4b4b;
//$headerTextColor:#fafafa;
//$headerBackgroundColor:#0e1117;
//$rowTextColor:#fafafa;
//$rowBackgroundColor:#0e1117;
//$rowAltBackgroundColor:#262730;

@import 'tabulator-tables/src/scss/themes/bootstrap/tabulator_bootstrap4';

.tabulator-col-title,
.tabulator-cell {
  font-size: 14px;
}

// Optimized dialog for component constraints
.filter-dialog-constrained {
  .v-card {
    max-height: 80vh;
    display: flex;
    flex-direction: column;
  }
  
  .v-card-text {
    overflow-y: auto;
    flex: 1;
    min-height: 0;
  }
}
</style>
