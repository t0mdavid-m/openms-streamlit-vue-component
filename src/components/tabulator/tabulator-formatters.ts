import type { CellComponent } from 'tabulator-tables'

export const toFixedFormatter = (decimalPlaces?: number) => (cell: CellComponent) => {
  return cell.getValue().toString().length > 4
    ? (cell.getValue() as number).toFixed(decimalPlaces ?? 4)
    : cell.getValue()
}
