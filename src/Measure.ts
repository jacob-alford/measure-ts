// ######################################################################
// #### Port of Giry Monad from Haskell by Jared Tobin in Typescript ####
// #### https://jtobin.io/giry-monad-implementation #####################
// ######################################################################

import * as Fun from 'fp-ts/Functor'
import * as Ap from 'fp-ts/Apply'
import * as Apl from 'fp-ts/Applicative'
import * as Pt from 'fp-ts/Pointed'
import * as RA from 'fp-ts/ReadonlyArray'
import * as RNEA from 'fp-ts/ReadonlyNonEmptyArray'
import * as Mon from 'fp-ts/Monad'
import * as N from 'fp-ts/number'
import { flow, identity, pipe } from 'fp-ts/function'

import { everywhere, trap } from './lib/TanhSinh'
import { choose, logBeta } from './lib/utilities'

/**
 * @since 1.0.0
 * @category Model
 */
export interface Measure<A> {
  (now: (a: A) => number): number
}

// ####################
// ### Constructors ###
// ####################

/**
 * @since 1.0.0
 * @category Constructors
 */
export const binomial: (n: number) => (p: number) => Measure<number> = n => p => {
  const pmf: (n: number) => (p: number) => (x: number) => number = n => p => x =>
    x < 0 || n < x ? 0 : choose(n)(x) * p ** x * (1 - p) ** (n - x)
  return pipe(RNEA.range(0, n), fromMassFunction(pmf(n)(p)))
}

/**
 * @since 1.0.0
 * @category Constructors
 */
export const beta: (a: number) => (b: number) => Measure<number> = a => b => {
  const density: (a: number) => (b: number) => (p: number) => number = a => b => p =>
    p < 0 || p > 1 ? 0 : (1 / Math.exp(logBeta(a)(b))) * p ** (a - 1) * (1 - p) ** b - 1
  return fromDensityFunction(density(a)(b))
}

// #####################
// ### Non-Pipeables ###
// #####################

const _map: Fun.Functor1<URI>['map'] = (fa, f) => pipe(fa, map(f))
const _ap: Apl.Applicative1<URI>['ap'] = (fab, fa) => pipe(fab, ap(fa))
const _chain: Mon.Monad1<URI>['chain'] = (fa, f) => pipe(fa, chain(f))

// #################
// ### Instances ###
// #################

/**
 * @since 1.0.0
 * @category Instances
 */
export const URI = 'Measure'

/**
 * @since 1.0.0
 * @category Instances
 */
export type URI = typeof URI

declare module 'fp-ts/HKT' {
  interface URItoKind<A> {
    readonly [URI]: Measure<A>
  }
}

/**
 * @since 1.0.0
 * @category Instance operations
 */
export const map: <A, B>(f: (a: A) => B) => (fa: Measure<A>) => Measure<B> =
  f => fa => g =>
    pipe(fa, integrate(flow(f, g)))

/**
 * @since 1.0.0
 * @category Instances
 */
export const Functor: Fun.Functor1<URI> = {
  URI,
  map: _map,
}

/**
 * @since 1.0.0
 * @category Instance operations
 */
export const of: <A>(a: A) => Measure<A> = a => c => c(a)

/**
 * @since 1.0.0
 * @category Instances
 */
export const Pointed: Pt.Pointed1<URI> = {
  URI,
  of,
}

/**
 * @since 1.0.0
 * @category Instance operations
 */
export const ap: <A, B>(h: Measure<A>) => (g: Measure<(a: A) => B>) => Measure<B> =
  h => g => f =>
    g(k => h(flow(k, f)))

/**
 * @since 1.0.0
 * @category Instances
 */
export const Apply: Ap.Apply1<URI> = {
  ...Functor,
  ap: _ap,
}

/**
 * @since 1.0.0
 * @category Instances
 */
export const Applicative: Apl.Applicative1<URI> = {
  ...Apply,
  ...Pointed,
}

/**
 * @since 1.0.0
 * @category Instance operations
 */
export const chain: <A, B>(f: (a: A) => Measure<B>) => (rho: Measure<A>) => Measure<B> =
  f => rho => g =>
    pipe(
      rho,
      integrate(m => pipe(f(m), integrate(g)))
    )

/**
 * @since 1.0.0
 * @category Instances
 */
export const Monad: Mon.Monad1<URI> = {
  ...Applicative,
  chain: _chain,
}

// #################
// ### Utilities ###
// #################

/**
 * @since 1.0.0
 * @category Utilities
 */
export const integrate: <A>(f: (a: A) => number) => (nu: Measure<A>) => number =
  f => nu =>
    nu(f)

/**
 * @since 1.0.0
 * @category Utilities
 */
export const fromMassFunction: <A>(
  f: (a: A) => number
) => (support: ReadonlyArray<A>) => Measure<A> = f => support => g =>
  pipe(
    support,
    RA.foldMap(N.MonoidSum)(x => f(x) * g(x))
  )

/**
 * @since 1.0.0
 * @category Utilities
 */
export const fromDensityFunction: (d: (n: number) => number) => Measure<number> =
  d => f => {
    const quadratureTanhSinh = flow(everywhere(trap), RNEA.last, ({ result }) => result)
    return quadratureTanhSinh(x => f(x) * d(x))
  }

/**
 * @since 1.0.0
 * @category Utilities
 */
const weightedAverage: <A>(f: (a: A) => number) => (as: ReadonlyArray<A>) => number =
  f => as =>
    pipe(
      as,
      RA.foldMap(N.MonoidSum)(a => f(a) / as.length)
    )

/**
 * @since 1.0.0
 * @category Utilities
 */
export const fromSample: <A>(as: ReadonlyArray<A>) => Measure<A> = as => f =>
  weightedAverage(f)(as)

/**
 * @since 1.0.0
 * @category Utilities
 */
export const expectation: (nu: Measure<number>) => number = integrate(identity)

/**
 * @since 1.0.0
 * @category Utilities
 */
export const variance: (nu: Measure<number>) => number = nu =>
  pipe(
    nu,
    integrate(n => n ** 2),
    v => v - expectation(nu) ** 2
  )

/**
 * @since 1.0.0
 * @category Utilities
 */
export const momentGeneratingFunction: (
  t: number
) => (nu: Measure<number>) => number = t => integrate(x => Math.exp(t * x))
