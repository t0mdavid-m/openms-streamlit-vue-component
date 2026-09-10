import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { RenderData } from 'streamlit-component-lib'
import { useStreamlitDataStore } from '@/stores/streamlit-data'
import { useSelectionStore } from '@/stores/selection'

/** A render as Python's render_component sends it for one Scan Table cell. */
function render(hash: string, trackerId: number, selection: Record<string, unknown> = {}): RenderData {
  return {
    args: {
      hash,
      selection_store: { counter: 0, id: trackerId, ...selection },
      per_scan_data: [{ index: 0, Scan: 3098 }],
      components: [[{ componentArgs: { componentName: 'TabulatorScanTable', title: 'Scan Table' } }]],
    },
    disabled: false,
    theme: undefined,
  } as unknown as RenderData
}

describe('streamlit-data store: updateRenderData', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('applies the selection but keeps the parsed data when hash and tracker are unchanged', () => {
    const store = useStreamlitDataStore()
    store.updateRenderData(render('h1', 0.1, { scanIndex: 3 }))
    const before = store.dataForDrawing.per_scan_data

    store.updateRenderData(render('h1', 0.1, { scanIndex: 4 }))

    expect(store.dataForDrawing.per_scan_data).toBe(before)
    expect(useSelectionStore().scanIndex).toBe(4)
  })

  it('rebuilds the data when the tracker changes even though the hash is equal', () => {
    // A new experiment whose data is byte-identical to the previous one (re-run of
    // the same input) arrives with the same hash but a new StateTracker id. Skipping
    // it left the tables untouched, so the default row was never selected and every
    // dependent cell stayed empty.
    const store = useStreamlitDataStore()
    const selection = useSelectionStore()
    store.updateRenderData(render('h1', 0.1, { scanIndex: 3 }))
    const before = store.dataForDrawing.per_scan_data

    store.updateRenderData(render('h1', 0.2))

    expect(store.dataForDrawing.per_scan_data).not.toBe(before)
    expect(store.dataForDrawing.per_scan_data).toEqual([{ index: 0, Scan: 3098 }])
    expect(selection.scanIndex).toBeUndefined()
    expect(selection.id).toBe(0.2)
  })
})
