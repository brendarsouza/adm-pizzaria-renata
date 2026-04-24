// Repositórios tipados sobre o FirestoreAdapter (client-side)
import type { Firestore } from 'firebase/firestore'
import { FirestoreAdapter, type FireFilter } from './firestoreAdapter'
import type {
  PizzaFlavor, PizzaAdditional, SnackProduct, SnackAdditional,
  BeverageProduct, MenuSettings, Customer, Order,
} from '~/types'
import {
  generateTokensForCustomer, normalizeSearchTerm,
} from '~/domain/rules/customerSearchTokens'

export class PizzaFlavorRepo {
  private a: FirestoreAdapter
  constructor(db: Firestore) { this.a = new FirestoreAdapter(db) }
  list(activeOnly = false) {
    const filters: FireFilter[] = activeOnly ? [{ field: 'active', op: '==', value: true }] : []
    return this.a.find<PizzaFlavor>('pizzaFlavors', filters, { orderBy: 'name' })
  }
  get(id: string) { return this.a.findById<PizzaFlavor>('pizzaFlavors', id) }
  create(f: Omit<PizzaFlavor, 'id'>) { return this.a.create('pizzaFlavors', f) }
  update(id: string, f: Partial<PizzaFlavor>) { return this.a.update('pizzaFlavors', id, f) }
  remove(id: string) { return this.a.remove('pizzaFlavors', id) }
}

export class PizzaAdditionalRepo {
  private a: FirestoreAdapter
  constructor(db: Firestore) { this.a = new FirestoreAdapter(db) }
  list(activeOnly = false) {
    const filters: FireFilter[] = activeOnly ? [{ field: 'active', op: '==', value: true }] : []
    return this.a.find<PizzaAdditional>('pizzaAdditionals', filters, { orderBy: 'name' })
  }
  create(f: Omit<PizzaAdditional, 'id'>) { return this.a.create('pizzaAdditionals', f) }
  update(id: string, f: Partial<PizzaAdditional>) { return this.a.update('pizzaAdditionals', id, f) }
  remove(id: string) { return this.a.remove('pizzaAdditionals', id) }
}

export class SnackRepo {
  private a: FirestoreAdapter
  constructor(db: Firestore) { this.a = new FirestoreAdapter(db) }
  list(activeOnly = false) {
    const filters: FireFilter[] = activeOnly ? [{ field: 'active', op: '==', value: true }] : []
    return this.a.find<SnackProduct>('snacks', filters, { orderBy: 'name' })
  }
  create(f: Omit<SnackProduct, 'id'>) { return this.a.create('snacks', f) }
  update(id: string, f: Partial<SnackProduct>) { return this.a.update('snacks', id, f) }
  remove(id: string) { return this.a.remove('snacks', id) }
}

export class SnackAdditionalRepo {
  private a: FirestoreAdapter
  constructor(db: Firestore) { this.a = new FirestoreAdapter(db) }
  list(activeOnly = false) {
    const filters: FireFilter[] = activeOnly ? [{ field: 'active', op: '==', value: true }] : []
    return this.a.find<SnackAdditional>('snackAdditionals', filters, { orderBy: 'name' })
  }
  create(f: Omit<SnackAdditional, 'id'>) { return this.a.create('snackAdditionals', f) }
  update(id: string, f: Partial<SnackAdditional>) { return this.a.update('snackAdditionals', id, f) }
  remove(id: string) { return this.a.remove('snackAdditionals', id) }
}

export class BeverageRepo {
  private a: FirestoreAdapter
  constructor(db: Firestore) { this.a = new FirestoreAdapter(db) }
  list(activeOnly = false) {
    const filters: FireFilter[] = activeOnly ? [{ field: 'active', op: '==', value: true }] : []
    return this.a.find<BeverageProduct>('beverages', filters, { orderBy: 'name' })
  }
  create(f: Omit<BeverageProduct, 'id'>) { return this.a.create('beverages', f) }
  update(id: string, f: Partial<BeverageProduct>) { return this.a.update('beverages', id, f) }
  remove(id: string) { return this.a.remove('beverages', id) }
}

export class SettingsRepo {
  private a: FirestoreAdapter
  constructor(db: Firestore) { this.a = new FirestoreAdapter(db) }
  async get(): Promise<MenuSettings> {
    const s = await this.a.findById<MenuSettings & { id: string }>('settings', 'menu')
    return s ?? { stuffedCrustPrice: 15, halfHalfRule: 'HYBRID' }
  }
  save(s: MenuSettings) { return this.a.upsert('settings', 'menu', s) }
}

export class CustomerRepo {
  private a: FirestoreAdapter
  constructor(db: Firestore) { this.a = new FirestoreAdapter(db) }
  async findByPhone(digitsOnly: string): Promise<Customer | null> {
    const list = await this.a.find<Customer>('customers', [{ field: 'phone', op: '==', value: digitsOnly }], { limit: 1 })
    return list[0] ?? null
  }
  async searchByPhonePrefix(prefix: string): Promise<Customer[]> {
    // Firestore não suporta startsWith; busca por igualdade ou lista recente
    if (prefix.length < 3) return []
    if (prefix.length >= 10) {
      const exact = await this.findByPhone(prefix)
      return exact ? [exact] : []
    }
    // range query: prefix → prefix + '\uf8ff'
    return this.a.find<Customer>('customers', [
      { field: 'phone', op: '>=', value: prefix },
      { field: 'phone', op: '<=', value: prefix + '\uf8ff' },
    ], { orderBy: 'phone', limit: 10 })
  }
  /**
   * Busca por substring em nome, telefone, logradouro, bairro, referência e
   * observações de acesso — usa o array `searchTokens` pré-computado.
   * Requer que os documentos tenham sido gravados com searchTokens (via create/update
   * desta classe) ou migrados pelo script `npm run migrate:tokens`.
   */
  async searchByTokens(term: string): Promise<Customer[]> {
    const norm = normalizeSearchTerm(term)
    if (!norm) return []
    return this.a.find<Customer>('customers', [
      { field: 'searchTokens', op: 'array-contains' as unknown as '==', value: norm },
    ] as FireFilter[], { limit: 15 })
  }
  list(limit = 50) {
    return this.a.find<Customer>('customers', [], { orderBy: 'name', limit })
  }
  get(id: string) { return this.a.findById<Customer>('customers', id) }
  create(c: Omit<Customer, 'id'>) {
    const searchTokens = generateTokensForCustomer(c as Pick<Customer, 'name' | 'phone' | 'phones' | 'addresses'>)
    return this.a.create('customers', { ...c, searchTokens })
  }
  async update(id: string, c: Partial<Customer>) {
    // Se nome, telefone(s) ou addresses mudaram, regenera searchTokens.
    // Buscamos o doc atual para mesclar antes de recalcular.
    const touchesSearch = 'name' in c || 'phone' in c || 'phones' in c || 'addresses' in c
    if (!touchesSearch) return this.a.update('customers', id, c)
    const current = await this.findById(id)
    const merged = {
      name: c.name ?? current?.name ?? '',
      phone: c.phone ?? current?.phone ?? '',
      phones: c.phones ?? current?.phones ?? [],
      addresses: c.addresses ?? current?.addresses ?? [],
    }
    const searchTokens = generateTokensForCustomer(merged)
    return this.a.update('customers', id, { ...c, searchTokens })
  }
  private findById(id: string) { return this.a.findById<Customer>('customers', id) }
}

export class OrderRepo {
  private a: FirestoreAdapter
  constructor(db: Firestore) { this.a = new FirestoreAdapter(db) }
  get(id: string) { return this.a.findById<Order>('orders', id) }
  create(o: Omit<Order, 'id'>) { return this.a.create('orders', o) }
  update(id: string, o: Partial<Order>) { return this.a.update('orders', id, o) }
  listActive() {
    return this.a.find<Order>('orders', [
      { field: 'status', op: 'in' as unknown as '==', value: ['OPEN', 'AWAITING_PIX', 'PREPARING', 'OUT_FOR_DELIVERY'] },
    ] as FireFilter[], { orderBy: 'createdAt', desc: true })
  }
  watchActive(cb: (orders: Order[]) => void) {
    return this.a.watch<Order>('orders', [
      { field: 'status', op: 'in' as unknown as '==', value: ['OPEN', 'AWAITING_PIX', 'PREPARING', 'OUT_FOR_DELIVERY'] },
    ] as FireFilter[], cb, { orderBy: 'createdAt', desc: true })
  }
  listByDateRange(startTs: number, endTs: number) {
    return this.a.find<Order>('orders', [
      { field: 'createdAt', op: '>=', value: startTs },
      { field: 'createdAt', op: '<=', value: endTs },
    ], { orderBy: 'createdAt', desc: true })
  }
  listByCustomer(customerId: string) {
    return this.a.find<Order>('orders', [{ field: 'customerId', op: '==', value: customerId }], { orderBy: 'createdAt', desc: true })
  }
}
