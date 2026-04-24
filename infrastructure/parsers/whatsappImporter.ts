// Parser de exportação de conversa do WhatsApp (.txt)
// Formato típico: "[DD/MM/YY, HH:MM:SS] Nome: mensagem"
// Extrai clientes, telefones (quando presentes), datas e valores monetários.

export interface ParsedMessage {
  timestamp: number
  author: string
  body: string
}

export interface ParsedHistoryEntry {
  date: Date
  customerName: string
  phone?: string
  totalBRL?: number
  rawSnippet: string
}

const MSG_RE = /^\[(\d{2})\/(\d{2})\/(\d{2,4}),?\s+(\d{2}):(\d{2})(?::(\d{2}))?\]\s([^:]+):\s(.*)$/

export function parseWhatsAppExport(raw: string): ParsedMessage[] {
  const lines = raw.split(/\r?\n/)
  const messages: ParsedMessage[] = []
  let currentMsg: ParsedMessage | null = null

  for (const line of lines) {
    const m = line.match(MSG_RE)
    if (m) {
      if (currentMsg) messages.push(currentMsg)
      const [, dd, mm, yy, hh, min, ss, author, body] = m
      const fullYear = yy!.length === 2 ? 2000 + parseInt(yy!, 10) : parseInt(yy!, 10)
      const d = new Date(fullYear, parseInt(mm!, 10) - 1, parseInt(dd!, 10), parseInt(hh!, 10), parseInt(min!, 10), ss ? parseInt(ss, 10) : 0)
      currentMsg = { timestamp: d.getTime(), author: author!.trim(), body: body!.trim() }
    } else if (currentMsg) {
      currentMsg.body += '\n' + line
    }
  }
  if (currentMsg) messages.push(currentMsg)
  return messages
}

function extractPhone(text: string): string | undefined {
  const m = text.match(/(?:\+?55\s?)?\(?\d{2}\)?\s?9?\d{4}-?\d{4}/)
  return m ? m[0].replace(/\D/g, '').replace(/^55/, '') : undefined
}
function extractTotal(text: string): number | undefined {
  // R$ 123,45 ou R$ 123.45 ou "total: 80"
  const m = text.match(/(?:r\$\s?|total[: ]*)(\d+(?:[.,]\d{2})?)/i)
  if (!m) return undefined
  return parseFloat(m[1]!.replace(',', '.'))
}

/**
 * Agrupa mensagens em "entradas de pedido" heurísticas (simples):
 * cada autor não-Renata que menciona valor monetário gera uma entrada.
 * Para produção, ajuste com base no padrão real de conversa.
 */
export function extractHistoryEntries(messages: ParsedMessage[]): ParsedHistoryEntry[] {
  const entries: ParsedHistoryEntry[] = []
  for (const m of messages) {
    const total = extractTotal(m.body)
    if (!total) continue
    const phone = extractPhone(m.body) || extractPhone(m.author)
    entries.push({
      date: new Date(m.timestamp),
      customerName: m.author,
      phone,
      totalBRL: total,
      rawSnippet: m.body.slice(0, 200),
    })
  }
  return entries
}
