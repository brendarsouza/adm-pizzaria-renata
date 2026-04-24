import { describe, it, expect } from 'vitest'
import type { OrderItem, OrderPizzaItem, OrderSnackItem, OrderBeverageItem, Address } from '~/types'
import {
  describeItemLine, describeItemLine2, itemExtraNotes,
  formatFullAddress, formatSequentialNumber, formatHourMinute,
} from '~/composables/useComandaFormat'

function makePizza(overrides: Partial<OrderPizzaItem> = {}): OrderPizzaItem {
  return {
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
    ...overrides,
  } as OrderPizzaItem
}

describe('describeItemLine', () => {
  it('pizza inteira: só o nome do sabor', () => {
    expect(describeItemLine(makePizza())).toBe('Calabresa')
  })

  it('pizza meio-a-meio: "1/2 sabor1" na primeira linha', () => {
    const it = makePizza({
      isHalfHalf: true,
      flavor2: { id: 'f2', name: 'Mussarela', category: 'salgada', priceBySize: { GRANDE: 55 } },
    })
    expect(describeItemLine(it)).toBe('1/2 Calabresa')
  })

  it('snack: só o nome', () => {
    const s: OrderSnackItem = {
      kind: 'snack', productId: 'p', name: 'Hot Dog', unitPrice: 15,
      additionals: [], removedIngredients: [], quantity: 1,
    }
    expect(describeItemLine(s)).toBe('Hot Dog')
  })

  it('beverage: nome + variante', () => {
    const b: OrderBeverageItem = {
      kind: 'beverage', productId: 'p', name: 'Coca-Cola',
      variantLabel: '2L', unitPrice: 15, quantity: 1,
    }
    expect(describeItemLine(b)).toBe('Coca-Cola 2L')
  })
})

describe('describeItemLine2', () => {
  it('retorna "1/2 sabor2" para meio-a-meio', () => {
    const it = makePizza({
      isHalfHalf: true,
      flavor2: { id: 'f2', name: 'Mussarela', category: 'salgada', priceBySize: {} },
    })
    expect(describeItemLine2(it)).toBe('1/2 Mussarela')
  })

  it('retorna vazio para pizza inteira', () => {
    expect(describeItemLine2(makePizza())).toBe('')
  })

  it('retorna vazio para snack/beverage', () => {
    const s: OrderSnackItem = {
      kind: 'snack', productId: 'p', name: 'X', unitPrice: 10,
      additionals: [], removedIngredients: [], quantity: 1,
    }
    expect(describeItemLine2(s)).toBe('')
  })
})

describe('itemExtraNotes', () => {
  it('inclui borda recheada', () => {
    const notes = itemExtraNotes(makePizza({ stuffedCrust: true }))
    expect(notes).toContain('Borda recheada')
  })

  it('inclui ingredientes removidos', () => {
    const notes = itemExtraNotes(makePizza({ removedIngredients: ['cebola', 'azeitona'] }))
    expect(notes.some(n => n.includes('SEM cebola'))).toBe(true)
  })

  it('inclui observação livre', () => {
    const notes = itemExtraNotes(makePizza({ observation: 'caprichar no queijo' }))
    expect(notes).toContain('caprichar no queijo')
  })

  it('inclui adicionais com marcação de meia', () => {
    const notes = itemExtraNotes(makePizza({
      additionals: [
        { additionalId: 'a1', name: 'Catupiry', priceWhole: 10, priceHalf: 6, half: 'HALF_1' },
      ],
    }))
    expect(notes.some(n => n.includes('Catupiry (meia)'))).toBe(true)
  })
})

describe('formatFullAddress', () => {
  it('monta endereço com todos os campos', () => {
    const a: Address = {
      id: '1', street: 'Rua A', number: '10', complement: 'ap 2',
      district: 'Centro', reference: 'portão vermelho',
      roadType: 'asfalto', accessNotes: 'depois da ponte',
    }
    const f = formatFullAddress(a)
    expect(f).toContain('Rua A, 10')
    expect(f).toContain('ap 2')
    expect(f).toContain('Centro')
    expect(f).toContain('portão vermelho')
    expect(f).toContain('depois da ponte')
  })
})

describe('formatSequentialNumber', () => {
  it('preenche com zeros à esquerda para 8 dígitos', () => {
    expect(formatSequentialNumber(1)).toBe('00000001')
    expect(formatSequentialNumber(12345)).toBe('00012345')
  })
  it('retorna placeholder para undefined', () => {
    expect(formatSequentialNumber(undefined)).toBe('--------')
  })
})

describe('formatHourMinute', () => {
  it('formata HH:MM (pt-BR)', () => {
    const d = new Date(2025, 0, 1, 14, 30)
    expect(formatHourMinute(d)).toBe('14:30')
  })
})
