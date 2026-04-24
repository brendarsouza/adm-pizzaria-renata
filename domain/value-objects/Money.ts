// Value Object: Money — trabalha em centavos para evitar erro de ponto flutuante

export class Money {
  private readonly cents: number

  private constructor(cents: number) {
    if (!Number.isFinite(cents)) throw new Error('Money: valor inválido')
    this.cents = Math.round(cents)
  }

  static fromReais(value: number): Money {
    return new Money(value * 100)
  }
  static fromCents(cents: number): Money {
    return new Money(cents)
  }
  static zero(): Money {
    return new Money(0)
  }

  add(other: Money): Money {
    return new Money(this.cents + other.cents)
  }
  subtract(other: Money): Money {
    return new Money(this.cents - other.cents)
  }
  multiply(factor: number): Money {
    return new Money(this.cents * factor)
  }
  divide(divisor: number): Money {
    if (divisor === 0) throw new Error('Money: divisão por zero')
    return new Money(this.cents / divisor)
  }

  toReais(): number {
    return this.cents / 100
  }
  toCents(): number {
    return this.cents
  }
  format(): string {
    return this.toReais().toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    })
  }

  equals(other: Money): boolean {
    return this.cents === other.cents
  }
  greaterThan(other: Money): boolean {
    return this.cents > other.cents
  }
}
