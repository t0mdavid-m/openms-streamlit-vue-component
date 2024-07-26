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
  aIon: boolean
  bIon: boolean
  cIon: boolean
  xIon: boolean
  yIon: boolean
  zIon: boolean
  extraTypes: string[]
}
