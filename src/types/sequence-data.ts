export type SequenceData = {
  sequence: string[]
  coverage: number[]
  maxCoverage: number
  theoretical_mass: number
  fixed_modifications: string[]
  fragment_masses_a: number[]
  fragment_masses_b: number[]
  fragment_masses_c: number[]
  fragment_masses_x: number[]
  fragment_masses_y: number[]
  fragment_masses_z: number[]
}

export type SequenceDataDictionary = Record<number, SequenceData>