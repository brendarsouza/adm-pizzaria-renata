<script setup lang="ts">
import type { Order } from '~/types'

const orderStore = useOrderStore()
const { activeOrders, todayStats } = storeToRefs(orderStore)

onMounted(() => orderStore.subscribeActive())
onUnmounted(() => orderStore.unsubscribeActive())
</script>

<template>
  <div>
    <header class="mb-8">
      <h1>Dashboard</h1>
      <p class="text-text-light mt-1">Visão geral da operação</p>
    </header>

    <section class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <div class="card">
        <div class="text-xs text-text-light uppercase tracking-wide">Pedidos hoje</div>
        <div class="font-serif text-3xl mt-1">{{ todayStats.count }}</div>
      </div>
      <div class="card">
        <div class="text-xs text-text-light uppercase tracking-wide">Faturamento hoje</div>
        <div class="font-serif text-3xl mt-1 text-primary">{{ formatBRL(todayStats.revenue) }}</div>
      </div>
      <div class="card">
        <div class="text-xs text-text-light uppercase tracking-wide">Ticket médio</div>
        <div class="font-serif text-3xl mt-1">{{ formatBRL(todayStats.avgTicket) }}</div>
      </div>
      <div class="card">
        <div class="text-xs text-text-light uppercase tracking-wide">Ativos agora</div>
        <div class="font-serif text-3xl mt-1">{{ activeOrders.length }}</div>
      </div>
    </section>

    <section>
      <div class="flex items-center justify-between mb-4">
        <h2>Pedidos ativos</h2>
        <NuxtLink to="/pedidos-ativos" class="text-sm text-primary hover:underline">Ver todos →</NuxtLink>
      </div>
      <div v-if="activeOrders.length === 0" class="card text-center text-text-light py-12">
        Nenhum pedido ativo no momento.
      </div>
      <div v-else class="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        <OrderCard v-for="o in activeOrders.slice(0, 6)" :key="o.id" :order="o" />
      </div>
    </section>
  </div>
</template>
