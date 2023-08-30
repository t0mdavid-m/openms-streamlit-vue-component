export type KnownModification = 'Methyl' | 'Acetyl' | 'Phospho' | 'Oxidation' | 'Deamidated' | 'Amidated'

export const modificationMassMap: Record<KnownModification, number> = {
  Acetyl: 42.010565,
  Methyl: 14.01565,
  Phospho: 79.966331,
  Oxidation: 15.994915,
  Deamidated: 0.984016,
  Amidated: -0.984016
}

export const potentialModificationMap: Record<string, KnownModification[]> = {
  'N-term': ['Acetyl', 'Methyl', 'Phospho'],
  'C-term': ['Amidated'],
  'C': ['Acetyl', 'Methyl', 'Phospho'],
  'E': ['Methyl', 'Phospho'],
  'D': ['Methyl', 'Phospho'],
  'H': ['Methyl', 'Phospho'],
  'I': ['Methyl'],
  'K': ['Methyl', 'Phospho'],
  'L': ['Methyl'],
  'M': ['Oxidation'],
  'N': ['Methyl'],
  'Q': ['Deamidated', 'Methyl'],
  'R': ['Methyl', 'Phospho'],
  'S': ['Acetyl', 'Methyl'],
  'T': ['Acetyl', 'Methyl'],
  'Y': ['Phospho'],
}