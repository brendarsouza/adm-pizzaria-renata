<script setup lang="ts">
import type { Order } from '~/types'
import type { DataTableColumn } from '~/components/shared/BaseDataTable.vue'
import { cancelReasonLabel, CANCEL_REASON_LABELS } from '~/domain/rules/cancelReason'

interface TopCustomer { name: string; phone: string; count: number; total: number }
const topCustomerColumns: DataTableColumn<TopCustomer>[] = [
  { key: 'name', label: 'Cliente', sortable: true, accessor: (r) => r.name },
  { key: 'phone', label: 'Telefone', sortable: true, accessor: (r) => r.phone },
  { key: 'count', label: 'Pedidos', sortable: true, accessor: (r) => r.count, align: 'right', width: '120px' },
  { key: 'total', label: 'Total gasto', sortable: true, accessor: (r) => r.total, align: 'right', width: '160px' },
]
const orders = ref<Order[]>([])
const loading = ref(true)
const range = ref<'today' | 'week' | 'month' | 'year'>('month')

async function load() {
  loading.value = true
  const end = Date.now()
  const now = new Date()
  let startDate = new Date(now)
  if (range.value === 'today') startDate.setHours(0, 0, 0, 0)
  else if (range.value === 'week') startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  else if (range.value === 'month') startDate = new Date(now.getFullYear(), now.getMonth(), 1)
  else startDate = new Date(now.getFullYear(), 0, 1)

  try {
    const { db } = useFirebase()
    const { OrderRepo } = await import('~/infrastructure/firebase/repositories')
    orders.value = await new OrderRepo(db).listByDateRange(startDate.getTime(), end)
  } catch (e) {
    console.warn('relatórios: firebase indisponível', e)
    orders.value = []
  } finally {
    loading.value = false
  }
}
onMounted(load)
watch(range, load)

const completed = computed(() => orders.value.filter(o => o.status === 'DELIVERED'))

const kpis = computed(() => {
  const c = completed.value
  const revenue = c.reduce((s, o) => s + (o.total || 0), 0)
  return {
    count: c.length,
    revenue,
    avgTicket: c.length ? revenue / c.length : 0,
    cancelled: orders.value.filter(o => o.status === 'CANCELLED').length,
  }
})

// top pizza flavors
const topFlavors = computed(() => {
  const counter: Record<string, { name: string; count: number }> = {}
  for (const o of completed.value) {
    for (const it of o.items) {
      if (it.kind !== 'pizza') continue
      const names = it.isHalfHalf ? [it.flavor1.name, it.flavor2?.name].filter(Boolean) : [it.flavor1.name]
      for (const n of names) {
        if (!n) continue
        counter[n] = counter[n] || { name: n, count: 0 }
        counter[n].count += it.quantity
      }
    }
  }
  return Object.values(counter).sort((a, b) => b.count - a.count).slice(0, 10)
})

// payment method pie
const paymentDist = computed(() => {
  const counter: Record<string, number> = { PIX: 0, CASH: 0, CARD: 0 }
  for (const o of completed.value) counter[o.payment.method]++
  const total = Object.values(counter).reduce((a, b) => a + b, 0) || 1
  return Object.entries(counter).map(([k, v]) => ({ method: k, count: v, percent: (v / total) * 100 }))
})

// Cancelamentos — Melhoria 3 (perdas do período)
interface CancelRow { reason: string; label: string; count: number; total: number }
const cancellations = computed(() => orders.value.filter(o => o.status === 'CANCELLED'))
const totalLost = computed(() => cancellations.value.reduce((s, o) => s + (o.total || 0), 0))
const cancelByReason = computed<CancelRow[]>(() => {
  const map: Record<string, CancelRow> = {}
  for (const o of cancellations.value) {
    const key = (o.cancelReason as string) || 'unknown'
    if (!map[key]) {
      map[key] = {
        reason: key,
        label: cancelReasonLabel(o.cancelReason) || 'Sem motivo registrado',
        count: 0,
        total: 0,
      }
    }
    map[key].count++
    map[key].total += o.total || 0
  }
  return Object.values(map).sort((a, b) => b.count - a.count)
})
const cancelColumns: DataTableColumn<CancelRow>[] = [
  { key: 'label', label: 'Motivo', sortable: true, accessor: (r) => r.label },
  { key: 'count', label: 'Qtd', sortable: true, accessor: (r) => r.count, align: 'right', width: '100px' },
  { key: 'total', label: 'Total perdido', sortable: true, accessor: (r) => r.total, align: 'right', width: '160px' },
]

// top customers
const topCustomers = computed(() => {
  const map: Record<string, { name: string; phone: string; count: number; total: number }> = {}
  for (const o of completed.value) {
    const k = o.customerId
    if (!map[k]) map[k] = { name: o.customerSnapshot.name, phone: o.customerSnapshot.phone, count: 0, total: 0 }
    map[k].count++
    map[k].total += o.total || 0
  }
  return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 10)
})

// heatmap dia x hora
const heatmap = computed(() => {
  const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0))
  for (const o of completed.value) {
    const d = new Date(o.createdAt)
    grid[d.getDay()]![d.getHours()]!++
  }
  const max = Math.max(1, ...grid.flat())
  return { grid, max }
})
const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
</script>

<template>
  <div>
    <header class="mb-6 flex items-center justify-between flex-wrap gap-3">
      <div>
        <h1>Relatórios</h1>
        <p class="text-text-light mt-1">Indicadores · ranking · heatmap</p>
      </div>
      <nav class="flex gap-2">
        <button v-for="r in [['today','Hoje'],['week','Semana'],['month','Mês'],['year','Ano']]" :key="r[0]"
                :class="['px-3 py-1.5 rounded-btn text-xs border', range === r[0] ? 'bg-primary text-white border-primary' : 'bg-white border-border']"
                @click="range = r[0] as any">
          {{ r[1] }}
        </button>
      </nav>
    </header>

    <div v-if="loading" class="card text-center text-text-light">Carregando…</div>
    <template v-else>
      <section class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div class="card"><div class="text-xs text-text-light uppercase">Faturamento</div><div class="font-serif text-2xl text-primary mt-1">{{ formatBRL(kpis.revenue) }}</div></div>
        <div class="card"><div class="text-xs text-text-light uppercase">Pedidos entregues</div><div class="font-serif text-2xl mt-1">{{ kpis.count }}</div></div>
        <div class="card"><div class="text-xs text-text-light uppercase">Ticket médio</div><div class="font-serif text-2xl mt-1">{{ formatBRL(kpis.avgTicket) }}</div></div>
        <div class="card">
          <div class="text-xs text-text-light uppercase">Perdas do período</div>
          <div class="font-serif text-2xl mt-1 text-status-cancelled">{{ formatBRL(totalLost) }}</div>
          <div class="text-xs text-text-light">{{ kpis.cancelled }} cancelado(s)</div>
        </div>
      </section>

      <div class="grid md:grid-cols-2 gap-6 mb-8">
        <section class="card">
          <h3 class="font-serif text-lg mb-4">Top sabores de pizza</h3>
          <ul v-if="topFlavors.length" class="space-y-2">
            <li v-for="f in topFlavors" :key="f.name" class="flex items-center gap-3 text-sm">
              <div class="flex-1 font-medium">{{ f.name }}</div>
              <div class="text-text-light">{{ f.count }}</div>
              <div class="w-24 bg-surface rounded h-2 overflow-hidden">
                <div class="h-full bg-primary" :style="{ width: `${(f.count / topFlavors[0]!.count) * 100}%` }"></div>
              </div>
            </li>
          </ul>
          <p v-else class="text-sm text-text-light">Sem dados no período.</p>
        </section>

        <section class="card">
          <h3 class="font-serif text-lg mb-4">Formas de pagamento</h3>
          <ul class="space-y-2">
            <li v-for="p in paymentDist" :key="p.method" class="flex items-center gap-3 text-sm">
              <div class="flex-1 font-medium">{{ p.method }}</div>
              <div class="text-text-light">{{ p.count }} ({{ p.percent.toFixed(0) }}%)</div>
              <div class="w-24 bg-surface rounded h-2 overflow-hidden">
                <div class="h-full bg-accent" :style="{ width: `${p.percent}%` }"></div>
              </div>
            </li>
          </ul>
        </section>
      </div>

      <section class="card mb-8">
        <h3 class="font-serif text-lg mb-4">Mapa de calor — dia × hora</h3>
        <div class="overflow-x-auto">
          <table class="text-[10px] border-collapse">
            <thead>
              <tr>
                <th class="w-10"></th>
                <th v-for="h in 24" :key="h" class="px-1 text-text-light font-normal">{{ h - 1 }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, i) in heatmap.grid" :key="i">
                <td class="pr-2 text-text-light">{{ weekdays[i] }}</td>
                <td v-for="(n, h) in row" :key="h" class="w-5 h-5 border border-bg"
                    :style="{ background: n === 0 ? '#F5EFE6' : `rgba(107,26,26,${0.15 + (n / heatmap.max) * 0.85})` }"
                    :title="`${weekdays[i]} ${h}h: ${n} pedido(s)`">
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="card mb-8">
        <h3 class="font-serif text-lg mb-4">Cancelamentos por motivo</h3>
        <BaseDataTable
          :columns="cancelColumns"
          :data="cancelByReason"
          :page-size="10"
          :searchable="false"
          :row-key="(r) => r.reason"
        >
          <template #cell-total="{ row }">
            <span class="font-medium text-status-cancelled">{{ formatBRL((row as CancelRow).total) }}</span>
          </template>
          <template #empty>Sem cancelamentos no período.</template>
        </BaseDataTable>
      </section>

      <section class="card">
        <h3 class="font-serif text-lg mb-4">Top clientes</h3>
        <BaseDataTable
          :columns="topCustomerColumns"
          :data="topCustomers"
          :page-size="10"
          search-placeholder="Filtrar clientes…"
          :row-key="(c) => c.phone"
        >
          <template #cell-total="{ row }">
            <span class="font-medium">{{ formatBRL((row as TopCustomer).total) }}</span>
          </template>
          <template #empty>Sem dados no período.</template>
        </BaseDataTable>
      </section>
    </template>
  </div>
</template>
