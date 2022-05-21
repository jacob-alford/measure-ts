import { pipe } from 'fp-ts/function'
import * as Meas from '../Measure'

describe('Measure', () => {
  describe('binomial()', () => {
    const n = 10
    const p = 0.5
    const binomial = Meas.binomial(n)(p)
    const prioriExpectation = n * p
    const prioriVariance = n * p * (1 - p)
    it('encodes expectation', () => {
      expect(Meas.expectation(binomial)).toBeCloseTo(prioriExpectation, 0)
    })
    it('encodes variance', () => {
      expect(Meas.variance(binomial)).toBeCloseTo(prioriVariance, 0)
    })
  })
  /** TODO: Figure out why Beta is failing */
  describe.skip('beta()', () => {
    const a = 10
    const b = 10
    const beta = Meas.beta(10)(10)
    const prioriExpectation = a / (a + b)
    const prioriVariance = (a * b) / ((a + b + 1) * (a + b) ** 2)
    it('encodes expectation', () => {
      expect(Meas.expectation(beta)).toBeCloseTo(prioriExpectation)
    })
    it('encodes variance', () => {
      expect(Meas.variance(beta)).toBeCloseTo(prioriVariance)
    })
  })
  /** TODO: Figure out why Maximum call stack is exceeded */
  describe.skip('chain()', () => {
    const n = 10
    const a = 1
    const b = 8
    const betaBinomial = pipe(Meas.beta(a)(b), Meas.chain(Meas.binomial(n)))
    const prioriExpectation = (n * a) / (a + b)
    const prioriVariance = (n * a * b * (a + b + n)) / ((a + b + 1) * (a + b) ** 2)
    it('encodes expectation', () => {
      expect(Meas.expectation(betaBinomial)).toBeCloseTo(prioriExpectation)
    })
    it('encodes variance', () => {
      expect(Meas.variance(betaBinomial)).toBeCloseTo(prioriVariance)
    })
  })
  describe('chisq()', () => {
    const k = 2
    const chisq = Meas.chisq(k)
    const prioriExpectation = k
    const prioriVariance = 2 * k
    it('encodes expectation', () => {
      expect(Meas.expectation(chisq)).toBeCloseTo(prioriExpectation)
    })
    it('encodes variannce', () => {
      expect(Meas.variance(chisq)).toBeCloseTo(prioriVariance)
    })
  })
  describe('gaussian()', () => {
    const m = 1
    const s = 2
    const gauss = Meas.gaussian(m)(s)
    const prioriExpectation = m
    const prioriVariance = s ** 2
    it('encodes expectation', () => {
      expect(Meas.expectation(gauss)).toBeCloseTo(prioriExpectation)
    })
    it('encodes variance', () => {
      expect(Meas.variance(gauss)).toBeCloseTo(prioriVariance)
    })
  })
  describe('Σ gaussian()', () => {
    const gauss1 = Meas.gaussian(1)(2)
    const gauss2 = Meas.gaussian(2)(3)
    const g1g2 = Meas.FieldNumber.add(gauss1, gauss2)
    it('encodes expectation', () => {
      expect(Meas.expectation(g1g2)).toBeCloseTo(3)
    })
    it('encodes variance', () => {
      expect(Meas.variance(g1g2)).toBeCloseTo(13)
    })
  })
  describe('∏ gaussian()', () => {
    const gauss1 = Meas.gaussian(1)(2)
    const gauss2 = Meas.gaussian(2)(3)
    const g1g2 = Meas.FieldNumber.mul(gauss1, gauss2)
    it('encodes expectation', () => {
      expect(Meas.expectation(g1g2)).toBeCloseTo(2)
    })
    it('encodes variance', () => {
      expect(Meas.variance(g1g2)).toBeCloseTo(61)
    })
  })
})
