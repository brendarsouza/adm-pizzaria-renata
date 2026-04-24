// Importador de cardápio via CSV.
// Mapeia linhas no schema PT (categoria,subcategoria,nome,descricao,preco,tamanho,ativo)
// para as entidades do domínio (PizzaFlavor, SnackProduct, BeverageProduct).
//
// Regras de agrupamento:
// - pizza: 1 linha = 1 PizzaFlavor; preço vai para priceBySize.GRANDE; ingredients = descricao.split(',')
// - lanche/beirute: 1 linha = 1 SnackProduct (kind mapeado)
// - porcao: linhas com mesmo nome-base (removendo sufixo " M"/" G") agrupam em 1 SnackProduct
//   com sizes[]. Linhas sem sufixo geram SnackProduct único com price.
// - bebida: linhas com mesmo nome-base (removendo sufixo de tamanho " 2L"/" 1L"/" 600ml"/" 350ml")
//   agrupam em 1 BeverageProduct com variants[].

import type {
  PizzaFlavor, PizzaCategory, SnackProduct, SnackKind,
  BeverageProduct, BeverageKind, PriceBySize,
} from '~/types'

export interface CSVRow {
  categoria: string
  subcategoria: string
  nome: string
  descricao: string
  preco: number
  tamanho: string
  ativo: boolean
}

export interface CSVParseError {
  linha: number
  erro: string
  dados: string
}

export interface ParsedCSV {
  rows: CSVRow[]
  errors: CSVParseError[]
}

export interface GroupedMenu {
  flavors: Array<Omit<PizzaFlavor, 'id'>>
  snacks: Array<Omit<SnackProduct, 'id'>>
  beverages: Array<Omit<BeverageProduct, 'id'>>
}

/** Divide uma linha CSV respeitando vírgulas dentro de aspas. */
export function splitCSVLine(line: string): string[] {
  const out: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!
    if (ch === '"') {
      // aspas duplas escapadas dentro de campo
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; continue }
      inQuotes = !inQuotes
      continue
    }
    if (ch === ',' && !inQuotes) { out.push(current); current = ''; continue }
    current += ch
  }
  out.push(current)
  return out.map(s => s.trim())
}

/** Converte uma linha (já dividida) em CSVRow. Retorna null se inválida. */
export function parseCSVLine(line: string, lineNumber: number): { row?: CSVRow; error?: CSVParseError } {
  const raw = line.trim()
  if (!raw) return { error: { linha: lineNumber, erro: 'Linha vazia', dados: raw } }
  const fields = splitCSVLine(raw)
  if (fields.length < 7) {
    return { error: { linha: lineNumber, erro: `Esperado 7 campos, recebido ${fields.length}`, dados: raw } }
  }
  const [categoria, subcategoria, nome, descricao, precoStr, tamanho, ativoStr] = fields
  const preco = parseFloat((precoStr ?? '').replace(',', '.'))
  if (!nome || Number.isNaN(preco)) {
    return { error: { linha: lineNumber, erro: 'Nome ou preço inválido', dados: raw } }
  }
  return {
    row: {
      categoria: (categoria ?? '').toLowerCase(),
      subcategoria: (subcategoria ?? '').toLowerCase(),
      nome: nome.trim(),
      descricao: (descricao ?? '').trim(),
      preco,
      tamanho: (tamanho ?? '').trim(),
      ativo: (ativoStr ?? 'true').toLowerCase() === 'true',
    },
  }
}

/** Parseia o CSV inteiro. Ignora a primeira linha (cabeçalho). */
export function parseCSV(content: string): ParsedCSV {
  const lines = content.split(/\r?\n/).map(l => l).filter(l => l.trim().length > 0)
  if (lines.length === 0) return { rows: [], errors: [{ linha: 0, erro: 'CSV vazio', dados: '' }] }
  const header = lines[0]!.toLowerCase()
  if (!header.startsWith('categoria')) {
    return { rows: [], errors: [{ linha: 1, erro: 'Cabeçalho inválido. Esperado começar com "categoria"', dados: lines[0]! }] }
  }
  const rows: CSVRow[] = []
  const errors: CSVParseError[] = []
  for (let i = 1; i < lines.length; i++) {
    const r = parseCSVLine(lines[i]!, i + 1)
    if (r.row) rows.push(r.row)
    else if (r.error) errors.push(r.error)
  }
  return { rows, errors }
}

// ---------- Mapeamento para domínio ----------

function mapPizzaCategory(subcategoria: string): PizzaCategory {
  return subcategoria === 'doce' ? 'doce' : 'salgada'
}

function rowToFlavor(row: CSVRow): Omit<PizzaFlavor, 'id'> {
  const priceBySize: PriceBySize = {}
  // O CSV traz preço de tamanho único (normalmente "G"). Mapeamos para GRANDE.
  // Outros tamanhos ficam vazios para o admin preencher depois.
  const size = row.tamanho.toUpperCase()
  if (size === 'G' || size === 'GRANDE' || size === '') priceBySize.GRANDE = row.preco
  else if (size === 'M' || size === 'MEDIA' || size === 'MÉDIA') priceBySize.MEDIA = row.preco
  else if (size === 'B' || size === 'BROTO') priceBySize.BROTO = row.preco
  else if (size === 'F' || size === 'FAMILIA' || size === 'FAMÍLIA') priceBySize.FAMILIA = row.preco
  else priceBySize.GRANDE = row.preco // fallback
  return {
    name: row.nome,
    description: row.descricao,
    ingredients: row.descricao
      .replace(/^molho de tomate[,\s]*/i, '')
      .split(/[,;]/).map(s => s.trim()).filter(Boolean),
    category: mapPizzaCategory(row.subcategoria),
    priceBySize,
    active: row.ativo,
  }
}

function snackKindFrom(categoria: string): SnackKind | null {
  if (categoria === 'lanche') return 'lanche'
  if (categoria === 'beirute') return 'beirute'
  if (categoria === 'porcao' || categoria === 'porção') return 'porcao'
  return null
}

/** Remove sufixo de tamanho (" M", " G") do nome de porções. */
function splitPortionName(nome: string): { base: string; sizeLabel?: string } {
  const m = nome.match(/^(.+?)\s+(M|G|P|Pequena|M[eé]dia|Grande)$/i)
  if (!m) return { base: nome }
  return { base: m[1]!.trim(), sizeLabel: m[2]!.toUpperCase() }
}

/** Extrai tamanho de bebida ("Coca-Cola 2L" → {base:"Coca-Cola", size:"2L"}). */
function splitBeverageName(nome: string): { base: string; sizeLabel?: string } {
  const m = nome.match(/^(.+?)\s+(\d+(?:[.,]\d+)?\s?(?:L|ML|ml)|\d+ML|\d+L)$/i)
  if (!m) return { base: nome }
  return { base: m[1]!.trim(), sizeLabel: m[2]!.replace(/\s+/g, '').toUpperCase() }
}

function beverageKindFrom(subcategoria: string): BeverageKind {
  return subcategoria === 'suco' ? 'suco' : 'refrigerante'
}

/** Agrupa as linhas parseadas em entidades do domínio. */
export function groupIntoDomain(rows: CSVRow[]): GroupedMenu {
  const flavors: Array<Omit<PizzaFlavor, 'id'>> = []
  const snacksMap = new Map<string, Omit<SnackProduct, 'id'>>()
  const beveragesMap = new Map<string, Omit<BeverageProduct, 'id'>>()

  for (const row of rows) {
    const cat = row.categoria

    if (cat === 'pizza') {
      flavors.push(rowToFlavor(row))
      continue
    }

    const snackKind = snackKindFrom(cat)
    if (snackKind) {
      // Porções agrupam por nome-base; lanches/beirutes ficam individuais
      if (snackKind === 'porcao') {
        const { base, sizeLabel } = splitPortionName(row.nome)
        const key = `porcao::${base.toLowerCase()}`
        const existing = snacksMap.get(key)
        if (existing) {
          if (sizeLabel) {
            existing.sizes = existing.sizes || []
            existing.sizes.push({ label: sizeLabel, price: row.preco })
          }
        } else {
          snacksMap.set(key, {
            name: base,
            description: row.descricao,
            kind: 'porcao',
            price: sizeLabel ? 0 : row.preco,
            sizes: sizeLabel ? [{ label: sizeLabel, price: row.preco }] : undefined,
            allowedAdditionals: [],
            active: row.ativo,
          })
        }
      } else {
        snacksMap.set(`${snackKind}::${row.nome.toLowerCase()}`, {
          name: row.nome,
          description: row.descricao,
          kind: snackKind,
          price: row.preco,
          allowedAdditionals: [],
          active: row.ativo,
        })
      }
      continue
    }

    if (cat === 'bebida') {
      const { base, sizeLabel } = splitBeverageName(row.nome)
      const key = `bebida::${base.toLowerCase()}`
      const label = sizeLabel || row.tamanho || 'único'
      const existing = beveragesMap.get(key)
      if (existing) {
        existing.variants.push({ label, price: row.preco })
      } else {
        beveragesMap.set(key, {
          name: base,
          kind: beverageKindFrom(row.subcategoria),
          variants: [{ label, price: row.preco }],
          active: row.ativo,
        })
      }
      continue
    }
    // categorias desconhecidas são ignoradas silenciosamente aqui
    // (erros de formato já foram capturados no parseCSV)
  }

  return {
    flavors,
    snacks: Array.from(snacksMap.values()),
    beverages: Array.from(beveragesMap.values()),
  }
}
