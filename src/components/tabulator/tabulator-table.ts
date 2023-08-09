import type { ColumnDefinition } from "tabulator-tables"

export type TabulatorTableArguments = {
  componentName: 'TabulatorTable'
  data: Record<string, unknown>[]
  columns: ColumnDefinition[]
}
