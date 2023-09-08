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

export type ExtraFragmentType = 'water loss' | 'ammonium loss' | 'proton loss/addition';

export const extraFragmentTypeObject: Record<ExtraFragmentType | 'default', { typeName: string, typeMass: number }[]> = {
  'default': [{ typeName: '', typeMass: 0 }], // default
  'water loss': [{ typeName: '-H2O', typeMass: -18.0105646863 }], // water loss
  'ammonium loss': [{ typeName: '-NH3', typeMass: -17.0265491015 }], // ammonium loss
  'proton loss/addition': [
    { typeName: '-H', typeMass: -1.0078250319 }, // proton loss
    { typeName: '+H', typeMass: 1.0078250319 }, // proton addition
  ],
}