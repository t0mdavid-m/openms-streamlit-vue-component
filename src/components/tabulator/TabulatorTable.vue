<template>
  <div style="padding: 8px; width: 98%">
    <div v-if="title" :style="containerStyles">
      <h4 :id="`${id}-title`">{{ title }}</h4>
      <v-menu :activator="`#${id}-title`" location="bottom">
        <v-card min-width="100">
          <v-btn prepend-icon="mdi-download" @click="downloadTable">Download</v-btn>
        </v-card>
      </v-menu>
    </div>
    <div :id="id" :class="tableClasses" @click="onTableClick"></div>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'
import { TabulatorFull as Tabulator, type ColumnDefinition } from 'tabulator-tables'
import { useStreamlitDataStore } from '@/stores/streamlit-data'

export default defineComponent({
  name: 'TabulatorTable',
  props: {
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
      default: () => 'Table',
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
  },
  emits: ['rowSelected'],
  setup() {
    const streamlitDataStore = useStreamlitDataStore()
    return { streamlitDataStore }
  },
  data() {
    return {
      tabulator: undefined as Tabulator | undefined,
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
      if (this.tableData.length > 0 && this.tableData[0].id === undefined) {
        const tableDataWithId: Record<string, unknown>[] = []
        this.tableData.forEach((row, index) => {
          tableDataWithId.push({
            ...row,
            id: index,
          })
        })
        return tableDataWithId
      }
      return this.tableData
    }
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
        data: this.preparedTableData,
        minHeight: 50,
        maxHeight: this.title ? 320 : 310,
        layout: 'fitColumns',
        selectable: 1,
        columns: this.columnDefinitions.map((col) => {
          col.headerTooltip = true
          return col
        }),
      })
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
    }
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
</style>
