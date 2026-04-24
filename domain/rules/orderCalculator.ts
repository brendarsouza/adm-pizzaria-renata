import type { OrderItem, OrderPizzaItem, OrderSnackItem, OrderBeverageItem, Payment } from '~/types'
import { Money } from '../value-objects/Money'
import { calcularPrecoPizza } from './pizzaPricer'

export function calcularPrecoSnack(item: OrderSnackItem): Money {
  const base = Money.fromReais(item.unitPrice)
  const adicionais = item.additionals.reduce(
    (acc, a) => acc.add(Money.fromReais(a.price)),
    Money.zero(),
  )
  return base.add(adicionais).multiply(item.quantity)
}

export function calcularPrecoBeverage(item: OrderBeverageItem): Money {
  return Money.fromReais(item.unitPrice).multiply(item.quantity)
}

export function calcularPrecoItem(item: OrderItem): Money {
  switch (item.kind) {
    case 'pizza':
      return calcularPrecoPizza(item as OrderPizzaItem)
    case 'snack':
      return calcularPrecoSnack(item)
    case 'beverage':
      return calcularPrecoBeverage(item)
  }
}

export function calcularSubtotal(items: OrderItem[]): Money {
  return items.reduce((acc, i) => acc.add(calcularPrecoItem(i)), Money.zero())
}

export function calcularTotalPedido(items: OrderItem[], deliveryFeeReais: number): Money {
  return calcularSubtotal(items).add(Money.fromReais(deliveryFeeReais))
}

/**
 * Calcula o troco dado o total do pedido e o valor em dinheiro informado pelo cliente.
 * Retorna null se o valor for insuficiente.
 */
export function calcularTroco(total: Money, cashGivenReais: number): Money | null {
  const dado = Money.fromReais(cashGivenReais)
  const diff = dado.toCents() - total.toCents()
  if (diff < 0) return null
  return Money.fromCents(diff)
}

/**
 * Valida se o pagamento está completo/pronto para mover para PREPARING.
 * - PIX exige proofConfirmed=true
 * - CASH com needsChange=true exige cashGiven ≥ total
 * - CARD exige brand
 */
export function pagamentoEstaValido(payment: Payment, total: Money): { ok: boolean; reason?: string } {
  if (payment.method === 'PIX') {
    return payment.proofConfirmed
      ? { ok: true }
      : { ok: false, reason: 'Aguardando confirmação do comprovante PIX' }
  }
  if (payment.method === 'CASH') {
    if (payment.needsChange) {
      if (payment.cashGiven === undefined) return { ok: false, reason: 'Informe o valor que o cliente vai pagar' }
      if (calcularTroco(total, payment.cashGiven) === null) {
        return { ok: false, reason: 'Valor em dinheiro menor que o total' }
      }
    }
    return { ok: true }
  }
  if (payment.method === 'CARD') {
    return payment.brand ? { ok: true } : { ok: false, reason: 'Informe a bandeira do cartão' }
  }
  return { ok: false, reason: 'Forma de pagamento inválida' }
}
