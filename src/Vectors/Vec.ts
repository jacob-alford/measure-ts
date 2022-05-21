import * as RNEA from 'fp-ts/ReadonlyNonEmptyArray'

export interface VecC<A, N extends number> {
  data: RNEA.ReadonlyNonEmptyArray<A>
  size: N
}
