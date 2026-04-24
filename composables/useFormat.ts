export function formatBRL(value: number): string {
  return (value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function formatDateTime(ts: number): string {
  if (!ts) return '—'
  return new Date(ts).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function formatTime(ts: number): string {
  if (!ts) return '—'
  return new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export function formatDate(ts: number): string {
  if (!ts) return '—'
  return new Date(ts).toLocaleDateString('pt-BR')
}

export const statusLabel: Record<string, string> = {
  OPEN: 'Aberto',
  AWAITING_PIX: 'Aguardando PIX',
  PREPARING: 'Em preparo',
  OUT_FOR_DELIVERY: 'Em entrega',
  DELIVERED: 'Entregue',
  CANCELLED: 'Cancelado',
}

export const statusBadgeClass: Record<string, string> = {
  OPEN: 'badge-open',
  AWAITING_PIX: 'badge-pix',
  PREPARING: 'badge-preparing',
  OUT_FOR_DELIVERY: 'badge-delivery',
  DELIVERED: 'badge-delivered',
  CANCELLED: 'badge-cancelled',
}
