// Value Object: Phone — telefone brasileiro normalizado

export class Phone {
  private readonly digits: string

  private constructor(digits: string) {
    if (digits.length < 10 || digits.length > 13) {
      throw new Error('Phone: quantidade de dígitos inválida')
    }
    this.digits = digits
  }

  static fromRaw(raw: string): Phone {
    const digits = raw.replace(/\D/g, '')
    // Remove código do país 55 se presente
    const normalized = digits.startsWith('55') && digits.length > 11
      ? digits.slice(2)
      : digits
    return new Phone(normalized)
  }

  static isValid(raw: string): boolean {
    try {
      Phone.fromRaw(raw)
      return true
    } catch {
      return false
    }
  }

  value(): string {
    return this.digits
  }

  format(): string {
    const d = this.digits
    if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
    if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
    return d
  }

  equals(other: Phone): boolean {
    return this.digits === other.digits
  }
}
