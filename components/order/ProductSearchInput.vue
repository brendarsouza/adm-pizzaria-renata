<script setup lang="ts" generic="T extends { id: string; productNumber?: string; name: string }">
import { computed, ref, watch } from 'vue'
import { useKeyboardNav } from '~/composables/useKeyboardNav'

export interface ProductSearchEntry<R> {
  /** Produto original */
  product: R
  /** Número exibido (ex: "001"); vazio se não cadastrado */
  number: string
  /** Rótulo de categoria (ex: "Pizza", "Lanche") */
  categoryLabel: string
}

const props = withDefaults(defineProps<{
  entries: ProductSearchEntry<T>[]
  placeholder?: string
  autofocus?: boolean
  /** Máximo de resultados exibidos no dropdown */
  maxResults?: number
}>(), {
  placeholder: 'Digite o número ou nome do produto…',
  autofocus: false,
  maxResults: 8,
})

const emit = defineEmits<{
  select: [product: T]
}>()

const term = ref('')
const open = ref(false)
const inputRef = ref<HTMLInputElement | null>(null)

function norm(v: unknown): string {
  if (v == null) return ''
  return String(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

const results = computed<ProductSearchEntry<T>[]>(() => {
  const q = norm(term.value.trim())
  if (!q) return props.entries.slice(0, props.maxResults)
  const tokens = q.split(/\s+/).filter(Boolean)
  const scored = props.entries
    .map(entry => {
      const number = entry.number
      const name = norm(entry.product.name)
      let score = 0
      // Match exato por número → prioridade máxima
      if (number && number === q) score += 1000
      else if (number && number.startsWith(q)) score += 500
      // Todas as palavras precisam existir no nome
      const allMatch = tokens.every(t => name.includes(t) || (number && number.startsWith(t)))
      if (!allMatch) return null
      // Pontuação extra por match no início do nome
      if (name.startsWith(q)) score += 100
      else score += 10
      return { entry, score }
    })
    .filter((x): x is { entry: ProductSearchEntry<T>; score: number } => x !== null)
    .sort((a, b) => b.score - a.score)
  return scored.slice(0, props.maxResults).map(x => x.entry)
})

const nav = useKeyboardNav({
  items: results,
  onSelect: (entry) => {
    choose(entry)
  },
  onEscape: () => {
    open.value = false
    inputRef.value?.blur()
  },
})

function choose(entry: ProductSearchEntry<T>) {
  emit('select', entry.product)
  term.value = ''
  open.value = false
}

function onFocus() { open.value = true }
function onBlur() {
  // delay para permitir click em resultado antes de fechar
  setTimeout(() => { open.value = false }, 150)
}

watch(term, () => {
  open.value = true
  nav.reset()
})

onMounted(() => {
  if (props.autofocus) inputRef.value?.focus()
})
</script>

<template>
  <div class="relative" role="combobox" :aria-expanded="open">
    <label class="sr-only" for="product-search-input">Buscar produto</label>
    <div class="relative">
      <span class="absolute left-3 top-1/2 -translate-y-1/2 text-text-light text-sm pointer-events-none">🔎</span>
      <input
        id="product-search-input"
        ref="inputRef"
        v-model="term"
        type="text"
        class="input pl-9"
        :placeholder="placeholder"
        autocomplete="off"
        aria-autocomplete="list"
        aria-haspopup="listbox"
        aria-controls="product-search-listbox"
        @focus="onFocus"
        @blur="onBlur"
        @keydown.down.prevent="nav.down()"
        @keydown.up.prevent="nav.up()"
        @keydown.enter.prevent="nav.enter()"
        @keydown.esc.prevent="onEsc()"
      />
    </div>

    <ul
      v-if="open && results.length > 0"
      id="product-search-listbox"
      role="listbox"
      class="absolute z-20 left-0 right-0 mt-1 max-h-80 overflow-y-auto bg-white border border-border rounded-card shadow-card"
    >
      <li
        v-for="(entry, i) in results"
        :key="entry.product.id"
        role="option"
        :aria-selected="nav.activeIndex.value === i"
        class="px-3 py-2 cursor-pointer flex items-baseline gap-2 border-b border-border/40 last:border-0"
        :class="nav.activeIndex.value === i ? 'bg-surface' : 'hover:bg-surface/60'"
        @mouseenter="nav.setActive(i)"
        @mousedown.prevent="choose(entry)"
      >
        <span class="font-mono text-primary text-sm min-w-[3ch]">{{ entry.number || '—' }}</span>
        <span class="flex-1 text-sm">{{ entry.product.name }}</span>
        <span class="text-[11px] px-2 py-0.5 rounded-full bg-surface text-primary border border-border whitespace-nowrap">
          {{ entry.categoryLabel }}
        </span>
      </li>
    </ul>
    <p
      v-else-if="open && term.trim().length > 0"
      class="absolute z-20 left-0 right-0 mt-1 p-3 bg-white border border-border rounded-card shadow-card text-sm text-text-light"
    >
      Nenhum produto encontrado.
    </p>
  </div>
</template>
