export type SequenceData = {
  sequence: string[]
  proteoform_start?: number
  proteoform_end?: number
  coverage: number[]
  maxCoverage: number
  theoretical_mass: number
  computed_mass?: number
  modifications? : ModificationData[]
  fixed_modifications: string[]
  fragment_masses_a: number[][]
  fragment_masses_b: number[][]
  fragment_masses_c: number[][]
  fragment_masses_x: number[][]
  fragment_masses_y: number[][]
  fragment_masses_z: number[][]
  annotated_fragments?: AnnotatedFragment[] | null
  annotation_summary?: AnnotationSummary | null
}

// A fragment isotope envelope FLASHAnnotator accepted on the raw spectrum.
// first/last: 0-based residues of the proteoform; start/end: the same residues
// in the coordinates of `sequence` (inclusive).
export type AnnotatedFragment = {
  name: string
  ion_type: string
  kind: 'N' | 'C' | 'I'
  length: number
  first: number
  last: number
  start: number
  end: number
  charge: number
  mono_mass: number
  observed_mass: number
  mz: number
  ppm_error: number
  matched_peaks: number
  predicted_peaks: number
  cosine: number
  intensity: number
}

// Proteoform-level FLASHAnnotator columns; null where it could not compute them
export type AnnotationSummary = {
  fa_score: number | null
  raw_score: number | null
  matched_fragments: number | null
  fragment_hypotheses: number | null
  covered_bonds: number | null
  coverage: number | null
  calibration_ppm: number | null
  internal_score: number | null
  internal_matched: number | null
  internal_hypotheses: number | null
  authentic_cleavages: number | null
  coverage_with_internal: number | null
}

export type ModificationData = {
  start : number
  end : number
  mass_diff : number
  labels : string
}

export type FLASHTnTSettings = {
  tolerance : number
  ion_types : string[]
}

export type SequenceDataDictionary = Record<number, SequenceData>