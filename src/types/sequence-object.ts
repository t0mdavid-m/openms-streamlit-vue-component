export type SequenceObject = {
  aminoAcid: string
  truncated: boolean
  coverage? : number
  tagStart?: boolean
  tagEnd?: boolean
  modStart? : boolean
  modCenter? : boolean
  modEnd? : boolean
  modMass? : string
  modLabels? : string
  aIon: boolean
  bIon: boolean
  cIon: boolean
  xIon: boolean
  yIon: boolean
  zIon: boolean
  extraTypes: string[]
  // FLASHAnnotator internal fragments covering this residue
  internalDepth?: number
  // an internal fragment starts at (N) / ends at (C) this residue
  internalStart?: boolean
  internalEnd?: boolean
}
