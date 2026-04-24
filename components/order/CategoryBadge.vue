<script setup lang="ts">
import type { OrderItem } from '~/types'
import { useItemCategory } from '~/composables/useItemCategory'

const props = defineProps<{
  item: OrderItem
  /** Sem emoji (ex: para comanda impressa em texto) */
  textOnly?: boolean
}>()

const { category } = useItemCategory()
const info = computed(() => category(props.item))
</script>

<template>
  <span
    class="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] rounded-full bg-surface text-primary border border-border whitespace-nowrap"
    :aria-label="`Categoria ${info.label}`"
    :title="info.code"
  >
    <span v-if="!textOnly" aria-hidden="true">{{ info.icon }}</span>
    <span>{{ info.label }}</span>
  </span>
</template>
