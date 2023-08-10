<template>
  <div style="padding: 8px;">
    <div v-if="args.title" :style="containerStyles">
      <h4>{{ args.title }}</h4>
    </div>
    <div :id="id" :class="tableClasses" @click="logSelected"></div>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'
import { TabulatorFull as Tabulator, type ColumnDefinition } from 'tabulator-tables'
import { useStreamlitDataStore } from '@/stores/streamlit-data'
import type { TabulatorTableArguments } from './tabulator-table'
import { v4 as uuid } from "uuid";

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
    },
    index: {
      type: Number,
      required: true
    }
  },
  computed: {
    id(): string {
      return `table-${this.index}`
    },
    containerStyles(): Record<string, any> {
      return {
        'display': 'flex',
        'flex-direction': 'column',
        'align-items': 'center',
      }
    },
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
  created() {
    this.id = uuid()
  },
  mounted() {
    console.log(this.args);
    this.tabulator = new Tabulator(`#${this.id}`, {
      data: JSON.parse(this.args.data),
      index: 'index',
      minHeight: 50,
      maxHeight: this.args.title ? 440 : 430,
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
