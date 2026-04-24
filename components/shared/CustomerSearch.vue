<script setup lang="ts">
import type { Customer } from '~/types'
import { watchDebounced } from '@vueuse/core'

const props = defineProps<{
  placeholder?: string
  autofocus?: boolean
  /** Mostrar rodapé "Cadastrar novo" quando sem resultados */
  showCreateHint?: boolean
}>()

const emit = defineEmits<{
  select: [c: Customer]
  create: [termInicial: string]
}>()

const customer = useCustomerStore()
const term = ref('')
const open = ref(false)
const inputRef = ref<HTMLInputElement | null>(null)

watchDebounced(term, async (t) => {
  if (!t || t.trim().length < 3) {
    customer.searchResults = []
    open.value = false
    nav.reset()
    return
  }
  await customer.searchSmart(t)
  open.value = true
  nav.reset()
}, { debounce: 300 })

function selectCustomer(c: Customer) {
  emit('select', c)
  open.value = false
  term.value = ''
  customer.searchResults = []
  nav.reset()
}

const results = computed(() => customer.searchResults)
const nav = useKeyboardNav(results, (c) => selectCustomer(c))

function onBlur() {
  // delay para permitir que o click no item dispare antes
  setTimeout(() => { open.value = false }, 150)
}
function onFocus() {
  if (customer.searchResults.length > 0) open.value = true
}
function onEsc() {
  open.value = false
  nav.reset()
}
function openCreate() {
  emit('create', term.value)
}
function formatPhone(p: string) {
  if (!p) return ''
  if (p.length === 11) return `(${p.slice(0, 2)}) ${p.slice(2, 7)}-${p.slice(7)}`
  if (p.length === 10) return `(${p.slice(0, 2)}) ${p.slice(2, 6)}-${p.slice(6)}`
  return p
}

onMounted(() => {
  if (props.autofocus) inputRef.value?.focus()
})

defineExpose({ focus: () => inputRef.value?.focus() })
</script>

<template>
  <div class="relative" role="search">
    <label class="sr-only" for="customer-search-input">Pesquisar cliente</label>
    <div class="relative">
      <span class="absolute left-3 top-1/2 -translate-y-1/2 text-text-light text-sm pointer-events-none">🔍</span>
      <input
        id="customer-search-input"
        ref="inputRef"
        v-model="term"
        type="text"
        class="input pl-9"
        :placeholder="placeholder || 'Buscar por nome, telefone ou endereço…'"
        autocomplete="off"
        aria-autocomplete="list"
        aria-haspopup="listbox"
        :aria-expanded="open"
        aria-controls="customer-search-listbox"
        @focus="onFocus"
        @blur="onBlur"
        @keydown.down.prevent="nav.down()"
        @keydown.up.prevent="nav.up()"
        @keydown.enter.prevent="nav.enter()"
        @keydown.esc="onEsc"
      />
      <span
        v-if="customer.searching"
        class="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-light"
        aria-label="Buscando"
      >⏳</span>
    </div>

    <ul
      v-if="open && (results.length || term.length >= 3)"
      id="customer-search-listbox"
      role="listbox"
      aria-label="Resultados da busca"
      class="absolute left-0 right-0 top-full mt-1 z-20 bg-white border border-border rounded-btn shadow-lg max-h-72 overflow-y-auto"
    >
      <li
        v-for="(c, i) in results"
        :key="c.id"
        role="option"
        :aria-selected="nav.activeIndex.value === i"
        :class="[
          'px-3 py-2 cursor-pointer border-b border-border/30 last:border-b-0',
          nav.activeIndex.value === i ? 'bg-primary/10' : 'hover:bg-surface',
        ]"
        @mousedown.prevent="selectCustomer(c)"
        @mouseenter="nav.setActive(i)"
      >
        <div class="font-medium text-sm">{{ c.name }}</div>
        <div class="text-xs text-text-light font-mono">{{ formatPhone(c.phone) }}</div>
        <div v-if="c.addresses?.[0]" class="text-xs text-text-light truncate">
          📍 {{ c.addresses[0].street }}, {{ c.addresses[0].number }}<span v-if="c.addresses[0].district"> — {{ c.addresses[0].district }}</span>
        </div>
      </li>
      <li
        v-if="results.length === 0 && !customer.searching"
        class="px-3 py-3 text-sm text-text-light"
      >
        Nenhum cliente encontrado.
        <button
          v-if="showCreateHint"
          class="ml-1 underline text-primary hover:text-primary-dark"
          @mousedown.prevent="openCreate"
        >Cadastrar novo cliente</button>
      </li>
    </ul>
  </div>
</template>
