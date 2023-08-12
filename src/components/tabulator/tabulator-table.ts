export type TabulatorTableArguments = {
  componentName: 'TabulatorScanTable' | 'TabulatorMassTable'
  title?: string
  data: Record<string, unknown>[]
  columns: string[]
}
