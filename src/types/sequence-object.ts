export type SequenceObject = {
  aminoAcid: string
  coverage? : number
  tagStart?: boolean
  tagEnd?: boolean
  aIon: boolean
  bIon: boolean
  cIon: boolean
  xIon: boolean
  yIon: boolean
  zIon: boolean
  extraTypes: string[]
}
