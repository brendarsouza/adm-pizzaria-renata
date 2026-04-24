import { describe, it, expect } from 'vitest'
import { Money } from '~/domain/value-objects/Money'

describe('Money', () => {
  it('evita erro de ponto flutuante (0.1 + 0.2)', () => {
    const a = Money.fromReais(0.1)
    const b = Money.fromReais(0.2)
    expect(a.add(b).toReais()).toBe(0.3)
  })
  it('formata em BRL', () => {
    expect(Money.fromReais(1234.5).format()).toContain('1.234,50')
  })
  it('multiplica por quantity', () => {
    expect(Money.fromReais(10).multiply(3).toReais()).toBe(30)
  })
  it('subtrai sem underflow', () => {
    expect(Money.fromReais(100).subtract(Money.fromReais(30)).toReais()).toBe(70)
  })
  it('compara igualdade', () => {
    expect(Money.fromReais(10).equals(Money.fromCents(1000))).toBe(true)
  })
})
