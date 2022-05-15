// ######################################################################
// #### Port of Giry Monad from Haskell by Jared Tobin in Typescript ####
// #### https://jtobin.io/giry-monad-implementation #####################
// ######################################################################

import * as Fun from 'fp-ts/Functor'
import * as Ap from 'fp-ts/Apply'
import * as Apl from 'fp-ts/Applicative'
import * as Chn from 'fp-ts/Chain'
import * as Fld from 'fp-ts/Field'
import * as Sg from 'fp-ts/Semigroup'
import * as Mon from 'fp-ts/Monad'
import * as Mn from 'fp-ts/Monoid'
import * as Pt from 'fp-ts/Pointed'
import * as RA from 'fp-ts/ReadonlyArray'
import * as RNEA from 'fp-ts/ReadonlyNonEmptyArray'
import * as N from 'fp-ts/number'
import { flow, identity, pipe } from 'fp-ts/function'

import { everywhere, trap } from './lib/TanhSinh'
import { choose, logBeta } from './lib/utilities'

// #############
// ### Model ###
// #############

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
export const fromMassFunction: <A>(
  f: (a: A) => number
) => (support: ReadonlyArray<A>) => Measure<A> = f => support => g =>
  pipe(
    support,
    RA.foldMap(N.MonoidSum)(x => f(x) * g(x))
  )

/**
 * @since 1.0.0
 * @category Constructors
 */
export const fromDensityFunction: (d: (n: number) => number) => Measure<number> =
  d => f => {
    const quadratureTanhSinh = flow(everywhere(trap), RNEA.last, ({ result }) => result)
    return quadratureTanhSinh(x => f(x) * d(x))
  }

/**
 * @since 1.0.0
 * @category Internal
 */
const weightedAverage: <A>(f: (a: A) => number) => (as: ReadonlyArray<A>) => number =
  f => as =>
    pipe(
      as,
      RA.foldMap(N.MonoidSum)(a => f(a) / as.length)
    )

/**
 * @since 1.0.0
 * @category Constructors
 */
export const fromSample: <A>(as: ReadonlyArray<A>) => Measure<A> = as => f =>
  weightedAverage(f)(as)

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

/**
 * @since 1.0.0
 * @category Constructors
 */
export const gaussian: (m: number) => (s: number) => Measure<number> = m => s => {
  const density: (m: number) => (s: number) => (x: number) => number = m => s => x =>
    s <= 0
      ? 0
      : (1 / (s * Math.sqrt(2 * Math.PI))) * Math.exp(-((x - m) ** 2) / (2 * s ** 2))
  return fromDensityFunction(density(m)(s))
}

/**
 * @since 1.0.0
 * @category Constructors
 */
export const chisq: (k: number) => Measure<number> = k => {
  const normal = pipe(
    gaussian(0)(1),
    map(x => x ** 2)
  )
  return pipe(RNEA.replicate(normal)(k), RA.foldMap(MonoidSum)(identity))
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

export const Chain: Chn.Chain1<URI> = {
  ...Apply,
  chain: _chain,
}

/**
 * @since 1.0.0
 * @category Instances
 */
export const Monad: Mon.Monad1<URI> = {
  ...Applicative,
  ...Chain,
}

/**
 * @since 1.0.0
 * @category Internal
 */
const liftA2: <A>(
  b: (x1: A, y1: A) => A
) => (x2: Measure<A>, y2: Measure<A>) => Measure<A> = b => (x2, y2) =>
  pipe(
    Do,
    apS('x', x2),
    apS('y', y2),
    map(({ x, y }) => b(x, y))
  )

/**
 * @since 1.0.0
 * @category Instances
 */
export const getSemigroup: <A>(S: Sg.Semigroup<A>) => Sg.Semigroup<Measure<A>> = S => ({
  concat: liftA2(S.concat),
})

/**
 * @since 1.0.0
 * @category Instances
 */
export const getMonoid: <A>(M: Mn.Monoid<A>) => Mn.Monoid<Measure<A>> = M => ({
  empty: of(M.empty),
  ...getSemigroup(M),
})

/**
 * @since 1.0.0
 * @category Instances
 */
export const getField: <A>(F: Fld.Field<A>) => Fld.Field<Measure<A>> = F => ({
  add: liftA2(F.add),
  zero: of(F.zero),
  sub: liftA2(F.sub),
  mul: liftA2(F.mul),
  one: of(F.one),
  div: liftA2(F.div),
  degree: of(F.degree),
  mod: liftA2(F.mod),
})

/**
 * @since 1.0.0
 * @category Instances
 */
export const MonoidSum: Mn.Monoid<Measure<number>> = getMonoid(N.MonoidSum)

/**
 * @since 1.0.0
 * @category Instances
 */
export const MonoidProudct: Mn.Monoid<Measure<number>> = getMonoid(N.MonoidProduct)

/**
 * @since 1.0.0
 * @category Instances
 */
export const FieldNumber: Fld.Field<Measure<number>> = getField(N.Field)

// ###################
// ### Destructors ###
// ##################

/**
 * @since 1.0.0
 * @category Destructors
 */
export const integrate: <A>(f: (a: A) => number) => (nu: Measure<A>) => number =
  f => nu =>
    nu(f)

/**
 * @since 1.0.0
 * @category Destructors
 */
export const expectation: (nu: Measure<number>) => number = integrate(identity)

/**
 * @since 1.0.0
 * @category Destructors
 */
export const variance: (nu: Measure<number>) => number = nu =>
  pipe(
    nu,
    integrate(n => n ** 2),
    v => v - expectation(nu) ** 2
  )

/**
 * @since 1.0.0
 * @category Destructors
 */
export const momentGeneratingFunction: (
  t: number
) => (nu: Measure<number>) => number = t => integrate(x => Math.exp(t * x))

// ###################
// ### Combinators ###
// ###################

/**
 * @since 1.0.0
 * @category Combinators
 */
export const apFirst = Ap.apFirst(Apply)

/**
 * @since 1.0.0
 * @category Combinators
 */
export const apSecond = Ap.apSecond(Apply)

/**
 * @since 1.0.0
 * @category Combinators
 */
export const flatten: <A>(fa: Measure<Measure<A>>) => Measure<A> = chain(identity)

// ###################
// ### Do Notation ###
// ###################

/**
 * @since 1.0.0
 * @category Do notation
 */
export const Do = of({})

/**
 * @since 1.0.0
 * @category Do notation
 */
export const bindTo = Fun.bindTo(Functor)

/**
 * @since 1.0.0
 * @category Do notation
 */
export const bind = Chn.bind(Chain)

/**
 * @since 1.0.0
 * @category Do notation
 */
export const apS = Ap.apS(Apply)
