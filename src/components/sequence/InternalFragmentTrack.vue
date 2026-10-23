<template>
  <div ref="container" class="internal-track" :style="trackStyles">
    <div class="d-flex align-center flex-wrap internal-track-header">
      <span class="text-subtitle-2 mr-4">Internal fragments (# {{ uniqueCount }})</span>
      <template v-for="ionType in ionTypesPresent" :key="ionType">
        <span class="legend-swatch mr-1" :style="{ background: colorOf(ionType) }"></span>
        <span class="mr-3 text-caption">{{ ionType }}</span>
      </template>
      <span class="legend-tick legend-tick-n mr-1"></span>
      <span class="mr-3 text-caption">N-terminal cleavage</span>
      <span class="legend-tick legend-tick-c mr-1"></span>
      <span class="mr-3 text-caption">C-terminal cleavage</span>
    </div>
    <svg :width="width" :height="height" class="internal-track-svg" @mouseleave="hovered = undefined">
      <!-- residue axis -->
      <line :x1="0" :x2="width" :y1="axisY" :y2="axisY" :stroke="textColor" stroke-width="1" />
      <template v-for="tick in axisTicks" :key="`t${tick}`">
        <line :x1="xOf(tick)" :x2="xOf(tick)" :y1="axisY" :y2="axisY + 4" :stroke="textColor" />
        <text :x="xOf(tick)" :y="axisY + 15" :fill="textColor" font-size="10" text-anchor="middle">
          {{ tick + 1 }}
        </text>
      </template>
      <!-- terminal fragment cleavages, for comparison with the internal pieces -->
      <line
        v-for="bond in nTerminalBonds"
        :key="`n${bond}`"
        :x1="xOf(bond)" :x2="xOf(bond)" :y1="terminalTop" :y2="terminalTop + 6"
        class="tick-n"
      />
      <line
        v-for="bond in cTerminalBonds"
        :key="`c${bond}`"
        :x1="xOf(bond)" :x2="xOf(bond)" :y1="terminalTop + 7" :y2="terminalTop + 13"
        class="tick-c"
      />
      <!-- highlighted residue span of the selected fragment -->
      <rect
        v-if="selectedFragment !== undefined"
        :x="xOf(selectedFragment.start)"
        :y="lanesTop - 2"
        :width="Math.max(xOf(selectedFragment.end + 1) - xOf(selectedFragment.start), 1)"
        :height="lanesHeight + 4"
        class="selected-span"
      />
      <!-- one bar per internal piece, packed into lanes -->
      <rect
        v-for="bar in bars"
        :key="bar.key"
        :x="xOf(bar.fragment.start) + 0.5"
        :y="lanesTop + bar.lane * laneHeight"
        :width="Math.max(xOf(bar.fragment.end + 1) - xOf(bar.fragment.start) - 1, 1)"
        :height="Math.max(laneHeight - 1, 1)"
        :fill="colorOf(bar.fragment.ion_type)"
        :fill-opacity="bar.opacity"
        :class="{ 'bar-selected': isSelected(bar.fragment), 'bar-covering': coversHighlight(bar.fragment) }"
        class="bar"
        @mousemove="onHover($event, bar.fragment)"
        @click="$emit('select', bar.fragment)"
      />
    </svg>
    <div v-if="hovered !== undefined" class="track-tooltip" :style="tooltipStyles">
      <div><b>{{ hovered.fragment.name }}</b> ({{ hovered.fragment.ion_type }})</div>
      <div>Residues {{ hovered.fragment.start + 1 }}–{{ hovered.fragment.end + 1 }}: {{ residues(hovered.fragment) }}</div>
      <div>Charges {{ chargesOf(hovered.fragment).join(', ') }}</div>
      <div>Mass {{ hovered.fragment.mono_mass.toFixed(3) }} Da, {{ hovered.fragment.ppm_error.toFixed(2) }} ppm</div>
      <div>Cosine {{ hovered.fragment.cosine.toFixed(3) }}, {{ hovered.fragment.matched_peaks }}/{{ hovered.fragment.predicted_peaks }} peaks</div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'
import type { Theme } from 'streamlit-component-lib'
import type { AnnotatedFragment } from '@/types/sequence-data'

// Internal ion types are "<N-end type>/<C-end type>" (FLASHAnnotator)
const INTERNAL_COLORS: Record<string, string> = {
  'b/y': '#8E44AD',
  'a/y': '#2E86C1',
  'c/y': '#C0392B',
  'b/z': '#16A085',
  'b/z+1': '#16A085',
  'c/z': '#D35400',
  'c/z+1': '#D35400',
  'b/x': '#7F8C8D',
}
const FALLBACK_COLORS = ['#AF7AC5', '#48C9B0', '#F5B041', '#5DADE2', '#EC7063']

type Bar = { key: string; fragment: AnnotatedFragment; lane: number; opacity: number }

export default defineComponent({
  name: 'InternalFragmentTrack',
  props: {
    sequence: { type: Array as PropType<string[]>, required: true },
    // residue range drawn (inclusive), in sequence coordinates
    rangeStart: { type: Number, required: true },
    rangeEnd: { type: Number, required: true },
    fragments: { type: Array as PropType<AnnotatedFragment[]>, required: true },
    selectedFragment: { type: Object as PropType<AnnotatedFragment>, default: undefined },
    // residue whose covering pieces are emphasized (e.g. the clicked residue)
    highlightResidue: { type: Number, default: undefined },
    theme: { type: Object as PropType<Theme>, default: undefined },
  },
  emits: ['select'],
  data() {
    return {
      width: 600,
      hovered: undefined as { fragment: AnnotatedFragment; x: number; y: number } | undefined,
      resizeObserver: undefined as ResizeObserver | undefined,
    }
  },
  computed: {
    textColor(): string {
      return this.theme?.textColor ?? '#888'
    },
    trackStyles(): Record<string, string> {
      return { '--track-bg': this.theme?.secondaryBackgroundColor ?? '#f0f2f6' }
    },
    internalFragments(): AnnotatedFragment[] {
      return this.fragments.filter((f) => f.kind === 'I')
    },
    // One bar per piece: the envelopes of a piece at several charges are merged
    pieces(): AnnotatedFragment[] {
      const byKey = new Map<string, AnnotatedFragment>()
      this.internalFragments.forEach((f) => {
        const key = `${f.ion_type}:${f.start}:${f.end}`
        const known = byKey.get(key)
        if (known === undefined || f.intensity > known.intensity) {
          byKey.set(key, f)
        }
      })
      return [...byKey.values()]
    },
    uniqueCount(): number {
      return this.pieces.length
    },
    ionTypesPresent(): string[] {
      return [...new Set(this.pieces.map((f) => f.ion_type))].sort()
    },
    bars(): Bar[] {
      // Greedy interval packing: longest pieces first within a start position
      const sorted = [...this.pieces].sort((a, b) => a.start - b.start || b.end - a.end)
      const laneEnds: number[] = []
      const logIntensities = sorted.map((f) => Math.log10(Math.max(f.intensity, 1)))
      const minLog = Math.min(...logIntensities)
      const maxLog = Math.max(...logIntensities)
      return sorted.map((fragment, i) => {
        let lane = laneEnds.findIndex((end) => end < fragment.start)
        if (lane < 0) {
          lane = laneEnds.length
          laneEnds.push(fragment.end)
        } else {
          laneEnds[lane] = fragment.end
        }
        const scaled = maxLog > minLog ? (logIntensities[i] - minLog) / (maxLog - minLog) : 1
        return {
          key: `${fragment.ion_type}:${fragment.start}:${fragment.end}`,
          fragment,
          lane,
          opacity: 0.35 + 0.65 * scaled,
        }
      })
    },
    laneCount(): number {
      return this.bars.reduce((m, b) => Math.max(m, b.lane + 1), 0)
    },
    laneHeight(): number {
      // keep the track at most ~260 px high however many lanes there are
      if (this.laneCount === 0) return 8
      return Math.max(2, Math.min(8, Math.floor(260 / this.laneCount)))
    },
    terminalTop(): number {
      return 2
    },
    lanesTop(): number {
      return this.terminalTop + 18
    },
    lanesHeight(): number {
      return this.laneCount * this.laneHeight
    },
    axisY(): number {
      return this.lanesTop + this.lanesHeight + 6
    },
    height(): number {
      return this.axisY + 20
    },
    residueCount(): number {
      return Math.max(this.rangeEnd - this.rangeStart + 1, 1)
    },
    axisTicks(): number[] {
      const step = this.residueCount > 300 ? 50 : (this.residueCount > 100 ? 20 : 10)
      const ticks: number[] = []
      for (let i = this.rangeStart; i <= this.rangeEnd; i++) {
        if ((i + 1) % step === 0) ticks.push(i)
      }
      return ticks
    },
    // Bonds as the residue index right of the cleavage
    nTerminalBonds(): number[] {
      return [...new Set(this.fragments.filter((f) => f.kind === 'N').map((f) => f.end + 1))]
    },
    cTerminalBonds(): number[] {
      return [...new Set(this.fragments.filter((f) => f.kind === 'C').map((f) => f.start))]
    },
    tooltipStyles(): Record<string, string> {
      if (this.hovered === undefined) return {}
      const left = Math.min(this.hovered.x + 12, Math.max(this.width - 260, 0))
      return { left: `${left}px`, top: `${this.hovered.y + 30}px` }
    },
  },
  mounted() {
    const container = this.$refs.container as HTMLElement
    // Content width (without padding): sizing the SVG to clientWidth would
    // widen the container on every resize.
    const contentWidth = () => {
      const style = getComputedStyle(container)
      return container.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
    }
    this.width = Math.floor(contentWidth()) || 600
    this.resizeObserver = new ResizeObserver((entries) => {
      const w = Math.floor(entries[0]?.contentRect.width ?? 0)
      if (w > 0 && w !== this.width) this.width = w
    })
    this.resizeObserver.observe(container)
  },
  beforeUnmount() {
    this.resizeObserver?.disconnect()
  },
  methods: {
    xOf(residue: number): number {
      return ((residue - this.rangeStart) / this.residueCount) * this.width
    },
    colorOf(ionType: string): string {
      if (INTERNAL_COLORS[ionType] !== undefined) return INTERNAL_COLORS[ionType]
      const index = this.ionTypesPresent.indexOf(ionType)
      return FALLBACK_COLORS[Math.max(index, 0) % FALLBACK_COLORS.length]
    },
    isSelected(fragment: AnnotatedFragment): boolean {
      const s = this.selectedFragment
      return s !== undefined && s.kind === 'I' && s.ion_type === fragment.ion_type
        && s.start === fragment.start && s.end === fragment.end
    },
    coversHighlight(fragment: AnnotatedFragment): boolean {
      const r = this.highlightResidue
      return r !== undefined && fragment.start <= r && r <= fragment.end
    },
    chargesOf(fragment: AnnotatedFragment): number[] {
      return this.internalFragments
        .filter((f) => f.ion_type === fragment.ion_type && f.start === fragment.start && f.end === fragment.end)
        .map((f) => f.charge)
        .sort((a, b) => a - b)
    },
    residues(fragment: AnnotatedFragment): string {
      const seq = this.sequence.slice(fragment.start, fragment.end + 1).join('')
      return seq.length > 30 ? `${seq.slice(0, 12)}…${seq.slice(-12)}` : seq
    },
    onHover(event: MouseEvent, fragment: AnnotatedFragment) {
      const svg = (event.currentTarget as SVGElement).ownerSVGElement
      const box = svg?.getBoundingClientRect()
      this.hovered = {
        fragment,
        x: event.clientX - (box?.left ?? 0),
        y: event.clientY - (box?.top ?? 0),
      }
    },
  },
})
</script>

<style scoped lang="less">
.internal-track {
  position: relative;
  width: 100%;
  box-sizing: border-box;
  overflow: hidden;
  padding: 8px 8px 0 8px;
  margin-bottom: 8px;
  border-radius: 8px;
  background: var(--track-bg);
}

.internal-track-header {
  margin-bottom: 4px;
}

.internal-track-svg {
  display: block;
  overflow: visible;
}

.legend-swatch {
  display: inline-block;
  width: 14px;
  height: 8px;
  border-radius: 2px;
}

.legend-tick {
  display: inline-block;
  width: 2px;
  height: 10px;
}

.legend-tick-n,
.tick-n {
  background: blue;
  stroke: blue;
  stroke-width: 2;
}

.legend-tick-c,
.tick-c {
  background: #e4572e;
  stroke: #e4572e;
  stroke-width: 2;
}

.bar {
  cursor: pointer;

  &:hover {
    stroke: black;
    stroke-width: 1;
  }
}

.bar-covering {
  stroke: #f3a712;
  stroke-width: 1;
}

.bar-selected {
  stroke: black;
  stroke-width: 2;
  fill-opacity: 1;
}

.selected-span {
  fill: #f3a712;
  fill-opacity: 0.25;
}

.track-tooltip {
  position: absolute;
  z-index: 2000;
  pointer-events: none;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  background: rgba(33, 33, 33, 0.92);
  color: white;
  white-space: nowrap;
}
</style>
