// Helpers de formatação para o resumo do pedido e para a comanda de impressão.
// Mantém a lógica fora dos componentes (Clean Architecture).
import type { OrderItem, Address, Payment } from '~/types'

export function formatSequentialNumber(n: number | undefined): string {
  if (n === undefined || n === null) return '--------'
  return String(n).padStart(8, '0')
}

/** Descrição resumida do item para a linha principal da comanda. */
export function describeItemLine(item: OrderItem): string {
  if (item.kind === 'pizza') {
    if (item.isHalfHalf && item.flavor2) {
      // Na comanda, meio-a-meio é renderizado em 2 linhas separadas pelo componente.
      // Este helper retorna a primeira metade; use `describeItemLine2` para a segunda.
      return `1/2 ${item.flavor1.name}`
    }
    return item.flavor1.name
  }
  if (item.kind === 'snack') return item.name
  return `${item.name} ${item.variantLabel}`
}

/** Segunda linha de pizza meio-a-meio (ou vazio para outros casos). */
export function describeItemLine2(item: OrderItem): string {
  if (item.kind === 'pizza' && item.isHalfHalf && item.flavor2) {
    return `1/2 ${item.flavor2.name}`
  }
  return ''
}

/** Observações extras do item (ingredientes removidos + observação livre). */
export function itemExtraNotes(item: OrderItem): string[] {
  const notes: string[] = []
  if (item.kind === 'pizza') {
    if (item.stuffedCrust) notes.push('Borda recheada')
    if (item.additionals?.length) {
      const adds = item.additionals
        .map(a => `${a.name}${a.half !== 'FULL' ? ' (meia)' : ''}`)
        .join(', ')
      notes.push(`+ ${adds}`)
    }
    if (item.removedIngredients?.length) notes.push(`SEM ${item.removedIngredients.join(', ')}`)
    if (item.observation) notes.push(item.observation)
  } else if (item.kind === 'snack') {
    if (item.additionals?.length) {
      notes.push(`+ ${item.additionals.map(a => a.name).join(', ')}`)
    }
    if (item.removedIngredients?.length) notes.push(`SEM ${item.removedIngredients.join(', ')}`)
    if (item.observation) notes.push(item.observation)
  }
  return notes
}

export function formatFullAddress(a: Address): string {
  const head = `${a.street}, ${a.number}` + (a.complement ? ` — ${a.complement}` : '')
  const parts: string[] = [head]
  if (a.district) parts.push(a.district)
  if (a.reference) parts.push(`Ref: ${a.reference}`)
  if (a.accessNotes) parts.push(a.accessNotes)
  return parts.join(' · ')
}

export function formatHourMinute(timestamp: number | Date): string {
  const d = typeof timestamp === 'number' ? new Date(timestamp) : timestamp
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export function formatPaymentLabel(p: Payment): string {
  if (p.method === 'PIX') return p.proofConfirmed ? 'PIX (comprovante confirmado)' : 'PIX (aguardando comprovante)'
  if (p.method === 'CASH') return p.needsChange ? 'Dinheiro (com troco)' : 'Dinheiro'
  return `Cartão ${p.debitOrCredit === 'credit' ? 'crédito' : 'débito'} · ${p.brand}`
}
