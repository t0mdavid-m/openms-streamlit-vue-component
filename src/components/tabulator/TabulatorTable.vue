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
    
    <!-- Filter Dialog - Fullscreen for better iframe experience -->
    <v-dialog
      v-model="filterDialog"
      fullscreen
      :theme="streamlitDataStore.theme?.base ?? 'light'"
      :attach="false"
      :persistent="false"
      transition="dialog-bottom-transition"
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
            <div style="margin-bottom: 16px;">
              <h6 style="color: #333; margin: 0;">Filter Settings:</h6>
            </div>
            
            <div class="filter-container" style="display: flex; flex-direction: column; gap: 16px; background-color: #f9f9f9; border-radius: 4px; padding: 16px;">
              <div
                v-for="columnField in selectedColumns"
                :key="columnField"
                class="filter-item"
                style="display: flex; flex-direction: column; gap: 8px; padding: 12px; background-color: white; border-radius: 4px; border: 1px solid #e0e0e0;"
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
                  <div style="display: flex; gap: 8px;">
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
      // Teleport-related properties
      teleportDialog: false,
      teleportBackdrop: null as HTMLElement | null,
      teleportContainer: null as HTMLElement | null,
      parentDocument: null as Document | null,
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
    this.initializeTeleport()
  },
  beforeUnmount() {
    this.cleanupTeleport()
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
      if (this.canUseTeleport()) {
        this.openTeleportDialog()
      } else {
        this.filterDialog = true
      }
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

    // Teleport functionality methods
    canUseTeleport(): boolean {
      try {
        // Check if we can access parent document (same-origin policy)
        return window.parent && window.parent.document && window.parent !== window;
      } catch (e) {
        return false;
      }
    },

    initializeTeleport() {
      if (this.canUseTeleport()) {
        this.parentDocument = window.parent.document;
      }
    },

    openTeleportDialog() {
      if (!this.parentDocument || this.teleportDialog) return;
      
      this.teleportDialog = true;
      this.createTeleportBackdrop();
      this.createTeleportContainer();
      this.renderFilterDialog();
    },

    createTeleportBackdrop() {
      if (!this.parentDocument) return;

      // Create backdrop
      this.teleportBackdrop = this.parentDocument.createElement('div');
      this.teleportBackdrop.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background-color: rgba(0, 0, 0, 0.5);
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
      `;
      
      // Close dialog when clicking backdrop
      this.teleportBackdrop.addEventListener('click', (e) => {
        if (e.target === this.teleportBackdrop) {
          this.closeTeleportDialog();
        }
      });

      this.parentDocument.body.appendChild(this.teleportBackdrop);
    },

    createTeleportContainer() {
      if (!this.parentDocument || !this.teleportBackdrop) return;

      // Create dialog container
      this.teleportContainer = this.parentDocument.createElement('div');
      this.teleportContainer.style.cssText = `
        background: white;
        border-radius: 8px;
        max-width: 90vw;
        max-height: 90vh;
        width: 800px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
        display: flex;
        flex-direction: column;
        overflow: hidden;
      `;

      this.teleportBackdrop.appendChild(this.teleportContainer);
    },

    renderFilterDialog() {
      if (!this.teleportContainer) return;

      // Create dialog header
      const header = this.parentDocument!.createElement('div');
      header.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 24px;
        border-bottom: 1px solid #e0e0e0;
        background: white;
      `;
      
      const title = this.parentDocument!.createElement('span');
      title.textContent = 'Filter Options';
      title.style.cssText = 'font-size: 20px; font-weight: 500; color: #333;';
      
      const closeBtn = this.parentDocument!.createElement('button');
      closeBtn.innerHTML = '×';
      closeBtn.style.cssText = `
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #666;
        padding: 4px 8px;
        border-radius: 4px;
      `;
      closeBtn.addEventListener('click', () => this.closeTeleportDialog());
      closeBtn.addEventListener('mouseenter', () => {
        closeBtn.style.backgroundColor = '#f5f5f5';
      });
      closeBtn.addEventListener('mouseleave', () => {
        closeBtn.style.backgroundColor = 'transparent';
      });

      header.appendChild(title);
      header.appendChild(closeBtn);

      // Create dialog content
      const content = this.parentDocument!.createElement('div');
      content.style.cssText = `
        padding: 24px;
        overflow-y: auto;
        flex: 1;
        min-height: 0;
      `;

      this.renderColumnSelection(content);
      this.renderFilterControls(content);

      // Create dialog footer
      const footer = this.parentDocument!.createElement('div');
      footer.style.cssText = `
        padding: 16px 24px;
        border-top: 1px solid #e0e0e0;
        display: flex;
        justify-content: flex-end;
        background: white;
      `;

      const closeFooterBtn = this.parentDocument!.createElement('button');
      closeFooterBtn.textContent = 'Close';
      closeFooterBtn.style.cssText = `
        background: #1976d2;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
      `;
      closeFooterBtn.addEventListener('click', () => this.closeTeleportDialog());
      closeFooterBtn.addEventListener('mouseenter', () => {
        closeFooterBtn.style.backgroundColor = '#1565c0';
      });
      closeFooterBtn.addEventListener('mouseleave', () => {
        closeFooterBtn.style.backgroundColor = '#1976d2';
      });

      footer.appendChild(closeFooterBtn);

      // Assemble dialog
      this.teleportContainer.appendChild(header);
      this.teleportContainer.appendChild(content);
      this.teleportContainer.appendChild(footer);
    },

    renderColumnSelection(content: HTMLElement) {
      const columnSection = this.parentDocument!.createElement('div');
      columnSection.style.cssText = `
        background-color: white;
        border-radius: 4px;
        border: 1px solid #e0e0e0;
        padding: 16px;
        margin-bottom: 24px;
      `;

      const columnTitle = this.parentDocument!.createElement('h6');
      columnTitle.textContent = 'Select Columns:';
      columnTitle.style.cssText = 'color: #333; margin: 0 0 12px 0; font-size: 16px; font-weight: 500;';

      const chipsContainer = this.parentDocument!.createElement('div');
      chipsContainer.style.cssText = 'display: flex; flex-wrap: wrap; gap: 8px;';

      // Create column chips
      this.columnNames.forEach(column => {
        const chip = this.parentDocument!.createElement('div');
        const isSelected = this.selectedColumns.includes(column.field);
        
        chip.textContent = column.title;
        chip.style.cssText = `
          padding: 6px 12px;
          border-radius: 16px;
          font-size: 14px;
          cursor: pointer;
          user-select: none;
          transition: all 0.2s;
          ${isSelected ?
            'background: #1976d2; color: white; border: 1px solid #1976d2;' :
            'background: white; color: #333; border: 1px solid #e0e0e0;'
          }
        `;
        
        chip.addEventListener('click', () => {
          this.toggleColumnSelection(column.field);
          this.refreshTeleportDialog();
        });

        chip.addEventListener('mouseenter', () => {
          if (!isSelected) {
            chip.style.backgroundColor = '#f5f5f5';
          }
        });

        chip.addEventListener('mouseleave', () => {
          if (!isSelected) {
            chip.style.backgroundColor = 'white';
          }
        });

        chipsContainer.appendChild(chip);
      });

      // Create action buttons
      const actionsContainer = this.parentDocument!.createElement('div');
      actionsContainer.style.cssText = `
        margin-top: 16px;
        padding-top: 16px;
        border-top: 1px solid #e0e0e0;
        display: flex;
        justify-content: space-between;
        align-items: center;
      `;

      const selectionInfo = this.parentDocument!.createElement('span');
      selectionInfo.textContent = `${this.selectedColumns.length} of ${this.columnNames.length} columns selected`;
      selectionInfo.style.cssText = 'color: #666; font-size: 14px;';

      const buttonsDiv = this.parentDocument!.createElement('div');
      
      const selectAllBtn = this.createActionButton('Select All', () => {
        this.selectAllColumns();
        this.refreshTeleportDialog();
      });
      
      const clearAllBtn = this.createActionButton('Clear All', () => {
        this.clearColumnSelection();
        this.refreshTeleportDialog();
      });

      buttonsDiv.appendChild(selectAllBtn);
      buttonsDiv.appendChild(clearAllBtn);

      actionsContainer.appendChild(selectionInfo);
      actionsContainer.appendChild(buttonsDiv);

      columnSection.appendChild(columnTitle);
      columnSection.appendChild(chipsContainer);
      columnSection.appendChild(actionsContainer);
      content.appendChild(columnSection);
    },

    createActionButton(text: string, onClick: () => void): HTMLElement {
      const btn = this.parentDocument!.createElement('button');
      btn.textContent = text;
      btn.style.cssText = `
        background: white;
        color: #1976d2;
        border: 1px solid #1976d2;
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        margin-left: 8px;
      `;
      btn.addEventListener('click', onClick);
      btn.addEventListener('mouseenter', () => {
        btn.style.backgroundColor = '#f5f5f5';
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.backgroundColor = 'white';
      });
      return btn;
    },

    renderFilterControls(content: HTMLElement) {
      if (this.selectedColumns.length === 0) return;

      const filterSection = this.parentDocument!.createElement('div');
      
      const filterTitle = this.parentDocument!.createElement('h6');
      filterTitle.textContent = 'Filter Settings:';
      filterTitle.style.cssText = 'color: #333; margin: 0 0 16px 0; font-size: 16px; font-weight: 500;';

      const filterContainer = this.parentDocument!.createElement('div');
      filterContainer.style.cssText = `
        display: flex;
        flex-direction: column;
        gap: 16px;
        background-color: #f9f9f9;
        border-radius: 4px;
        padding: 16px;
      `;

      this.selectedColumns.forEach(columnField => {
        const filterItem = this.createFilterItem(columnField);
        filterContainer.appendChild(filterItem);
      });

      filterSection.appendChild(filterTitle);
      filterSection.appendChild(filterContainer);
      content.appendChild(filterSection);
    },

    createFilterItem(columnField: string): HTMLElement {
      const filterItem = this.parentDocument!.createElement('div');
      filterItem.style.cssText = 'display: flex; flex-direction: column; gap: 8px; padding: 12px; background-color: white; border-radius: 4px; border: 1px solid #e0e0e0;';

      const label = this.parentDocument!.createElement('label');
      label.style.cssText = 'font-weight: 500; font-size: 14px; color: #555;';
      
      const title = this.getColumnTitle(columnField);
      const type = this.getFilterType(columnField);
      label.innerHTML = `${title} <span style="font-size: 12px; color: #888; font-weight: normal;">(${type})</span>`;

      filterItem.appendChild(label);

      const filterType = this.getFilterType(columnField);
      
      if (filterType === 'categorical') {
        const select = this.createCategoricalFilter(columnField);
        filterItem.appendChild(select);
      } else if (filterType === 'numeric') {
        const numericFilter = this.createNumericFilter(columnField);
        filterItem.appendChild(numericFilter);
      } else {
        const textFilter = this.createTextFilter(columnField);
        filterItem.appendChild(textFilter);
      }

      return filterItem;
    },

    createCategoricalFilter(columnField: string): HTMLElement {
      const container = this.parentDocument!.createElement('div');
      
      const select = this.parentDocument!.createElement('select');
      select.multiple = true;
      select.style.cssText = `
        width: 100%;
        padding: 8px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 14px;
        min-height: 80px;
      `;

      const uniqueValues = this.getUniqueValues(columnField);
      const currentValues = this.filterValues[columnField]?.categorical || [];

      uniqueValues.forEach(value => {
        const option = this.parentDocument!.createElement('option');
        option.value = value;
        option.textContent = value;
        option.selected = currentValues.includes(value);
        select.appendChild(option);
      });

      select.addEventListener('change', () => {
        const selectedValues = Array.from(select.selectedOptions).map(opt => opt.value);
        if (!this.filterValues[columnField]) {
          this.filterValues[columnField] = {};
        }
        this.filterValues[columnField].categorical = selectedValues;
        this.applyFilters();
      });

      container.appendChild(select);
      return container;
    },

    createNumericFilter(columnField: string): HTMLElement {
      const container = this.parentDocument!.createElement('div');
      container.style.cssText = 'padding: 8px 0;';

      const inputsContainer = this.parentDocument!.createElement('div');
      inputsContainer.style.cssText = 'display: flex; gap: 8px;';

      const minValue = this.getMinValue(columnField);
      const maxValue = this.getMaxValue(columnField);
      const currentFilter = this.filterValues[columnField]?.numeric;

      // Min input
      const minInput = this.parentDocument!.createElement('input');
      minInput.type = 'number';
      minInput.placeholder = `Min: ${minValue}`;
      minInput.value = String(currentFilter?.min || minValue);
      minInput.min = String(minValue);
      minInput.max = String(maxValue);
      minInput.style.cssText = `
        padding: 8px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 14px;
      `;

      // Max input
      const maxInput = this.parentDocument!.createElement('input');
      maxInput.type = 'number';
      maxInput.placeholder = `Max: ${maxValue}`;
      maxInput.value = String(currentFilter?.max || maxValue);
      maxInput.min = String(minValue);
      maxInput.max = String(maxValue);
      maxInput.style.cssText = `
        padding: 8px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 14px;
      `;

      const updateNumeric = () => {
        this.updateNumericFilterMin(columnField, minInput.value);
        this.updateNumericFilterMax(columnField, maxInput.value);
        this.validateAndApplyNumericFilter(columnField);
      };

      minInput.addEventListener('blur', updateNumeric);
      maxInput.addEventListener('blur', updateNumeric);

      inputsContainer.appendChild(minInput);
      inputsContainer.appendChild(maxInput);

      const rangeInfo = this.parentDocument!.createElement('div');
      rangeInfo.style.cssText = `
        display: flex;
        justify-content: space-between;
        font-size: 12px;
        color: #666;
        margin-top: 4px;
      `;
      rangeInfo.innerHTML = `<span>Data range: ${minValue} - ${maxValue}</span>`;

      container.appendChild(inputsContainer);
      container.appendChild(rangeInfo);
      return container;
    },

    createTextFilter(columnField: string): HTMLElement {
      const input = this.parentDocument!.createElement('input');
      input.type = 'text';
      input.placeholder = 'Search pattern (regex supported)';
      input.value = this.filterValues[columnField]?.text || '';
      input.style.cssText = `
        width: 100%;
        padding: 8px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 14px;
      `;

      input.addEventListener('input', () => {
        if (!this.filterValues[columnField]) {
          this.filterValues[columnField] = {};
        }
        this.filterValues[columnField].text = input.value;
        this.applyFilters();
      });

      return input;
    },

    refreshTeleportDialog() {
      if (!this.teleportDialog || !this.teleportContainer) return;
      
      // Clear and re-render content
      this.teleportContainer.innerHTML = '';
      this.renderFilterDialog();
    },

    closeTeleportDialog() {
      this.teleportDialog = false;
      this.cleanupTeleport();
    },

    cleanupTeleport() {
      if (this.teleportBackdrop && this.parentDocument) {
        this.parentDocument.body.removeChild(this.teleportBackdrop);
        this.teleportBackdrop = null;
      }
      if (this.teleportContainer) {
        this.teleportContainer = null;
      }
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

// Fullscreen dialog for better iframe experience
.v-overlay--active {
  .v-dialog {
    .v-card {
      max-height: 90vh;
      display: flex;
      flex-direction: column;
    }
    
    .v-card-text {
      overflow-y: auto;
      flex: 1;
      min-height: 0;
    }
  }
}
</style>
