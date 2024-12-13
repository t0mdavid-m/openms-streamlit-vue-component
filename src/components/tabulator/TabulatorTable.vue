<template>
  <div style="padding: 8px; width: 98%">
    <div class="d-flex">
      <div style="width: 100%; display: grid; grid-template-columns: 1fr 1fr 1fr">
        <div class="d-flex justify-end" style="grid-column: 1 / span 1">
          <slot name="start-title-row"></slot>
        </div>
        <div class="d-flex justify-center" style="grid-column: 2 / span 1">
          <h4 :id="`${id}-title`">
            <slot>{{ title ?? '' }}</slot>
          </h4>
          <v-menu :activator="`#${id}-title`" location="bottom">
            <v-card min-width="100">
              <v-btn prepend-icon="mdi-download" @click="downloadTable">Download</v-btn>
            </v-card>
          </v-menu>
        </div>
        <div class="d-flex justify-end" style="grid-column: 3 / span 1">
          <slot name="end-title-row"></slot>
        </div>
      </div>
    </div>
    <div :id="id" :class="tableClasses" @click="onTableClick"></div>
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
      default: () => 0,
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
      // this.tabulator.on('tableBuilt', () => {
      //   if (this.initialized < 3) {
      //     this.initialized += 1
      //     this.selectDefaultRow()
      //   }
      // })
    },
    selectDefaultRow() {
      if (this.defaultRow >= 0) {
        this.tabulator?.selectRow([this.defaultRow])
        this.onTableClick()
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
</style>
