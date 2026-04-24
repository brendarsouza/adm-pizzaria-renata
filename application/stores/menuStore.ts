import { defineStore } from 'pinia'
import type {
  PizzaFlavor, PizzaAdditional, SnackProduct, SnackAdditional,
  BeverageProduct, MenuSettings,
} from '~/types'
import {
  PizzaFlavorRepo, PizzaAdditionalRepo, SnackRepo, SnackAdditionalRepo,
  BeverageRepo, SettingsRepo,
} from '~/infrastructure/firebase/repositories'

interface State {
  flavors: PizzaFlavor[]
  pizzaAdditionals: PizzaAdditional[]
  snacks: SnackProduct[]
  snackAdditionals: SnackAdditional[]
  beverages: BeverageProduct[]
  settings: MenuSettings
  loading: boolean
  loaded: boolean
}

export const useMenuStore = defineStore('menu', {
  state: (): State => ({
    flavors: [], pizzaAdditionals: [], snacks: [], snackAdditionals: [],
    beverages: [],
    settings: { stuffedCrustPrice: 15, halfHalfRule: 'HYBRID' },
    loading: false, loaded: false,
  }),
  getters: {
    activeFlavors: (s) => s.flavors.filter(f => f.active),
    activePizzaAdditionals: (s) => s.pizzaAdditionals.filter(a => a.active),
    activeSnacks: (s) => s.snacks.filter(p => p.active),
    activeBeverages: (s) => s.beverages.filter(b => b.active),
    flavorById: (s) => (id: string) => s.flavors.find(f => f.id === id),
  },
  actions: {
    async loadAll() {
      if (this.loaded) return
      this.loading = true
      try {
        const { db } = useFirebase()
        const [flavors, pizzaAdds, snacks, snackAdds, beverages, settings] = await Promise.all([
          new PizzaFlavorRepo(db).list(),
          new PizzaAdditionalRepo(db).list(),
          new SnackRepo(db).list(),
          new SnackAdditionalRepo(db).list(),
          new BeverageRepo(db).list(),
          new SettingsRepo(db).get(),
        ])
        this.flavors = flavors
        this.pizzaAdditionals = pizzaAdds
        this.snacks = snacks
        this.snackAdditionals = snackAdds
        this.beverages = beverages
        this.settings = settings
        this.loaded = true
      } finally {
        this.loading = false
      }
    },
    async reload() { this.loaded = false; return this.loadAll() },
    async saveSettings(s: MenuSettings) {
      const { db } = useFirebase()
      await new SettingsRepo(db).save(s)
      this.settings = s
    },
    async createFlavor(f: Omit<PizzaFlavor, 'id'>) {
      const { db } = useFirebase()
      await new PizzaFlavorRepo(db).create(f)
      await this.reload()
    },
    async updateFlavor(id: string, f: Partial<PizzaFlavor>) {
      const { db } = useFirebase()
      await new PizzaFlavorRepo(db).update(id, f)
      await this.reload()
    },
    async removeFlavor(id: string) {
      const { db } = useFirebase()
      await new PizzaFlavorRepo(db).remove(id)
      await this.reload()
    },
    async createPizzaAdditional(a: Omit<PizzaAdditional, 'id'>) {
      const { db } = useFirebase()
      await new PizzaAdditionalRepo(db).create(a)
      await this.reload()
    },
    async updatePizzaAdditional(id: string, a: Partial<PizzaAdditional>) {
      const { db } = useFirebase()
      await new PizzaAdditionalRepo(db).update(id, a)
      await this.reload()
    },
    async createSnack(p: Omit<SnackProduct, 'id'>) {
      const { db } = useFirebase()
      await new SnackRepo(db).create(p)
      await this.reload()
    },
    async updateSnack(id: string, p: Partial<SnackProduct>) {
      const { db } = useFirebase()
      await new SnackRepo(db).update(id, p)
      await this.reload()
    },
    async removeSnack(id: string) {
      const { db } = useFirebase()
      await new SnackRepo(db).remove(id)
      await this.reload()
    },
    async createBeverage(b: Omit<BeverageProduct, 'id'>) {
      const { db } = useFirebase()
      await new BeverageRepo(db).create(b)
      await this.reload()
    },
    async updateBeverage(id: string, b: Partial<BeverageProduct>) {
      const { db } = useFirebase()
      await new BeverageRepo(db).update(id, b)
      await this.reload()
    },
    async removeBeverage(id: string) {
      const { db } = useFirebase()
      await new BeverageRepo(db).remove(id)
      await this.reload()
    },
    /**
     * Importa em massa a partir de linhas CSV já agrupadas (GroupedMenu).
     * @param grouped agrupamento retornado por `groupIntoDomain(rows)`
     * @param overwrite se true, sobrescreve itens com o mesmo nome (por coleção)
     */
    async importFromCSV(
      grouped: {
        flavors: Array<Omit<PizzaFlavor, 'id'>>
        snacks: Array<Omit<SnackProduct, 'id'>>
        beverages: Array<Omit<BeverageProduct, 'id'>>
      },
      overwrite = false,
    ): Promise<{ imported: number; skipped: number; errors: Array<{ name: string; error: string }> }> {
      const { db } = useFirebase()
      const flavorRepo = new PizzaFlavorRepo(db)
      const snackRepo = new SnackRepo(db)
      const beverageRepo = new BeverageRepo(db)

      // garante catálogos carregados para detecção de duplicatas
      await this.loadAll()

      let imported = 0
      let skipped = 0
      const errors: Array<{ name: string; error: string }> = []
      const now = Date.now()

      const existingFlavorByName = new Map(this.flavors.map(f => [f.name.toLowerCase(), f]))
      const existingSnackByName = new Map(this.snacks.map(s => [s.name.toLowerCase(), s]))
      const existingBeverageByName = new Map(this.beverages.map(b => [b.name.toLowerCase(), b]))

      for (const f of grouped.flavors) {
        try {
          const existing = existingFlavorByName.get(f.name.toLowerCase())
          if (existing) {
            if (overwrite) { await flavorRepo.update(existing.id, { ...f, updatedAt: now }); imported++ }
            else skipped++
          } else {
            await flavorRepo.create({ ...f, createdAt: now, updatedAt: now })
            imported++
          }
        } catch (e) {
          errors.push({ name: f.name, error: (e as Error).message })
        }
      }
      for (const s of grouped.snacks) {
        try {
          const existing = existingSnackByName.get(s.name.toLowerCase())
          if (existing) {
            if (overwrite) { await snackRepo.update(existing.id, s); imported++ }
            else skipped++
          } else {
            await snackRepo.create(s)
            imported++
          }
        } catch (e) {
          errors.push({ name: s.name, error: (e as Error).message })
        }
      }
      for (const b of grouped.beverages) {
        try {
          const existing = existingBeverageByName.get(b.name.toLowerCase())
          if (existing) {
            if (overwrite) { await beverageRepo.update(existing.id, b); imported++ }
            else skipped++
          } else {
            await beverageRepo.create(b)
            imported++
          }
        } catch (e) {
          errors.push({ name: b.name, error: (e as Error).message })
        }
      }

      await this.reload()
      return { imported, skipped, errors }
    },
  },
})
