<template>
  <div id="table" :class="tableClasses" @click="logSelected"></div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'
import { TabulatorFull as Tabulator, type ColumnDefinition } from 'tabulator-tables'
import { useStreamlitDataStore } from '@/stores/streamlit-data'
import type { TabulatorTableArguments } from './tabulator-table'

export default defineComponent({
  name: 'TabulatorTable',
  data() {
    return {
      tabulator: undefined as Tabulator | undefined
    }
  },
  props: {
    args: {
      type: Object as PropType<TabulatorTableArguments>,
      required: true
    }
  },
  computed: {
    tableClasses(): Record<string, boolean> {
      return {
        'table-dark': this.streamlitDataStore.theme?.base === 'dark',
        'table-light': this.streamlitDataStore.theme?.base === 'light',
        'table-striped': true,
        'table-bordered': true,
        'table-sm': true
      }
    },
  },
  setup() {
    const streamlitDataStore = useStreamlitDataStore()
    return { streamlitDataStore }
  },
  mounted() {
    console.log(this.args);
    this.tabulator = new Tabulator('#table', {
      data: JSON.parse(this.args.data),
      index: 'index',
      maxHeight: '440px',
      layout: 'fitColumns',
      selectable: 1,
      reactiveData: true,
      columns: this.args.columns.map(column => JSON.parse(column))
    })
  },
  methods: {
    logSelected() {
      // TODO handle row selection better. This style will also trigger on non-row clicks inside the div!
      console.log(this.tabulator?.getSelectedRows()[0].getIndex())
    }
  }
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
