import { describe, it, expect } from 'vitest'
import { calcularPrecoPizzaUnit, calcularPrecoPizza, resolvePricingRule } from '~/domain/rules/pizzaPricer'
import type { OrderPizzaItem, PizzaCategory } from '~/types'

function makeItem(partial: Partial<OrderPizzaItem> = {}): OrderPizzaItem {
  const base: OrderPizzaItem = {
    kind: 'pizza',
    size: 'GRANDE',
    flavor1: {
      id: 'f1', name: 'Calabresa', category: 'salgada',
      priceBySize: { BROTO: 30, MEDIA: 45, GRANDE: 60, FAMILIA: 75 },
    },
    isHalfHalf: false,
    pricingRule: 'HYBRID',
    stuffedCrust: false,
    stuffedCrustPrice: 15,
    additionals: [],
    removedIngredients: [],
    quantity: 1,
  }
  return { ...base, ...partial }
}

describe('resolvePricingRule (regra Renata HYBRID)', () => {
  const cases: Array<[PizzaCategory, PizzaCategory, 'AVERAGE' | 'HIGHEST']> = [
    ['salgada', 'salgada', 'AVERAGE'],
    ['salgada', 'doce', 'HIGHEST'],
    ['doce', 'salgada', 'HIGHEST'],
    ['doce', 'doce', 'HIGHEST'],
  ]
  it.each(cases)('HYBRID: %s + %s → %s', (c1, c2, expected) => {
    expect(resolvePricingRule('HYBRID', c1, c2)).toBe(expected)
  })

  it('respeita override explícito AVERAGE', () => {
    expect(resolvePricingRule('AVERAGE', 'doce', 'doce')).toBe('AVERAGE')
  })
  it('respeita override explícito HIGHEST', () => {
    expect(resolvePricingRule('HIGHEST', 'salgada', 'salgada')).toBe('HIGHEST')
  })
})

describe('calcularPrecoPizzaUnit', () => {
  it('pizza inteira: retorna preço do tamanho', () => {
    const item = makeItem({ size: 'GRANDE' })
    expect(calcularPrecoPizzaUnit(item).toReais()).toBe(60)
  })

  it('meio-a-meio salgada+salgada: média (HYBRID)', () => {
    const item = makeItem({
      isHalfHalf: true,
      flavor2: {
        id: 'f2', name: 'Portuguesa', category: 'salgada',
        priceBySize: { GRANDE: 70 },
      },
    })
    // (60 + 70)/2 = 65
    expect(calcularPrecoPizzaUnit(item).toReais()).toBe(65)
  })

  it('meio-a-meio salgada+doce: HIGHEST (HYBRID)', () => {
    const item = makeItem({
      isHalfHalf: true,
      flavor2: {
        id: 'f2', name: 'Chocolate', category: 'doce',
        priceBySize: { GRANDE: 80 },
      },
    })
    expect(calcularPrecoPizzaUnit(item).toReais()).toBe(80)
  })

  it('meio-a-meio doce+doce: HIGHEST (HYBRID)', () => {
    const item = makeItem({
      flavor1: {
        id: 'f1', name: 'Brigadeiro', category: 'doce',
        priceBySize: { GRANDE: 70 },
      },
      isHalfHalf: true,
      flavor2: {
        id: 'f2', name: 'Romeu & Julieta', category: 'doce',
        priceBySize: { GRANDE: 90 },
      },
    })
    expect(calcularPrecoPizzaUnit(item).toReais()).toBe(90)
  })

  it('adicional FULL soma preço inteiro', () => {
    const item = makeItem({
      additionals: [
        { additionalId: 'a1', name: 'Catupiry', priceWhole: 10, priceHalf: 6, half: 'FULL' },
      ],
    })
    expect(calcularPrecoPizzaUnit(item).toReais()).toBe(70)
  })

  it('adicional HALF_1 soma preço da metade', () => {
    const item = makeItem({
      additionals: [
        { additionalId: 'a1', name: 'Catupiry', priceWhole: 10, priceHalf: 6, half: 'HALF_1' },
      ],
    })
    expect(calcularPrecoPizzaUnit(item).toReais()).toBe(66)
  })

  it('borda recheada soma preço configurado', () => {
    const item = makeItem({ stuffedCrust: true, stuffedCrustPrice: 15 })
    expect(calcularPrecoPizzaUnit(item).toReais()).toBe(75)
  })

  it('remoção de ingredientes NÃO desconta', () => {
    const item = makeItem({ removedIngredients: ['cebola', 'azeitona'] })
    expect(calcularPrecoPizzaUnit(item).toReais()).toBe(60)
  })

  it('combina meio-a-meio + adicionais + borda', () => {
    const item = makeItem({
      isHalfHalf: true,
      flavor2: {
        id: 'f2', name: 'Portuguesa', category: 'salgada',
        priceBySize: { GRANDE: 70 },
      },
      stuffedCrust: true,
      stuffedCrustPrice: 15,
      additionals: [
        { additionalId: 'a1', name: 'Catupiry', priceWhole: 10, priceHalf: 6, half: 'HALF_1' },
        { additionalId: 'a2', name: 'Bacon', priceWhole: 12, priceHalf: 7, half: 'FULL' },
      ],
    })
    // base=65, adicionais=6+12=18, borda=15 → 98
    expect(calcularPrecoPizzaUnit(item).toReais()).toBe(98)
  })

  it('lança erro se tamanho não existir para o sabor', () => {
    const item = makeItem({
      size: 'FAMILIA',
      flavor1: {
        id: 'f1', name: 'Calabresa', category: 'salgada',
        priceBySize: { GRANDE: 60 },
      },
    })
    expect(() => calcularPrecoPizzaUnit(item)).toThrow()
  })
})

describe('calcularPrecoPizza (com quantity)', () => {
  it('multiplica pelo quantity', () => {
    const item = makeItem({ quantity: 3 })
    expect(calcularPrecoPizza(item).toReais()).toBe(180)
  })
})
