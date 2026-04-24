import { describe, it, expect } from 'vitest'
import { parseWhatsAppExport, extractHistoryEntries } from '~/infrastructure/parsers/whatsappImporter'

const sample = `[12/03/23, 19:25:10] Maria Silva: Oi, queria pedir uma pizza grande
[12/03/23, 19:26:02] Pizzaria Renata: Claro! Qual sabor?
[12/03/23, 19:26:30] Maria Silva: Calabresa. Telefone (11) 98765-4321. Total R$ 65,00
[12/03/23, 19:45:00] Pizzaria Renata: Pedido saiu pra entrega`

describe('parseWhatsAppExport', () => {
  it('parses 4 messages', () => {
    const msgs = parseWhatsAppExport(sample)
    expect(msgs.length).toBe(4)
    expect(msgs[0]!.author).toBe('Maria Silva')
  })
  it('extracts history entries with phone and total', () => {
    const msgs = parseWhatsAppExport(sample)
    const entries = extractHistoryEntries(msgs)
    expect(entries.length).toBe(1)
    expect(entries[0]!.phone).toBe('11987654321')
    expect(entries[0]!.totalBRL).toBe(65)
  })
})
