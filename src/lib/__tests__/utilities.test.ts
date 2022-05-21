import * as U from '../utilities'

describe('utilities', () => {
  describe('chooseExact()', () => {
    it('chooses exactly', () => {
      expect(U.chooseExact(10)(5)).toBe(252)
    })
  })
  describe('logGamma()', () => {
    it('computes logGamma', () => {
      expect(U.logGamma(3.5)).toBeCloseTo(1.2)
    })
  })
})
