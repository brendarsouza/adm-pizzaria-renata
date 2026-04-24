import { describe, it, expect } from 'vitest'
import {
  splitCSVLine, parseCSVLine, parseCSV, groupIntoDomain,
} from '~/domain/rules/csvMenuImporter'

describe('splitCSVLine', () => {
  it('respeita vírgulas dentro de aspas', () => {
    const line = 'pizza,tradicional,Calabresa,"Molho de tomate, calabresa, cebola",52.80,G,true'
    expect(splitCSVLine(line)).toEqual([
      'pizza', 'tradicional', 'Calabresa', 'Molho de tomate, calabresa, cebola', '52.80', 'G', 'true',
    ])
  })
  it('divide campos simples', () => {
    expect(splitCSVLine('a,b,c')).toEqual(['a', 'b', 'c'])
  })
})

describe('parseCSVLine', () => {
  it('parseia pizza válida', () => {
    const { row } = parseCSVLine('pizza,tradicional,Calabresa,"Molho, calabresa",52.80,G,true', 2)
    expect(row).toMatchObject({
      categoria: 'pizza', subcategoria: 'tradicional',
      nome: 'Calabresa', preco: 52.8, tamanho: 'G', ativo: true,
    })
  })
  it('retorna erro com preço inválido', () => {
    const { error } = parseCSVLine('pizza,tradicional,Teste,"d",xxx,G,true', 2)
    expect(error).toBeDefined()
    expect(error!.erro).toMatch(/pre[çc]o/i)
  })
  it('retorna erro com poucos campos', () => {
    const { error } = parseCSVLine('pizza,tradicional,Teste', 2)
    expect(error).toBeDefined()
  })
})

describe('parseCSV', () => {
  it('ignora cabeçalho e parseia dados', () => {
    const csv = `categoria,subcategoria,nome,descricao,preco,tamanho,ativo
pizza,tradicional,Mussarela,"Molho, mussarela",55.80,G,true
pizza,doce,Chocolate,"Chocolate",45.00,G,true`
    const { rows, errors } = parseCSV(csv)
    expect(rows).toHaveLength(2)
    expect(errors).toHaveLength(0)
    expect(rows[0]!.nome).toBe('Mussarela')
    expect(rows[1]!.subcategoria).toBe('doce')
  })
  it('rejeita cabeçalho inválido', () => {
    const { errors } = parseCSV('outra,coisa\na,b')
    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0]!.erro).toMatch(/cabe[cç]alho/i)
  })
})

describe('groupIntoDomain', () => {
  it('mapeia pizza para PizzaFlavor com priceBySize.GRANDE', () => {
    const { rows } = parseCSV(`categoria,subcategoria,nome,descricao,preco,tamanho,ativo
pizza,tradicional,Calabresa,"Molho de tomate, calabresa, cebola",52.80,G,true
pizza,doce,Chocolate,"Chocolate, leite",45.00,G,true`)
    const g = groupIntoDomain(rows)
    expect(g.flavors).toHaveLength(2)
    expect(g.flavors[0]).toMatchObject({
      name: 'Calabresa',
      category: 'salgada',
      priceBySize: { GRANDE: 52.8 },
    })
    expect(g.flavors[0]!.ingredients).toContain('calabresa')
    expect(g.flavors[1]!.category).toBe('doce')
  })

  it('agrupa porções "Simples M" e "Simples G" em 1 SnackProduct com sizes[]', () => {
    const { rows } = parseCSV(`categoria,subcategoria,nome,descricao,preco,tamanho,ativo
porcao,fritas,Simples M,"Batata",21.80,M,true
porcao,fritas,Simples G,"Batata",27.80,G,true
porcao,fritas,Especial M,"Cheddar",26.80,M,true
porcao,fritas,Especial G,"Cheddar",33.80,G,true`)
    const g = groupIntoDomain(rows)
    expect(g.snacks).toHaveLength(2)
    const simples = g.snacks.find(s => s.name === 'Simples')!
    expect(simples.kind).toBe('porcao')
    expect(simples.sizes).toHaveLength(2)
    expect(simples.sizes!.map(s => s.label).sort()).toEqual(['G', 'M'])
  })

  it('mapeia lanche e beirute como SnackProduct individuais', () => {
    const { rows } = parseCSV(`categoria,subcategoria,nome,descricao,preco,tamanho,ativo
lanche,tradicional,Hot Dog,"Salsicha",14.80,U,true
beirute,tradicional,Americano,"Ovos",38.80,U,true`)
    const g = groupIntoDomain(rows)
    expect(g.snacks).toHaveLength(2)
    expect(g.snacks.find(s => s.name === 'Hot Dog')!.kind).toBe('lanche')
    expect(g.snacks.find(s => s.name === 'Americano')!.kind).toBe('beirute')
  })

  it('agrupa bebidas "Coca-Cola 2L" e "Coca-Cola 1L" em 1 BeverageProduct com variants[]', () => {
    const { rows } = parseCSV(`categoria,subcategoria,nome,descricao,preco,tamanho,ativo
bebida,refrigerante,Coca-Cola 2L,Refrigerante,17.00,2L,true
bebida,refrigerante,Coca-Cola 1L,Refrigerante,11.00,1L,true
bebida,refrigerante,Fanta Uva 2L,Refrigerante,15.00,2L,true`)
    const g = groupIntoDomain(rows)
    expect(g.beverages).toHaveLength(2)
    const coca = g.beverages.find(b => b.name === 'Coca-Cola')!
    expect(coca.kind).toBe('refrigerante')
    expect(coca.variants).toHaveLength(2)
    expect(coca.variants.map(v => v.label).sort()).toEqual(['1L', '2L'])
  })
})
