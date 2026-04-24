<script setup lang="ts">
import type { OrderStatus } from '~/types'
const order = useOrderStore()
onMounted(() => order.subscribeActive())
onUnmounted(() => order.unsubscribeActive())

const filter = ref<OrderStatus | 'ALL'>('ALL')
const filtered = computed(() => filter.value === 'ALL' ? order.activeOrders : order.activeOrders.filter(o => o.status === filter.value))

function isLate(ts: number) { return ts && Date.now() > ts }
</script>

<template>
  <div>
    <header class="mb-6 flex items-center justify-between">
      <div>
        <h1>Pedidos ativos</h1>
        <p class="text-text-light mt-1">Atualização em tempo real · {{ order.activeOrders.length }} pedido(s)</p>
      </div>
    </header>

    <nav class="flex gap-2 mb-4 flex-wrap">
      <button v-for="f in [['ALL','Todos'],['OPEN','Abertos'],['AWAITING_PIX','Aguardando PIX'],['PREPARING','Em preparo'],['OUT_FOR_DELIVERY','Em entrega']]"
              :key="f[0]"
              :class="['px-3 py-1.5 rounded-btn text-xs border', filter === f[0] ? 'bg-primary text-white border-primary' : 'bg-white border-border']"
              @click="filter = f[0] as any">
        {{ f[1] }}
      </button>
    </nav>

    <div v-if="filtered.length === 0" class="card text-center text-text-light py-12">Nenhum pedido no filtro selecionado.</div>
    <div v-else class="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      <NuxtLink v-for="o in filtered" :key="o.id" :to="`/pedidos-ativos/${o.id}`"
                class="card block hover:shadow-md transition-shadow relative">
        <div v-if="isLate(o.estimatedDeliveryAt)" class="absolute top-3 right-3 text-xs text-status-cancelled font-medium">⚠ atrasado</div>
        <div class="flex items-start justify-between gap-2 mb-3">
          <div>
            <div class="text-xs text-text-light">Pedido</div>
            <div class="font-mono text-lg">#{{ o.sequentialNumber }}</div>
          </div>
          <span :class="statusBadgeClass[o.status]">{{ statusLabel[o.status] }}</span>
        </div>
        <div class="font-medium">{{ o.customerSnapshot.name }}</div>
        <div class="text-xs text-text-light">{{ o.customerSnapshot.phone }}</div>
        <div class="mt-3 text-sm">{{ o.items.length }} item(ns) · <span class="text-primary font-medium">{{ formatBRL(o.total) }}</span></div>
        <div class="text-xs text-text-light mt-1">Entrega: {{ formatTime(o.estimatedDeliveryAt) }}</div>
      </NuxtLink>
    </div>
  </div>
</template>
