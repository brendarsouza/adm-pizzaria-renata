// Geração de tokens de busca por substring para clientes.
// Firestore não suporta ILIKE/contains nativo, então indexamos pré-computados
// todos os substrings >= 3 caracteres dos campos pesquisáveis, em um array
// `searchTokens`, consultável via `array-contains`.
//
// Campos indexados (sempre normalizados: lowercase, sem acento, só [a-z0-9]):
//   - name
//   - phone (somente dígitos)
//   - cada addresses[].street / district / reference / accessNotes

import type { Customer, Address, CustomerPhone } from '~/types'

/** Remove acentos, minúscula, strip de caracteres não alfanuméricos (exceto espaço). */
export function normalizeForSearch(text: string): string {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Gera todos os substrings contíguos de comprimento >= minLen.
 * Inclui substrings que atravessam espaços porque o nome é normalizado.
 * Ex.: "silva" (minLen=3) → ['sil','ilv','lva','silv','ilva','silva']
 */
export function generateSubstrings(text: string, minLen = 3): Set<string> {
  const out = new Set<string>()
  const words = text.split(' ').filter(Boolean)
  // Substrings dentro de cada palavra
  for (const w of words) {
    for (let i = 0; i < w.length; i++) {
      for (let j = i + minLen; j <= w.length; j++) {
        out.add(w.slice(i, j))
      }
    }
  }
  // Substrings da string completa (para capturar "joao silva" → "joao", "silva", etc.)
  // Limite superior para não explodir o tamanho — Firestore cobra por tamanho do doc.
  const joined = text.replace(/\s+/g, ' ')
  const MAX_FULL_LEN = 30
  for (let i = 0; i < joined.length && i < MAX_FULL_LEN; i++) {
    for (let j = i + minLen; j <= Math.min(joined.length, i + MAX_FULL_LEN); j++) {
      const s = joined.slice(i, j)
      if (s.length >= minLen) out.add(s)
    }
  }
  return out
}

/** Extrai só dígitos do telefone (remove máscara). */
export function digitsOnly(phone: string): string {
  return (phone || '').replace(/\D/g, '')
}

/**
 * Gera o array completo de searchTokens para um cliente.
 * Usado no create/update do repo e no script de migração.
 */
export function generateCustomerSearchTokens(params: {
  name: string
  phone: string
  phones?: CustomerPhone[]
  addresses?: Pick<Address, 'street' | 'district' | 'locality' | 'reference' | 'alias' | 'accessNotes' | 'addressNotes'>[]
}): string[] {
  const sources: string[] = []

  if (params.name) sources.push(normalizeForSearch(params.name))
  // Telefone principal (legado) + todos os telefones adicionais
  const phoneSet = new Set<string>()
  const mainDigits = digitsOnly(params.phone)
  if (mainDigits) phoneSet.add(mainDigits)
  for (const p of params.phones ?? []) {
    const d = digitsOnly(p.number)
    if (d) phoneSet.add(d)
  }
  for (const d of phoneSet) sources.push(d)

  for (const addr of params.addresses ?? []) {
    if (addr.street) sources.push(normalizeForSearch(addr.street))
    if (addr.district) sources.push(normalizeForSearch(addr.district))
    if (addr.locality) sources.push(normalizeForSearch(addr.locality))
    if (addr.reference) sources.push(normalizeForSearch(addr.reference))
    if (addr.alias) sources.push(normalizeForSearch(addr.alias))
    // Fallback: lê novo nome ou legado
    const notes = addr.addressNotes || addr.accessNotes
    if (notes) sources.push(normalizeForSearch(notes))
  }

  const tokens = new Set<string>()
  for (const src of sources) {
    if (!src) continue
    for (const t of generateSubstrings(src)) tokens.add(t)
  }
  return Array.from(tokens).sort()
}

/** Helper para uso em script de migração: recebe o Customer completo. */
export function generateTokensForCustomer(c: Pick<Customer, 'name' | 'phone' | 'phones' | 'addresses'>): string[] {
  return generateCustomerSearchTokens({
    name: c.name,
    phone: c.phone,
    phones: c.phones,
    addresses: c.addresses,
  })
}

/**
 * Normaliza o termo de busca digitado pelo usuário.
 * Se for telefone (>=3 dígitos), retorna só os dígitos.
 * Se for texto, aplica normalizeForSearch.
 * Retorna null se for muito curto (< 3 chars após normalização).
 */
export function normalizeSearchTerm(raw: string): string | null {
  if (!raw) return null
  const digits = digitsOnly(raw)
  // Heurística: se o input NÃO contém letras e tem >= 3 dígitos, é telefone.
  // Assim "(11) 99912", "11 99912", "99912" e "9912" todos viram só dígitos.
  const hasLetters = /[a-zA-Z\u00C0-\u024F]/.test(raw)
  if (!hasLetters && digits.length >= 3) return digits
  const norm = normalizeForSearch(raw)
  if (norm.length < 3) return null
  return norm
}
