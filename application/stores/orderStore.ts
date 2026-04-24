import { defineStore } from 'pinia'
import type {
  Order, OrderItem, OrderStatus, Payment, Address, Customer, CancelReason,
} from '~/types'
import { OrderRepo } from '~/infrastructure/firebase/repositories'
import { calcularSubtotal, calcularTotalPedido, pagamentoEstaValido } from '~/domain/rules/orderCalculator'

interface DraftState {
  customer: Customer | null
  address: Address | null
  items: OrderItem[]
  deliveryFee: number
  estimateMinutes: number
  payment: Payment | null
  observation: string
}

interface State {
  draft: DraftState
  activeOrders: Order[]
  subscribing: boolean
  unsubscribe: null | (() => void)
  loadingCreate: boolean
}

function emptyDraft(): DraftState {
  return { customer: null, address: null, items: [], deliveryFee: 0, estimateMinutes: 45, payment: null, observation: '' }
}

export const useOrderStore = defineStore('order', {
  state: (): State => ({
    draft: emptyDraft(),
    activeOrders: [],
    subscribing: false,
    unsubscribe: null,
    loadingCreate: false,
  }),
  getters: {
    itemsSubtotal(state): number {
      return calcularSubtotal(state.draft.items).toReais()
    },
    total(state): number {
      return calcularTotalPedido(state.draft.items, state.draft.deliveryFee).toReais()
    },
    todayStats(state) {
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      const ts = todayStart.getTime()
      const today = state.activeOrders.filter(o => o.createdAt >= ts)
      const revenue = today.reduce((s, o) => s + (o.total || 0), 0)
      return {
        count: today.length,
        revenue,
        avgTicket: today.length ? revenue / today.length : 0,
      }
    },
  },
  actions: {
    resetDraft() { this.draft = emptyDraft() },
    addItem(item: OrderItem) { this.draft.items.push(item) },
    removeItem(index: number) { this.draft.items.splice(index, 1) },
    updateItem(index: number, item: OrderItem) { this.draft.items.splice(index, 1, item) },
    setCustomer(c: Customer | null) { this.draft.customer = c; if (!c) this.draft.address = null },
    setAddress(a: Address | null) { this.draft.address = a },
    setDeliveryFee(v: number) { this.draft.deliveryFee = v },
    setEstimateMinutes(v: number) { this.draft.estimateMinutes = v },
    setPayment(p: Payment | null) { this.draft.payment = p },

    async createOrder(uid: string): Promise<string> {
      const d = this.draft
      if (!d.customer) throw new Error('Cliente obrigatório')
      if (!d.address) throw new Error('Endereço obrigatório')
      if (d.items.length === 0) throw new Error('Adicione ao menos um item')
      if (!d.payment) throw new Error('Selecione forma de pagamento')

      const totalMoney = calcularTotalPedido(d.items, d.deliveryFee)
      const subtotalMoney = calcularSubtotal(d.items)

      const check = pagamentoEstaValido(d.payment, totalMoney)
      const status: OrderStatus = d.payment.method === 'PIX' && !d.payment.proofConfirmed
        ? 'AWAITING_PIX'
        : (check.ok ? 'PREPARING' : 'OPEN')

      const now = Date.now()
      const estimatedDeliveryAt = now + d.estimateMinutes * 60_000

      // gerar sequential number via contagem (simples; em produção usar Firestore transaction)
      const { db } = useFirebase()
      const repo = new OrderRepo(db)
      // conta pedidos de hoje + 1 (heurística — pode ter colisões raras)
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      const existing = await repo.listByDateRange(todayStart.getTime(), now)
      const sequentialNumber = existing.length + 1

      const orderData: Omit<Order, 'id'> = {
        sequentialNumber,
        customerId: d.customer.id,
        customerSnapshot: { name: d.customer.name, phone: d.customer.phone },
        addressSnapshot: d.address,
        items: d.items,
        deliveryFee: d.deliveryFee,
        estimateMinutes: d.estimateMinutes,
        estimatedDeliveryAt,
        itemsSubtotal: subtotalMoney.toReais(),
        total: totalMoney.toReais(),
        payment: d.payment,
        status,
        createdAt: now,
        updatedAt: now,
        createdBy: uid,
      }
      this.loadingCreate = true
      try {
        const id = await repo.create(orderData)
        this.resetDraft()
        return id
      } finally {
        this.loadingCreate = false
      }
    },
    async updateStatus(id: string, status: OrderStatus, patch: Partial<Order> = {}) {
      const { db } = useFirebase()
      await new OrderRepo(db).update(id, { status, ...patch, updatedAt: Date.now() })
    },
    async confirmPixProof(id: string) {
      const order = this.activeOrders.find(o => o.id === id)
      if (!order) return
      const updatedPayment = { ...order.payment, proofConfirmed: true, confirmedAt: Date.now() } as Payment
      await this.updateStatus(id, 'PREPARING', { payment: updatedPayment })
    },
    async cancelOrder(
      id: string,
      input: {
        reason: CancelReason
        notes?: string
        cancelledBy?: string
        pixRefund?: { key?: string }
      } | string,
    ) {
      // Compat: aceita string legado para chamadas antigas.
      if (typeof input === 'string') {
        await this.updateStatus(id, 'CANCELLED', {
          cancelReason: input,
          cancelledAt: Date.now(),
        })
        return
      }
      const patch: Partial<Order> = {
        cancelReason: input.reason,
        cancelNotes: input.notes,
        cancelledAt: Date.now(),
        cancelledBy: input.cancelledBy,
      }
      // Se houver devolução PIX, atualiza payment também.
      if (input.pixRefund) {
        const order = this.activeOrders.find(o => o.id === id) || await this.fetchOrder(id)
        if (order && order.payment.method === 'PIX') {
          patch.payment = {
            ...order.payment,
            pixRefundRecorded: true,
            pixRefundKey: input.pixRefund.key,
            pixRefundAt: Date.now(),
          }
        }
      }
      await this.updateStatus(id, 'CANCELLED', patch)
    },

    subscribeActive() {
      if (this.subscribing) return
      try {
        const { db } = useFirebase()
        this.unsubscribe = new OrderRepo(db).watchActive((orders) => {
          this.activeOrders = orders
        })
        this.subscribing = true
      } catch (e) {
        console.warn('[orderStore] subscribe falhou (Firebase não configurado?)', e)
      }
    },
    unsubscribeActive() {
      if (this.unsubscribe) {
        this.unsubscribe()
        this.unsubscribe = null
      }
      this.subscribing = false
    },
    async fetchOrder(id: string): Promise<Order | null> {
      const { db } = useFirebase()
      return new OrderRepo(db).get(id)
    },
  },
})
