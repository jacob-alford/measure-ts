# measure-ts

An implementation of the Giry probability monad in typescript with fp-ts.

Based on [an article](https://jtobin.io/giry-monad-implementation) from Jared Tobin

## Install

Uses `fp-ts` as a peer dependency.

```bash
yarn add fp-ts measure-ts
```

or

```bash
npm install fp-ts measure-ts
```

## Example

Here's a compound measure `betaBinomial` which is marginalizing over the beta distribution. The explanation for `betaBinomial` can be found at Jared Tobin's [article](https://jtobin.io/giry-monad-implementation).

```ts
import { pipe } from 'fp-ts/function'
import * as Meas from 'measure-ts/Measure'

const betaBinomial: (n: number) => (a: number) => (b: number) => Meas.Measure<number> =
  n => a => b =>
    pipe(Meas.beta(a)(b), Meas.chain(Meas.binomial(n)))
```
