import type { OrderPizzaItem, PricingRule, PizzaCategory } from '~/types'
import { Money } from '../value-objects/Money'

/**
 * Resolve a regra de precificação meio-a-meio aplicada efetivamente.
 *
 * Regra da Pizzaria Renata (HYBRID):
 * - salgada + salgada → AVERAGE (média)
 * - salgada + doce    → HIGHEST (maior valor)
 * - doce + doce       → HIGHEST
 *
 * Se a regra explícita for AVERAGE ou HIGHEST, aplica diretamente.
 */
export function resolvePricingRule(
  rule: PricingRule,
  cat1: PizzaCategory,
  cat2: PizzaCategory,
): 'AVERAGE' | 'HIGHEST' {
  if (rule === 'AVERAGE') return 'AVERAGE'
  if (rule === 'HIGHEST') return 'HIGHEST'
  // HYBRID:
  if (cat1 === 'salgada' && cat2 === 'salgada') return 'AVERAGE'
  return 'HIGHEST'
}

/**
 * Calcula o preço de UMA unidade de pizza (ainda sem multiplicar por quantity).
 * Função pura — testada em tests/unit/pizzaPricer.spec.ts.
 */
export function calcularPrecoPizzaUnit(item: OrderPizzaItem): Money {
  const p1Raw = item.flavor1.priceBySize[item.size]
  if (p1Raw === undefined) {
    throw new Error(`Sabor ${item.flavor1.name} não possui preço para tamanho ${item.size}`)
  }
  const p1 = Money.fromReais(p1Raw)

  let base: Money
  if (item.isHalfHalf) {
    if (!item.flavor2) throw new Error('Pizza meio-a-meio exige flavor2')
    const p2Raw = item.flavor2.priceBySize[item.size]
    if (p2Raw === undefined) {
      throw new Error(`Sabor ${item.flavor2.name} não possui preço para tamanho ${item.size}`)
    }
    const p2 = Money.fromReais(p2Raw)
    const effectiveRule = resolvePricingRule(
      item.pricingRule,
      item.flavor1.category,
      item.flavor2.category,
    )
    base = effectiveRule === 'HIGHEST'
      ? (p1.greaterThan(p2) ? p1 : p2)
      : p1.add(p2).divide(2)
  } else {
    base = p1
  }

  // Adicionais
  let adicionais = Money.zero()
  for (const add of item.additionals) {
    const price = add.half === 'FULL' ? add.priceWhole : add.priceHalf
    adicionais = adicionais.add(Money.fromReais(price))
  }

  // Borda recheada
  const borda = item.stuffedCrust ? Money.fromReais(item.stuffedCrustPrice) : Money.zero()

  return base.add(adicionais).add(borda)
}

/** Preço total da linha do pedido (unit × quantity). */
export function calcularPrecoPizza(item: OrderPizzaItem): Money {
  return calcularPrecoPizzaUnit(item).multiply(item.quantity)
}
