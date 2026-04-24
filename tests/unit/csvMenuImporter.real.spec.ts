import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { parseCSV, groupIntoDomain } from '~/domain/rules/csvMenuImporter'

const DIR = '/Users/brenda/Downloads/Cardapio'
const files = [
  { f: 'pizzas_tradicionais', expectPizzas: 59 },
  { f: 'pizzas_promocao', expectPizzas: 6 },
  { f: 'pizzas_doces', expectPizzas: 12 },
  { f: 'lanches_tradicionais', expectSnacks: 20 },
  { f: 'lanches_especiais', expectSnacks: 10 },
  { f: 'beirutes', expectSnacks: 8 },
  { f: 'fritas', expectSnacksMax: 4 }, // agrupa, então ≤ 4
  { f: 'bebidas', expectBeveragesMax: 13 }, // agrupa, então ≤ 13
]

const suite = files.every(({ f }) => existsSync(`${DIR}/${f}.csv`)) ? describe : describe.skip

suite('CSVs reais da Pizzaria Renata', () => {
  for (const { f, expectPizzas, expectSnacks, expectSnacksMax, expectBeveragesMax } of files) {
    it(`${f}.csv parseia e agrupa sem erros`, () => {
      const content = readFileSync(`${DIR}/${f}.csv`, 'utf-8')
      const { rows, errors } = parseCSV(content)
      expect(errors, `erros no parse: ${JSON.stringify(errors)}`).toHaveLength(0)
      const g = groupIntoDomain(rows)
      if (expectPizzas !== undefined) expect(g.flavors).toHaveLength(expectPizzas)
      if (expectSnacks !== undefined) expect(g.snacks).toHaveLength(expectSnacks)
      if (expectSnacksMax !== undefined) expect(g.snacks.length).toBeLessThanOrEqual(expectSnacksMax)
      if (expectBeveragesMax !== undefined) expect(g.beverages.length).toBeLessThanOrEqual(expectBeveragesMax)
    })
  }
})
