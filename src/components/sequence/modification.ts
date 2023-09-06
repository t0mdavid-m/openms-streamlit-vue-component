export type KnownModification =
  | 'Methyl'
  | 'Acetyl'
  | 'Phospho'
  | 'Oxidation'
  | 'Deamidated'
  | 'Amidated'

export const modificationMassMap: Record<KnownModification, number> = {
  Acetyl: 42.010565,
  Methyl: 14.01565,
  Phospho: 79.966331,
  Oxidation: 15.994915,
  Deamidated: 0.984016,
  Amidated: -0.984016,
}

export const potentialModificationMap: Record<string, KnownModification[]> = {
  'N-term': ['Acetyl', 'Methyl', 'Phospho'],
  'C-term': ['Amidated'],
  C: ['Acetyl', 'Methyl', 'Phospho'],
  E: ['Methyl', 'Phospho'],
  D: ['Methyl', 'Phospho'],
  H: ['Methyl', 'Phospho'],
  I: ['Methyl'],
  K: ['Methyl', 'Phospho'],
  L: ['Methyl'],
  M: ['Oxidation'],
  N: ['Methyl'],
  Q: ['Deamidated', 'Methyl'],
  R: ['Methyl', 'Phospho'],
  S: ['Acetyl', 'Methyl', 'Phospho'],
  T: ['Acetyl', 'Methyl', 'Phospho'],
  Y: ['Phospho'],
}

export const extraFragmentTypeObject: Record<string, number> = {
  '': 0, // default
  '-H2O': -18.0105646863, // water loss
  '-NH3': -17.0265491015, // ammonium loss
  '-H': -1.0078250319, // proton loss
  '+H': 1.0078250319, // proton addition
}
