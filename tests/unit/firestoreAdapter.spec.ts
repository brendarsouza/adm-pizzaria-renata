import { describe, it, expect } from 'vitest'
import { stripUndefined } from '~/infrastructure/firebase/firestoreAdapter'

describe('stripUndefined', () => {
  it('remove chaves undefined de objetos planos', () => {
    const input = { a: 1, b: undefined, c: 'ok' }
    expect(stripUndefined(input)).toEqual({ a: 1, c: 'ok' })
  })

  it('remove undefined em objetos aninhados', () => {
    const input = { a: { b: undefined, c: 2 }, d: undefined }
    expect(stripUndefined(input)).toEqual({ a: { c: 2 } })
  })

  it('preserva arrays e remove undefined dentro deles', () => {
    const input = { items: [{ x: 1, y: undefined }, { z: 2 }] }
    expect(stripUndefined(input)).toEqual({ items: [{ x: 1 }, { z: 2 }] })
  })

  it('preserva null, 0 e false', () => {
    const input = { a: null, b: 0, c: false, d: undefined }
    expect(stripUndefined(input)).toEqual({ a: null, b: 0, c: false })
  })

  it('não quebra com arrays de primitivos', () => {
    const input = [1, undefined, 'teste', null]
    expect(stripUndefined(input)).toEqual([1, 'teste', null])
  })

  it('funciona como no caso real de pedido com campos opcionais', () => {
    const order = {
      sequentialNumber: 1,
      customerId: 'c1',
      customerSnapshot: { name: 'João', phone: '11999990000' },
      addressSnapshot: {
        id: 'a1',
        street: 'Rua A',
        number: '10',
        complement: undefined,      // campo opcional
        district: 'Centro',
        reference: undefined,       // campo opcional
        roadType: 'asfalto',
        gps: undefined,             // campo opcional
        accessNotes: undefined,      // campo opcional
        createdAt: undefined,
      },
      items: [
        {
          kind: 'pizza',
          size: 'GRANDE',
          flavor1: { id: 'f1', name: 'Calabresa', category: 'salgada' as const, priceBySize: { GRANDE: 60 } },
          flavor2: undefined,        // campo opcional
          isHalfHalf: false,
          pricingRule: 'HYBRID' as const,
          stuffedCrust: false,
          stuffedCrustPrice: 15,
          additionals: [],
          removedIngredients: [],
          observation: undefined,     // campo opcional
          quantity: 1,
        },
      ],
      deliveryFee: 5,
      estimateMinutes: 45,
      estimatedDeliveryAt: Date.now(),
      itemsSubtotal: 60,
      total: 65,
      payment: { method: 'CASH' as const, needsChange: false, cashGiven: undefined, change: undefined },
      status: 'PREPARING' as const,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: 'uid123',
      cancelReason: undefined,
    }

    const clean = stripUndefined(order)
    // Nenhuma chave undefined deve existir no objeto limpo
    expect(JSON.stringify(clean)).not.toContain('undefined')

    // Campos obrigatórios preservados
    expect(clean.sequentialNumber).toBe(1)
    expect(clean.customerSnapshot.name).toBe('João')
    expect(clean.addressSnapshot.street).toBe('Rua A')
    expect(clean.items[0].kind).toBe('pizza')
    expect(clean.payment.method).toBe('CASH')
    expect(clean.status).toBe('PREPARING')
  })
})
