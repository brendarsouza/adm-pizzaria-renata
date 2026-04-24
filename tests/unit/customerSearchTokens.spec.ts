import { describe, it, expect } from 'vitest'
import {
  normalizeForSearch, generateSubstrings, digitsOnly,
  generateCustomerSearchTokens, normalizeSearchTerm,
} from '~/domain/rules/customerSearchTokens'

describe('normalizeForSearch', () => {
  it('remove acentos', () => {
    expect(normalizeForSearch('João')).toBe('joao')
    expect(normalizeForSearch('Portão Vermelho')).toBe('portao vermelho')
  })
  it('converte para lowercase', () => {
    expect(normalizeForSearch('SILVA')).toBe('silva')
  })
  it('remove pontuação mantendo espaços', () => {
    expect(normalizeForSearch('Rua, nº 123!')).toBe('rua n 123')
  })
})

describe('digitsOnly', () => {
  it('extrai só dígitos do telefone formatado', () => {
    expect(digitsOnly('(11) 99912-3456')).toBe('11999123456')
    expect(digitsOnly('+55 11 9 9912-3456')).toBe('5511999123456')
  })
})

describe('generateSubstrings', () => {
  it('gera todos os substrings de "silva" com minLen=3', () => {
    const s = generateSubstrings('silva', 3)
    expect(s.has('sil')).toBe(true)
    expect(s.has('ilv')).toBe(true)
    expect(s.has('lva')).toBe(true)
    expect(s.has('silv')).toBe(true)
    expect(s.has('ilva')).toBe(true)
    expect(s.has('silva')).toBe(true)
  })
  it('não inclui substrings menores que minLen', () => {
    const s = generateSubstrings('oi', 3)
    expect(s.size).toBe(0)
  })
})

describe('generateCustomerSearchTokens', () => {
  it('inclui tokens do nome', () => {
    const t = generateCustomerSearchTokens({ name: 'Silva', phone: '11999990000', addresses: [] })
    expect(t).toContain('sil')
    expect(t).toContain('ilv')
    expect(t).toContain('silva')
  })

  it('inclui substrings dos dígitos do telefone', () => {
    const t = generateCustomerSearchTokens({
      name: 'Teste', phone: '(11) 9999-0000', addresses: [],
    })
    expect(t).toContain('999')
    expect(t).toContain('9999')
    expect(t).toContain('1199')
  })

  it('inclui substrings da referência do endereço, sem acento', () => {
    const t = generateCustomerSearchTokens({
      name: 'Teste', phone: '11000000000',
      addresses: [{
        street: '', district: '',
        reference: 'portão vermelho', accessNotes: '',
        // demais campos ignorados pelo gerador de tokens
      } as any],
    })
    expect(t).toContain('por')
    expect(t).toContain('portao')
    expect(t).toContain('ver')
    expect(t).toContain('vermelho')
  })

  it('inclui tokens de múltiplos endereços', () => {
    const t = generateCustomerSearchTokens({
      name: 'Cliente', phone: '11000000000',
      addresses: [
        { street: 'Rua das Flores', district: '', reference: '', accessNotes: '' } as any,
        { street: 'Av Brasil', district: 'Centro', reference: '', accessNotes: '' } as any,
      ],
    })
    expect(t).toContain('flor')
    expect(t).toContain('flores')
    expect(t).toContain('brasil')
    expect(t).toContain('cent')
    expect(t).toContain('centro')
  })

  it('retorna array único e ordenado', () => {
    const t = generateCustomerSearchTokens({ name: 'Ana Ana', phone: '11000000000', addresses: [] })
    const set = new Set(t)
    expect(set.size).toBe(t.length)
    expect([...t]).toEqual([...t].sort())
  })

  it('não quebra com nome vazio', () => {
    const t = generateCustomerSearchTokens({ name: '', phone: '11000000000', addresses: [] })
    expect(Array.isArray(t)).toBe(true)
    expect(t).toContain('110')
  })
})

describe('normalizeSearchTerm', () => {
  it('retorna dígitos quando o termo parece telefone', () => {
    expect(normalizeSearchTerm('9912')).toBe('9912')
    expect(normalizeSearchTerm('(11) 99912')).toBe('1199912')
  })
  it('retorna texto normalizado quando é nome', () => {
    expect(normalizeSearchTerm('Silva')).toBe('silva')
    expect(normalizeSearchTerm('João')).toBe('joao')
  })
  it('retorna null se termo tiver menos de 3 chars', () => {
    expect(normalizeSearchTerm('oi')).toBeNull()
    expect(normalizeSearchTerm('  ')).toBeNull()
    expect(normalizeSearchTerm('')).toBeNull()
  })
})
