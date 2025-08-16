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
          <!-- Column Pills Toolbar -->
          <div style="background-color: white; border-radius: 4px; border: 1px solid #e0e0e0; padding: 16px;">
            <div style="margin-bottom: 12px;">
              <h6 style="color: #333; margin: 0;">Select Columns:</h6>
            </div>
            <div style="display: flex; flex-wrap: wrap; gap: 8px;">
              <v-chip
                v-for="column in columnNames"
                :key="column.field"
                :color="selectedColumns.includes(column.field) ? 'primary' : 'default'"
                :variant="selectedColumns.includes(column.field) ? 'flat' : 'outlined'"
                size="small"
                clickable
                @click="toggleColumnSelection(column.field)"
              >
                {{ column.title }}
              </v-chip>
            </div>
            <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e0e0e0;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: #666; font-size: 14px;">
                  {{ selectedColumns.length }} of {{ columnNames.length }} columns selected
                </span>
                <div>
                  <v-btn
                    size="small"
                    variant="outlined"
                    @click="selectAllColumns"
                    style="margin-right: 8px;"
                  >
                    Select All
                  </v-btn>
                  <v-btn
                    size="small"
                    variant="outlined"
                    @click="clearColumnSelection"
                  >
                    Clear All
                  </v-btn>
                </div>
              </div>
            </div>
          </div>

          <!-- Dynamic Filter Components -->
          <div v-if="selectedColumns.length > 0" style="margin-top: 24px;">
            <div style="margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center;">
              <h6 style="color: #333; margin: 0;">Filter Settings:</h6>
              <div>
                <v-btn
                  size="small"
                  variant="outlined"
                  @click="applyFilters"
                  style="margin-right: 8px;"
                  color="primary"
                >
                  Apply Filters
                </v-btn>
                <v-btn
                  size="small"
                  variant="outlined"
                  @click="clearFilters"
                  color="error"
                >
                  Clear Filters
                </v-btn>
              </div>
            </div>
            
            <div class="filter-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; background-color: #f9f9f9; border-radius: 4px; padding: 16px;">
              <div
                v-for="columnField in selectedColumns"
                :key="columnField"
                class="filter-item"
                style="display: flex; flex-direction: column; gap: 8px;"
              >
                <label style="font-weight: 500; font-size: 14px; color: #555;">
                  {{ getColumnTitle(columnField) }}
                  <span style="font-size: 12px; color: #888; font-weight: normal;">
                    ({{ getFilterType(columnField) }})
                  </span>
                </label>
                
                <!-- Categorical Filter -->
                <v-select
                  v-if="getFilterType(columnField) === 'categorical' && filterValues[columnField]"
                  v-model="filterValues[columnField].categorical"
                  :items="getUniqueValues(columnField)"
                  multiple
                  chips
                  label="Select values"
                  clearable
                  density="compact"
                  variant="outlined"
                  @update:model-value="applyFilters"
                />

                <!-- Numeric Range Filter -->
                <div v-else-if="getFilterType(columnField) === 'numeric' && filterValues[columnField]" style="padding: 8px 0;">
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                    <v-text-field
                      :model-value="filterValues[columnField]?.numeric?.min || getMinValue(columnField)"
                      type="number"
                      label="Min"
                      :placeholder="`Min: ${getMinValue(columnField)}`"
                      density="compact"
                      variant="outlined"
                      :min="getMinValue(columnField)"
                      :max="getMaxValue(columnField)"
                      @update:model-value="(value: string) => updateNumericFilterMin(columnField, value)"
                      @blur="validateAndApplyNumericFilter(columnField)"
                    />
                    <v-text-field
                      :model-value="filterValues[columnField]?.numeric?.max || getMaxValue(columnField)"
                      type="number"
                      label="Max"
                      :placeholder="`Max: ${getMaxValue(columnField)}`"
                      density="compact"
                      variant="outlined"
                      :min="getMinValue(columnField)"
                      :max="getMaxValue(columnField)"
                      @update:model-value="(value: string) => updateNumericFilterMax(columnField, value)"
                      @blur="validateAndApplyNumericFilter(columnField)"
                    />
                  </div>
                  <div style="display: flex; justify-content: space-between; font-size: 12px; color: #666; margin-top: 4px;">
                    <span>Data range: {{ getMinValue(columnField) }} - {{ getMaxValue(columnField) }}</span>
                  </div>
                </div>

                <!-- Text/Regex Filter -->
                <v-text-field
                  v-else-if="filterValues[columnField]"
                  v-model="filterValues[columnField].text"
                  label="Search pattern (regex supported)"
                  clearable
                  density="compact"
                  variant="outlined"
                  @update:model-value="applyFilters"
                />
              </div>
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
      selectedColumns: [] as string[],
      filterValues: {} as Record<string, {
        categorical?: string[],
        numeric?: { min: number, max: number },
        text?: string
      }>,
      filterTypes: {} as Record<string, 'categorical' | 'numeric' | 'text'>,
      columnAnalysis: {} as Record<string, {
        uniqueValues: any[],
        minValue?: number,
        maxValue?: number,
        dataType: 'categorical' | 'numeric' | 'text'
      }>,
      debouncedTimeout: undefined as NodeJS.Timeout | undefined,
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
    columnNames(): { field: string; title: string }[] {
      return this.columnDefinitions.map(col => ({
        field: col.field || '',
        title: col.title || col.field || ''
      })).filter(col => col.field !== '');
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
    selectedColumns: {
      handler(newColumns: string[]) {
        // Initialize filter values for newly selected columns
        newColumns.forEach(columnField => {
          this.initializeFilterValue(columnField);
        });
      },
      immediate: true
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
    toggleColumnSelection(columnField: string) {
      const index = this.selectedColumns.indexOf(columnField);
      if (index > -1) {
        this.selectedColumns.splice(index, 1);
        // Clean up filter state when column is unselected
        this.cleanupFilterForColumn(columnField);
      } else {
        this.selectedColumns.push(columnField);
        // Immediately initialize filter value for new column
        this.$nextTick(() => {
          this.initializeFilterValue(columnField);
        });
      }
    },
    selectAllColumns() {
      this.selectedColumns = [...this.columnNames.map(col => col.field)];
    },
    clearColumnSelection() {
      this.selectedColumns = [];
      // Clear all filter state when clearing column selection
      this.filterValues = {};
      this.filterTypes = {};
      this.columnAnalysis = {};
      // Clear tabulator filters
      this.tabulator?.clearFilter(true);
    },
    // Data analysis utilities
    analyzeColumn(columnField: string) {
      if (this.columnAnalysis[columnField]) {
        return this.columnAnalysis[columnField];
      }

      const column = this.columnDefinitions.find(col => col.field === columnField);
      const values = this.preparedTableData
        .map(row => row[columnField])
        .filter(v => v != null && v !== '');
      
      const uniqueValues = [...new Set(values)];
      const sorter = column?.sorter;
      
      let dataType: 'categorical' | 'numeric' | 'text';
      let minValue: number | undefined;
      let maxValue: number | undefined;

      // Type detection logic
      if (sorter === 'number') {
        const numericValues = values.filter(v => typeof v === 'number' || !isNaN(Number(v)));
        if (numericValues.length > 0) {
          const numbers = numericValues.map(v => Number(v));
          minValue = Math.min(...numbers);
          maxValue = Math.max(...numbers);
          
          // If less than 20 unique values, treat as categorical
          dataType = uniqueValues.length <= 20 ? 'categorical' : 'numeric';
        } else {
          dataType = 'text';
        }
      } else {
        // For string columns or no sorter, check if it looks categorical
        dataType = uniqueValues.length <= 50 ? 'categorical' : 'text';
      }

      const analysis = {
        uniqueValues: uniqueValues.slice(0, 100), // Limit for performance
        minValue,
        maxValue,
        dataType
      };

      this.columnAnalysis[columnField] = analysis;
      this.filterTypes[columnField] = dataType;
      
      return analysis;
    },
    getFilterType(columnField: string): 'categorical' | 'numeric' | 'text' {
      if (!this.filterTypes[columnField]) {
        this.analyzeColumn(columnField);
      }
      return this.filterTypes[columnField];
    },
    getUniqueValues(columnField: string): string[] {
      const analysis = this.analyzeColumn(columnField);
      return analysis.uniqueValues.map(v => String(v)).sort();
    },
    getMinValue(columnField: string): number {
      const analysis = this.analyzeColumn(columnField);
      return analysis.minValue ?? 0;
    },
    getMaxValue(columnField: string): number {
      const analysis = this.analyzeColumn(columnField);
      return analysis.maxValue ?? 100;
    },
    getColumnTitle(columnField: string): string {
      const column = this.columnDefinitions.find(col => col.field === columnField);
      return column?.title || columnField;
    },
    // Filter management
    initializeFilterValue(columnField: string) {
      if (!this.filterValues[columnField]) {
        const filterType = this.getFilterType(columnField);
        const newFilterValue = {} as any;
        
        switch (filterType) {
          case 'categorical':
            newFilterValue.categorical = [];
            break;
          case 'numeric':
            newFilterValue.numeric = { min: this.getMinValue(columnField), max: this.getMaxValue(columnField) };
            break;
          case 'text':
            newFilterValue.text = '';
            break;
        }
        
        // Direct assignment works in Vue 3
        this.filterValues[columnField] = newFilterValue;
      }
    },
    applyFilters() {
      if (!this.tabulator) return;

      // Clear any existing debounce
      if (this.debouncedTimeout) {
        clearTimeout(this.debouncedTimeout);
      }

      // Debounce for better performance
      this.debouncedTimeout = setTimeout(() => {
        if (!this.tabulator) return;

        this.tabulator.clearFilter(true);
        
        this.selectedColumns.forEach(columnField => {
          const filterValue = this.filterValues[columnField];
          const filterType = this.filterTypes[columnField];
          
          if (!filterValue) return;

          switch (filterType) {
            case 'categorical':
              if (filterValue.categorical?.length) {
                // Convert string values back to original data type for numeric columns
                const column = this.columnDefinitions.find(col => col.field === columnField);
                const isNumericColumn = column?.sorter === 'number';
                
                const filterValues = isNumericColumn
                  ? filterValue.categorical.map(v => {
                      const num = Number(v);
                      return isNaN(num) ? v : num;
                    })
                  : filterValue.categorical;
                
                this.tabulator?.addFilter(columnField, 'in', filterValues);
              }
              break;
            case 'numeric':
              if (filterValue.numeric) {
                this.tabulator?.addFilter(columnField, '>=', filterValue.numeric.min);
                this.tabulator?.addFilter(columnField, '<=', filterValue.numeric.max);
              }
              break;
            case 'text':
              if (filterValue.text) {
                this.tabulator?.addFilter(columnField, 'regex', filterValue.text);
              }
              break;
          }
        });
      }, 300);
    },
    updateNumericFilter(columnField: string, value: number[]) {
      if (!this.filterValues[columnField]) {
        this.filterValues[columnField] = {};
      }
      this.filterValues[columnField].numeric = { min: value[0], max: value[1] };
      this.applyFilters();
    },
    updateNumericFilterMin(columnField: string, value: string) {
      if (!this.filterValues[columnField]) {
        this.filterValues[columnField] = {};
      }
      if (!this.filterValues[columnField].numeric) {
        this.filterValues[columnField].numeric = {
          min: this.getMinValue(columnField),
          max: this.getMaxValue(columnField)
        };
      }
      const numValue = value === '' ? this.getMinValue(columnField) : Number(value);
      if (!isNaN(numValue)) {
        this.filterValues[columnField].numeric!.min = numValue;
      }
    },
    updateNumericFilterMax(columnField: string, value: string) {
      if (!this.filterValues[columnField]) {
        this.filterValues[columnField] = {};
      }
      if (!this.filterValues[columnField].numeric) {
        this.filterValues[columnField].numeric = {
          min: this.getMinValue(columnField),
          max: this.getMaxValue(columnField)
        };
      }
      const numValue = value === '' ? this.getMaxValue(columnField) : Number(value);
      if (!isNaN(numValue)) {
        this.filterValues[columnField].numeric!.max = numValue;
      }
    },
    validateAndApplyNumericFilter(columnField: string) {
      const filterValue = this.filterValues[columnField]?.numeric;
      if (!filterValue) return;

      const dataMin = this.getMinValue(columnField);
      const dataMax = this.getMaxValue(columnField);

      // Ensure min is not greater than max
      if (filterValue.min > filterValue.max) {
        const temp = filterValue.min;
        filterValue.min = filterValue.max;
        filterValue.max = temp;
      }

      // Clamp values to data bounds
      filterValue.min = Math.max(filterValue.min, dataMin);
      filterValue.max = Math.min(filterValue.max, dataMax);

      // Ensure min is not greater than max after clamping
      if (filterValue.min > filterValue.max) {
        filterValue.min = dataMin;
        filterValue.max = dataMax;
      }

      this.applyFilters();
    },
    clearFilters() {
      this.tabulator?.clearFilter(true);
      this.filterValues = {};
      this.selectedColumns.forEach(columnField => {
        this.initializeFilterValue(columnField);
      });
    },
    cleanupFilterForColumn(columnField: string) {
      // Remove filter values for the unselected column
      if (this.filterValues[columnField]) {
        delete this.filterValues[columnField];
      }
      
      // Remove filter types for the unselected column
      if (this.filterTypes[columnField]) {
        delete this.filterTypes[columnField];
      }
      
      // Remove column analysis for the unselected column
      if (this.columnAnalysis[columnField]) {
        delete this.columnAnalysis[columnField];
      }
      
      // Reapply filters after cleanup
      this.applyFilters();
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
