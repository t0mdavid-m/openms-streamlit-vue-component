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