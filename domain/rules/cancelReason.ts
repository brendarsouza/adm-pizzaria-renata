import type { CancelReason } from '~/types'

export const CANCEL_REASON_LABELS: Record<CancelReason, string> = {
  WRONG_PIZZA: 'Pizza feita errada',
  RETURNED_PIZZA: 'Pizza devolvida',
  NOT_RECEIVED: 'Cliente não recebeu',
  CUSTOMER_CANCELLED: 'Cliente desistiu',
  OUT_OF_STOCK: 'Ingrediente em falta',
  OTHER: 'Outro',
}

/**
 * Retorna o label amigável do motivo. Aceita string livre (documentos legados).
 */
export function cancelReasonLabel(reason: CancelReason | string | undefined): string {
  if (!reason) return '—'
  if (reason in CANCEL_REASON_LABELS) return CANCEL_REASON_LABELS[reason as CancelReason]
  return reason
}

export function isCancelReasonCode(value: unknown): value is CancelReason {
  return typeof value === 'string' && value in CANCEL_REASON_LABELS
}
