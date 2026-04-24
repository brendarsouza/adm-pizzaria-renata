import { defineStore } from 'pinia'
import type { Customer, Address } from '~/types'
import { CustomerRepo } from '~/infrastructure/firebase/repositories'
import { Phone } from '~/domain/value-objects/Phone'

interface State {
  recent: Customer[]
  searchResults: Customer[]
  searching: boolean
  current: Customer | null
}

export const useCustomerStore = defineStore('customer', {
  state: (): State => ({ recent: [], searchResults: [], searching: false, current: null }),
  actions: {
    async loadRecent() {
      const { db } = useFirebase()
      this.recent = await new CustomerRepo(db).list(30)
    },
    async searchByPhone(raw: string) {
      if (!raw || raw.replace(/\D/g, '').length < 3) {
        this.searchResults = []
        return
      }
      this.searching = true
      try {
        const { db } = useFirebase()
        const digits = raw.replace(/\D/g, '')
        this.searchResults = await new CustomerRepo(db).searchByPhonePrefix(digits)
      } finally {
        this.searching = false
      }
    },
    /**
     * Busca inteligente por substring em nome, telefone, logradouro, bairro,
     * referência e observações de acesso. Requer >=3 caracteres após normalização.
     * Para clientes legados sem `searchTokens`, rodar o script de migração.
     */
    async searchSmart(term: string) {
      if (!term || term.trim().length < 3) {
        this.searchResults = []
        return
      }
      this.searching = true
      try {
        const { db } = useFirebase()
        this.searchResults = await new CustomerRepo(db).searchByTokens(term)
      } finally {
        this.searching = false
      }
    },
    async getOrCreateByPhone(name: string, rawPhone: string): Promise<Customer> {
      console.log('getOrCreateByPhone', name, rawPhone)
      const { db } = useFirebase()
      const phone = Phone.fromRaw(rawPhone).value()
      const repo = new CustomerRepo(db)
      const existing = await repo.findByPhone(phone)
      if (existing) {
        this.current = existing
        return existing
      }
      const id = await repo.create({ name, phone, addresses: [] })
      const created = await repo.get(id)
      if (!created) throw new Error('Falha ao criar cliente')
      this.current = created
      return created
    },
    async update(id: string, patch: Partial<Customer>) {
      const { db } = useFirebase()
      await new CustomerRepo(db).update(id, patch)
      if (this.current?.id === id) {
        const refreshed = await new CustomerRepo(db).get(id)
        if (refreshed) this.current = refreshed
      }
    },
    async addAddress(customerId: string, addr: Omit<Address, 'id'>) {
      const { db } = useFirebase()
      const repo = new CustomerRepo(db)
      const c = await repo.get(customerId)
      if (!c) throw new Error('Cliente não encontrado')
      const newAddr: Address = { ...addr, id: crypto.randomUUID(), createdAt: Date.now() }
      const addresses = [...(c.addresses || []), newAddr]
      await repo.update(customerId, { addresses })
      if (this.current?.id === customerId) {
        this.current = { ...c, addresses }
      }
      return newAddr
    },
    setCurrent(c: Customer | null) { this.current = c },
  },
})
