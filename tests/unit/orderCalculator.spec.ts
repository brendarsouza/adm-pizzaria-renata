import { describe, it, expect } from 'vitest'
import {
  calcularSubtotal,
  calcularTotalPedido,
  calcularTroco,
  pagamentoEstaValido,
} from '~/domain/rules/orderCalculator'
import { Money } from '~/domain/value-objects/Money'
import type { OrderItem, Payment } from '~/types'

const pizza: OrderItem = {
  kind: 'pizza',
  size: 'GRANDE',
  flavor1: { id: 'f1', name: 'Calabresa', category: 'salgada', priceBySize: { GRANDE: 60 } },
  isHalfHalf: false,
  pricingRule: 'HYBRID',
  stuffedCrust: false,
  stuffedCrustPrice: 15,
  additionals: [],
  removedIngredients: [],
  quantity: 1,
}
const bebida: OrderItem = {
  kind: 'beverage',
  productId: 'b1',
  name: 'Coca-Cola 2L',
  variantLabel: '2L',
  unitPrice: 15,
  quantity: 2,
}

describe('calcularSubtotal', () => {
  it('soma todos os itens', () => {
    expect(calcularSubtotal([pizza, bebida]).toReais()).toBe(90) // 60 + 30
  })
  it('vazio → 0', () => {
    expect(calcularSubtotal([]).toReais()).toBe(0)
  })
})

describe('calcularTotalPedido', () => {
  it('soma taxa de entrega', () => {
    expect(calcularTotalPedido([pizza, bebida], 10).toReais()).toBe(100)
  })
})

describe('calcularTroco', () => {
  it('calcula corretamente', () => {
    const troco = calcularTroco(Money.fromReais(80), 100)
    expect(troco?.toReais()).toBe(20)
  })
  it('retorna null se insuficiente', () => {
    expect(calcularTroco(Money.fromReais(80), 50)).toBeNull()
  })
  it('exato → 0', () => {
    expect(calcularTroco(Money.fromReais(80), 80)?.toReais()).toBe(0)
  })
})

describe('pagamentoEstaValido', () => {
  const total = Money.fromReais(100)

  it('PIX sem comprovante → inválido', () => {
    const p: Payment = { method: 'PIX', proofConfirmed: false }
    expect(pagamentoEstaValido(p, total).ok).toBe(false)
  })
  it('PIX confirmado → válido', () => {
    const p: Payment = { method: 'PIX', proofConfirmed: true }
    expect(pagamentoEstaValido(p, total).ok).toBe(true)
  })
  it('CASH sem troco → válido', () => {
    const p: Payment = { method: 'CASH', needsChange: false }
    expect(pagamentoEstaValido(p, total).ok).toBe(true)
  })
  it('CASH com troco e valor insuficiente → inválido', () => {
    const p: Payment = { method: 'CASH', needsChange: true, cashGiven: 50 }
    expect(pagamentoEstaValido(p, total).ok).toBe(false)
  })
  it('CASH com troco e valor suficiente → válido', () => {
    const p: Payment = { method: 'CASH', needsChange: true, cashGiven: 150 }
    expect(pagamentoEstaValido(p, total).ok).toBe(true)
  })
  it('CARD sem bandeira → inválido', () => {
    const p = { method: 'CARD', brand: undefined, debitOrCredit: 'credit' } as unknown as Payment
    expect(pagamentoEstaValido(p, total).ok).toBe(false)
  })
  it('CARD com bandeira → válido', () => {
    const p: Payment = { method: 'CARD', brand: 'VISA', debitOrCredit: 'credit' }
    expect(pagamentoEstaValido(p, total).ok).toBe(true)
  })
})
