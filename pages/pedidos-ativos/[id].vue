<script setup lang="ts">
import type { Order, OrderStatus, OrderItem } from '~/types'
const route = useRoute()
const order = useOrderStore()
const current = ref<Order | null>(null)
const loading = ref(true)

async function load() {
  loading.value = true
  current.value = await order.fetchOrder(route.params.id as string)
  loading.value = false
}
onMounted(load)

async function advance(status: OrderStatus) {
  if (!current.value) return
  await order.updateStatus(current.value.id, status)
  await load()
}
async function confirmPix() {
  if (!current.value) return
  await order.confirmPixProof(current.value.id)
  await load()
}
const auth = useAuthStore()
const showCancel = ref(false)
const cancelling = ref(false)
async function doCancel(payload: { reason: import('~/types').CancelReason; notes?: string; pixRefund?: { key?: string } }) {
  if (!current.value) return
  cancelling.value = true
  try {
    await order.cancelOrder(current.value.id, {
      reason: payload.reason,
      notes: payload.notes,
      cancelledBy: auth.user?.uid,
      pixRefund: payload.pixRefund,
    })
    showCancel.value = false
    await load()
  } finally {
    cancelling.value = false
  }
}

function itemDescribe(item: OrderItem) {
  if (item.kind === 'pizza') {
    const parts = [`Pizza ${item.size}`]
    parts.push(item.isHalfHalf ? `½ ${item.flavor1.name} / ½ ${item.flavor2?.name}` : item.flavor1.name)
    if (item.stuffedCrust) parts.push('borda recheada')
    if (item.additionals?.length) parts.push(`+ ${item.additionals.map(a => a.name).join(', ')}`)
    return parts.join(' · ')
  }
  if (item.kind === 'snack') return item.name
  return `${item.name} (${item.variantLabel})`
}
</script>

<template>
  <div v-if="loading" class="card text-center text-text-light">Carregando…</div>
  <div v-else-if="!current" class="card text-center">Pedido não encontrado.</div>
  <div v-else>
    <header class="mb-6 flex items-start justify-between gap-4 flex-wrap">
      <div>
        <NuxtLink to="/pedidos-ativos" class="text-sm text-primary hover:underline">← voltar</NuxtLink>
        <h1>Pedido #{{ current.sequentialNumber }}</h1>
        <p class="text-text-light mt-1">Criado em {{ formatDateTime(current.createdAt) }}</p>
      </div>
      <div class="flex items-center gap-3">
        <span :class="statusBadgeClass[current.status]" class="text-sm">{{ statusLabel[current.status] }}</span>
        <NuxtLink :to="`/pedidos/${current.id}/comanda`" target="_blank" class="btn-secondary">🖨 Comanda</NuxtLink>
      </div>
    </header>

    <div class="grid md:grid-cols-2 gap-6">
      <section class="card">
        <h3 class="font-serif text-lg mb-3">Cliente</h3>
        <div class="font-medium">{{ current.customerSnapshot.name }}</div>
        <div class="text-sm text-text-light">{{ current.customerSnapshot.phone }}</div>
        <div class="mt-4 text-sm">
          <div>{{ current.addressSnapshot.street }}, {{ current.addressSnapshot.number }}</div>
          <div class="text-text-light">{{ current.addressSnapshot.district }}</div>
          <div v-if="current.addressSnapshot.reference" class="text-xs mt-1">📍 {{ current.addressSnapshot.reference }}</div>
          <div v-if="current.addressSnapshot.accessNotes" class="text-xs">ℹ️ {{ current.addressSnapshot.accessNotes }}</div>
        </div>
      </section>

      <section class="card">
        <h3 class="font-serif text-lg mb-3">Pagamento</h3>
        <div class="text-sm">
          <div v-if="current.payment.method === 'PIX'">
            PIX · {{ current.payment.proofConfirmed ? '✓ Comprovante confirmado' : '⏳ Aguardando comprovante' }}
          </div>
          <div v-if="current.payment.method === 'CASH'">
            Dinheiro
            <div v-if="current.payment.needsChange && current.payment.cashGiven" class="text-xs text-text-light mt-1">
              Cliente paga {{ formatBRL(current.payment.cashGiven) }} · Troco {{ formatBRL(current.payment.change || 0) }}
            </div>
          </div>
          <div v-if="current.payment.method === 'CARD'">
            Cartão {{ current.payment.debitOrCredit === 'credit' ? 'crédito' : 'débito' }} · {{ current.payment.brand }}
          </div>
        </div>
      </section>
    </div>

    <section class="card mt-6">
      <h3 class="font-serif text-lg mb-3">Itens</h3>
      <ul class="divide-y divide-border/50">
        <li v-for="(it, i) in current.items" :key="i" class="py-2 text-sm">
          <div class="font-medium flex items-center gap-2 flex-wrap">
            <CategoryBadge :item="it" />
            <span>{{ itemDescribe(it) }}</span>
          </div>
          <div class="text-xs text-text-light">Qtd: {{ it.quantity }}
            <span v-if="it.kind === 'pizza' && it.observation"> · {{ it.observation }}</span>
            <span v-if="it.kind === 'pizza' && it.removedIngredients?.length"> · sem {{ it.removedIngredients.join(', ') }}</span>
          </div>
        </li>
      </ul>
      <div class="mt-4 pt-4 border-t border-border space-y-1 text-sm">
        <div class="flex justify-between"><span class="text-text-light">Subtotal</span><span>{{ formatBRL(current.itemsSubtotal) }}</span></div>
        <div class="flex justify-between"><span class="text-text-light">Entrega</span><span>{{ formatBRL(current.deliveryFee) }}</span></div>
        <div class="flex justify-between font-serif text-lg pt-1"><span>Total</span><span class="text-primary">{{ formatBRL(current.total) }}</span></div>
      </div>
    </section>

    <section class="mt-6 flex flex-wrap gap-2">
      <button v-if="current.status === 'AWAITING_PIX'" class="btn-primary" @click="confirmPix">Confirmar PIX → Preparar</button>
      <button v-if="current.status === 'OPEN'" class="btn-primary" @click="advance('PREPARING')">Iniciar preparo</button>
      <button v-if="current.status === 'PREPARING'" class="btn-primary" @click="advance('OUT_FOR_DELIVERY')">Saiu para entrega</button>
      <button v-if="current.status === 'OUT_FOR_DELIVERY'" class="btn-primary" @click="advance('DELIVERED')">Confirmar entrega</button>
      <button v-if="current.status !== 'DELIVERED' && current.status !== 'CANCELLED'" class="btn-danger" @click="showCancel = true">Cancelar pedido</button>
    </section>

    <CancelOrderModal
      v-if="current"
      :open="showCancel"
      :order="current"
      :submitting="cancelling"
      @close="showCancel = false"
      @confirm="doCancel"
    />
  </div>
</template>
