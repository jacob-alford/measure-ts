/** Includes partially ported packages from an assortment of Haskell modules */

import * as RA from 'fp-ts/ReadonlyArray'
import * as RNEA from 'fp-ts/ReadonlyNonEmptyArray'
import * as N from 'fp-ts/number'
import { pipe, tuple } from 'fp-ts/function'

type TupleNumber = [number, number]
type TripleNumber = [number, number, number]

const M_SQRT_EPS = 1.4901161193847656e-8
const M_EULER_MASCHERONI = 0.5772156649015328606065121
const LN_SQRT_2_PI = 0.9189385332046727417803297364056176398613974736377834128171

const tableLogGamma_1_15P: ReadonlyArray<number> = [
  0.490622454069039543534e-1, -0.969117530159521214579e-1, -0.414983358359495381969,
  -0.406567124211938417342, -0.158413586390692192217, -0.240149820648571559892e-1,
  -0.100346687696279557415e-2,
]

const tableLogGamma_1_15Q: ReadonlyArray<number> = [
  1, 0.302349829846463038743e1, 0.348739585360723852576e1, 0.191415588274426679201e1,
  0.507137738614363510846, 0.577039722690451849648e-1, 0.195768102601107189171e-2,
]

const tableLogGamma_15_2P: ReadonlyArray<number> = [
  -0.292329721830270012337e-1, 0.144216267757192309184, -0.142440390738631274135,
  0.542809694055053558157e-1, -0.850535976868336437746e-2, 0.431171342679297331241e-3,
]

const tableLogGamma_15_2Q: ReadonlyArray<number> = [
  1, -0.150169356054485044494e1, 0.846973248876495016101, -0.220095151814995745555,
  0.25582797155975869989e-1, -0.100666795539143372762e-2, -0.827193521891290553639e-6,
]

const tableLogGamma_2_3P: ReadonlyArray<number> = [
  -0.180355685678449379109e-1, 0.25126649619989678683e-1, 0.494103151567532234274e-1,
  0.172491608709613993966e-1, -0.259453563205438108893e-3, -0.541009869215204396339e-3,
  -0.324588649825948492091e-4,
]

const tableLogGamma_2_3Q: ReadonlyArray<number> = [
  1, 0.196202987197795200688e1, 0.148019669424231326694e1, 0.541391432071720958364,
  0.988504251128010129477e-1, 0.82130967464889339326e-2, 0.224936291922115757597e-3,
  -0.223352763208617092964e-6,
]

const tableLanczos: ReadonlyArray<TupleNumber> = [
  [56906521.91347156388090791033559122686859, 0],
  [103794043.1163445451906271053616070238554, 39916800],
  [86363131.28813859145546927288977868422342, 120543840],
  [43338889.32467613834773723740590533316085, 150917976],
  [14605578.08768506808414169982791359218571, 105258076],
  [3481712.15498064590882071018964774556468, 45995730],
  [601859.6171681098786670226533699352302507, 13339535],
  [75999.29304014542649875303443598909137092, 2637558],
  [6955.999602515376140356310115515198987526, 357423],
  [449.9445569063168119446858607650988409623, 32670],
  [19.51992788247617482847860966235652136208, 1925],
  [0.5098416655656676188125178644804694509993, 66],
  [0.006061842346248906525783753964555936883222, 1],
]

const evaluatePolynonmial: (x: number) => (coeffs: ReadonlyArray<number>) => number = x =>
  RA.foldMapWithIndex(N.MonoidSum)((exp, coeff) => coeff * Math.pow(x, exp))

const evalRatio: (coef: ReadonlyArray<TupleNumber>) => (x: number) => number =
  coef => x => {
    const rx = 1 / x
    const fini: (frac: TupleNumber) => number = ([num, den]) => num / den
    const stepR: (coefs: TupleNumber, frac: TupleNumber) => TupleNumber = (
      [a, b],
      [num, den]
    ) => [num * x + a, den * x + b]
    const stepL: (coefs: TupleNumber, frac: TupleNumber) => TupleNumber = (
      [num, den],
      [a, b]
    ) => [num * rx + a, den * rx + b]
    if (x > 1) return pipe(coef, RA.reduce(tuple(0, 0), stepL), fini)
    return pipe(coef, RA.reduceRight(tuple(0, 0), stepR), fini)
  }

const lgamma1_15: (zm1: number) => (zm2: number) => number = zm1 => zm2 => {
  const r = zm1 * zm2
  const y = 0.52815341949462890625
  return (
    r * y +
    r *
      (evaluatePolynonmial(zm1)(tableLogGamma_1_15P) /
        evaluatePolynonmial(zm1)(tableLogGamma_1_15Q))
  )
}

const lgamma15_2: (zm1: number) => (zm2: number) => number = zm1 => zm2 => {
  const r = zm1 * zm2
  const y = 0.452017307281494140625
  return (
    r * y +
    r *
      (evaluatePolynonmial(-zm2)(tableLogGamma_15_2P) /
        evaluatePolynonmial(-zm2)(tableLogGamma_15_2Q))
  )
}

const lgamma2_3: (z: number) => number = z => {
  const zm2 = z - 2
  const r = zm2 * (z + 1)
  const y = 0.158963680267333984375
  return (
    r * y +
    r *
      (evaluatePolynonmial(zm2)(tableLogGamma_2_3P) /
        evaluatePolynonmial(zm2)(tableLogGamma_2_3Q))
  )
}

const lgammaSmall: (z: number) => number = z => {
  const zm1 = z - 1
  const go: (acc: number) => (z: number) => number = acc => z =>
    z < 3 ? acc + lgamma2_3(z) : go(acc + Math.log(zm1))(zm1)
  return go(0)(z)
}

const lanczosApprox: (z: number) => number = z => {
  const g = 6.024680040776729583740234375
  return (Math.log(z + g - 0.5) - 1) * (z - 0.5) + Math.log(evalRatio(tableLanczos)(z))
}

const logGamma: (z: number) => number = z => {
  if (z <= 0) return Infinity
  // For very small values z we can just use Laurent expansion
  if (z < M_SQRT_EPS) return Math.log(1 / z - M_EULER_MASCHERONI)
  // For z<1 we use recurrence. Γ(z+1) = z·Γ(z) Note that in order to
  // avoid precision loss we have to compute parameter to
  // approximations here:
  //
  // > (z + 1) - 1 = z
  // > (z + 1) - 2 = z - 1
  //
  // Simple passing (z + 1) to piecewise approxiations and computing
  // difference leads to bad loss of precision near 1.
  // This is reason lgamma1_15 & lgamma15_2 have three parameters
  if (z < 0.5) return lgamma1_15(z)(z - 1) - Math.log(z)
  if (z < 1) return lgamma15_2(z)(z - 1) - Math.log(z)
  // Piecewise polynomial approximations
  if (z <= 1.5) return lgamma1_15(z - 1)(z - 2)
  if (z < 2) return lgamma15_2(z - 1)(z - 2)
  if (z < 15) return lgammaSmall(z)
  // Otherwise we switch to Lanczos approximations
  return lanczosApprox(z)
}

const chebyshevBroucke: (x: number) => (coeffs: ReadonlyArray<number>) => number =
  x => coeffs => {
    const x2 = x * 2
    const step: (k: number, b: TripleNumber) => TripleNumber = (k, [b0, b1]) => [
      k + x2 * b0 - b1,
      b0,
      b1,
    ]
    const fini: (b: TripleNumber) => number = ([b0, , b2]) => (b0 - b2) * 0.5
    return pipe(coeffs, RA.reduceRight(tuple(0, 0, 0), step), fini)
  }

const unsafe_logGammaCorrection: (x: number) => number = x => {
  const big = 94906265.62425156
  const t = 10 / x
  const coeffs = [
    0.1666389480451863247205729650822, -0.1384948176067563840732986059135e-4,
    0.9810825646924729426157171547487e-8, -0.1809129475572494194263306266719e-10,
    0.6221098041892605227126015543416e-13, -0.3399615005417721944303330599666e-15,
    0.2683181998482698748957538846666e-17,
  ]
  if (x < 10) return NaN
  if (x < big) return chebyshevBroucke(t * t * 2 - 1)(coeffs) / x
  return 1 / (x * 12)
}

export const logBeta: (a: number) => (b: number) => number = a => b => {
  const p = Math.min(a, b)
  const q = Math.max(a, b)
  const pq = p + q
  const ppq = p / pq
  if (p < 0) return NaN
  if (p === 0) return Infinity
  const allStirling =
    Math.log(q) * -0.5 +
    LN_SQRT_2_PI +
    unsafe_logGammaCorrection(p) +
    (unsafe_logGammaCorrection(q) - unsafe_logGammaCorrection(pq)) +
    (p - 0.5) * Math.log(ppq) +
    q * Math.log(1 - ppq)
  if (p >= 10) return allStirling
  const twoStirling =
    logGamma(p) +
    (unsafe_logGammaCorrection(q) - unsafe_logGammaCorrection(pq)) +
    p -
    p * Math.log(pq) +
    (q - 0.5) * Math.log(1 - ppq)
  if (q >= 10) return twoStirling
  return logGamma(p) + (logGamma(q) - logGamma(pq))
}

const chooseExact: (n: number) => (k: number) => number = k => n => {
  const go: (a: number, i: number) => number = (a, i) => {
    const nk = n - k
    return (a * (nk + i)) / i
  }
  return pipe(RNEA.range(1, k), RA.reduce(1, go))
}

const logChooseFast: (n: number) => (k: number) => number = n => k =>
  -Math.log(n + 1) - logBeta(n - k + 1)(k + 1)

export const choose: (n: number) => (k: number) => number = n => k => {
  if (k > n) return 0
  const kP = Math.min(k, n - k)
  if (kP < 50) return chooseExact(n)(k)
  const approx = pipe(kP, logChooseFast(n), Math.exp)
  const max64 = Infinity
  if (approx < max64) return Math.round(approx)
  return approx
}
