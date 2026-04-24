<script setup lang="ts">
import type { Order } from '~/types'
defineProps<{ order: Order }>()
</script>

<template>
  <NuxtLink :to="`/pedidos-ativos/${order.id}`" class="card block hover:shadow-md transition-shadow">
    <div class="flex items-start justify-between gap-2">
      <div>
        <div class="text-xs text-text-light">Pedido</div>
        <div class="font-mono text-lg">#{{ order.sequentialNumber }}</div>
      </div>
      <span :class="statusBadgeClass[order.status]">{{ statusLabel[order.status] }}</span>
    </div>
    <div class="mt-3">
      <div class="font-medium">{{ order.customerSnapshot.name }}</div>
      <div class="text-xs text-text-light">{{ order.customerSnapshot.phone }}</div>
    </div>
    <div class="mt-3 text-sm text-text-light line-clamp-2">
      {{ order.items.length }} {{ order.items.length === 1 ? 'item' : 'itens' }} · {{ formatBRL(order.total) }}
    </div>
    <div class="mt-2 text-xs text-text-light">
      Estimativa: {{ formatTime(order.estimatedDeliveryAt) }}
    </div>
  </NuxtLink>
</template>
