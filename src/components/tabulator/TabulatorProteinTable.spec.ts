import { describe, it, expect, beforeEach } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import TabulatorProteinTable from './TabulatorProteinTable.vue'
import { useStreamlitDataStore } from '@/stores/streamlit-data'

// Two spectra (scans 1 and 2), each with several proteoform hits of differing
// scores. Order is intentionally not sorted by score so the test also covers
// that the highest score is picked regardless of position.
const proteinRows = [
  { index: 0, Scan: 1, accession: 'A', Score: 10 },
  { index: 1, Scan: 1, accession: 'B', Score: 42 }, // best for scan 1
  { index: 2, Scan: 1, accession: 'C', Score: 31 },
  { index: 3, Scan: 2, accession: 'D', Score: 7 },
  { index: 4, Scan: 2, accession: 'E', Score: 99 }, // best for scan 2
]

function mountTable() {
  return shallowMount(TabulatorProteinTable, {
    props: { args: { componentName: 'TabulatorProteinTable' }, index: 0 },
    global: {
      // Stub the heavy children so Tabulator/Vuetify are never instantiated;
      // we only exercise the data-shaping computed.
      stubs: { TabulatorTable: true, 'v-checkbox': true },
    },
  })
}

describe('TabulatorProteinTable best-hit-per-spectrum filter', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    const store = useStreamlitDataStore()
    // Fresh copies per test since the computed mutates rows (adds `id`).
    store.dataForDrawing = {
      protein_table: proteinRows.map((r) => ({ ...r })),
    } as any
  })

  it('is enabled by default', () => {
    const wrapper = mountTable()
    expect(wrapper.vm.bestPerScanOnly).toBe(true)
  })

  it('shows only the highest-scoring hit per spectrum when enabled', () => {
    const wrapper = mountTable()
    const rows = wrapper.vm.tableData
    // One row per distinct scan.
    expect(rows.map((r: any) => r.Scan).sort()).toEqual([1, 2])
    const byScan = Object.fromEntries(rows.map((r: any) => [r.Scan, r]))
    expect(byScan[1].accession).toBe('B')
    expect(byScan[1].Score).toBe(42)
    expect(byScan[2].accession).toBe('E')
    expect(byScan[2].Score).toBe(99)
  })

  it('shows every hit when disabled', async () => {
    const wrapper = mountTable()
    wrapper.vm.bestPerScanOnly = false
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.tableData).toHaveLength(proteinRows.length)
  })
})
