import { describe, it, expect } from 'vitest'
import { resolveItemCategory } from '~/composables/useItemCategory'
import type { OrderItem } from '~/types'

describe('resolveItemCategory', () => {
  it('pizza → CAT-01', () => {
    const it: OrderItem = {
      kind: 'pizza', size: 'GRANDE',
      flavor1: { id: 'f1', name: 'Calabresa', category: 'salgada', priceBySize: { GRANDE: 60 } },
      isHalfHalf: false, pricingRule: 'HYBRID', stuffedCrust: false, stuffedCrustPrice: 0,
      additionals: [], removedIngredients: [], quantity: 1,
    }
    expect(resolveItemCategory(it)).toEqual({ code: 'CAT-01', label: 'Pizza', icon: '🍕' })
  })

  it('snack (lanche) → CAT-02', () => {
    const it: OrderItem = {
      kind: 'snack', productId: 's1', name: 'X-Burguer', unitPrice: 15,
      additionals: [], removedIngredients: [], quantity: 1,
    }
    expect(resolveItemCategory(it, { snackKindById: () => 'lanche' }).code).toBe('CAT-02')
  })

  it('snack (beirute) → CAT-03', () => {
    const it: OrderItem = {
      kind: 'snack', productId: 's2', name: 'Beirute', unitPrice: 20,
      additionals: [], removedIngredients: [], quantity: 1,
    }
    expect(resolveItemCategory(it, { snackKindById: () => 'beirute' }).code).toBe('CAT-03')
  })

  it('snack (porção) → CAT-04', () => {
    const it: OrderItem = {
      kind: 'snack', productId: 's3', name: 'Fritas', unitPrice: 18,
      additionals: [], removedIngredients: [], quantity: 1,
    }
    expect(resolveItemCategory(it, { snackKindById: () => 'porcao' }).code).toBe('CAT-04')
  })

  it('beverage (suco) → CAT-05', () => {
    const it: OrderItem = {
      kind: 'beverage', productId: 'b1', name: 'Suco de laranja',
      variantLabel: '500ml', unitPrice: 8, quantity: 1,
    }
    expect(resolveItemCategory(it, { beverageKindById: () => 'suco' }).code).toBe('CAT-05')
  })

  it('beverage (refrigerante) → CAT-06', () => {
    const it: OrderItem = {
      kind: 'beverage', productId: 'b2', name: 'Coca-Cola',
      variantLabel: 'Lata', unitPrice: 6, quantity: 1,
    }
    expect(resolveItemCategory(it, { beverageKindById: () => 'refrigerante' }).code).toBe('CAT-06')
  })

  it('fallback quando menu não está carregado: snack sem kind → Lanche', () => {
    const it: OrderItem = {
      kind: 'snack', productId: 'x', name: '?', unitPrice: 0,
      additionals: [], removedIngredients: [], quantity: 1,
    }
    expect(resolveItemCategory(it).label).toBe('Lanche')
  })

  it('fallback beverage sem kind → Refrigerante', () => {
    const it: OrderItem = {
      kind: 'beverage', productId: 'x', name: '?', variantLabel: 'L', unitPrice: 0, quantity: 1,
    }
    expect(resolveItemCategory(it).label).toBe('Refrigerante')
  })
})
