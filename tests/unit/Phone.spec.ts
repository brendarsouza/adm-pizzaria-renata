import { describe, it, expect } from 'vitest'
import { Phone } from '~/domain/value-objects/Phone'

describe('Phone', () => {
  it('normaliza número com 55 no início', () => {
    expect(Phone.fromRaw('+55 (11) 98765-4321').value()).toBe('11987654321')
  })
  it('formata 11 dígitos (celular)', () => {
    expect(Phone.fromRaw('11987654321').format()).toBe('(11) 98765-4321')
  })
  it('formata 10 dígitos (fixo)', () => {
    expect(Phone.fromRaw('1133334444').format()).toBe('(11) 3333-4444')
  })
  it('rejeita número curto', () => {
    expect(Phone.isValid('123')).toBe(false)
  })
  it('aceita com máscara', () => {
    expect(Phone.isValid('(11) 98765-4321')).toBe(true)
  })
})
