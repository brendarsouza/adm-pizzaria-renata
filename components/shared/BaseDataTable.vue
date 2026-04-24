<script setup lang="ts" generic="T extends object">
import { computed, ref, watch } from 'vue'

export interface DataTableColumn<R = Record<string, unknown>> {
  key: string
  label: string
  sortable?: boolean
  width?: string
  align?: 'left' | 'center' | 'right'
  /** Extrai valor de busca/ordenação quando a coluna não corresponde direto a uma chave do registro */
  accessor?: (row: R) => string | number | null | undefined
}

interface Props {
  columns: DataTableColumn<T>[]
  data: T[]
  pageSize?: number
  searchable?: boolean
  loading?: boolean
  /** placeholder do input de busca */
  searchPlaceholder?: string
  /** chave única por linha (para :key); usa índice por padrão */
  rowKey?: (row: T, index: number) => string | number
  /** tamanhos disponíveis no seletor */
  pageSizes?: number[]
}

const props = withDefaults(defineProps<Props>(), {
  pageSize: 15,
  searchable: true,
  loading: false,
  searchPlaceholder: 'Buscar…',
  pageSizes: () => [10, 15, 25, 50],
  rowKey: undefined,
})

const term = ref('')
const sortKey = ref<string | null>(null)
const sortDir = ref<'asc' | 'desc'>('asc')
const currentPage = ref(1)
const localPageSize = ref(props.pageSize)

watch(() => props.pageSize, (v) => { localPageSize.value = v })
watch([term, localPageSize], () => { currentPage.value = 1 })
watch(() => props.data, () => { currentPage.value = 1 })

function norm(v: unknown): string {
  if (v == null) return ''
  return String(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function cellValue(row: T, col: DataTableColumn<T>): unknown {
  if (col.accessor) return col.accessor(row)
  return (row as unknown as Record<string, unknown>)[col.key]
}

const filtered = computed<T[]>(() => {
  if (!props.searchable || !term.value.trim()) return props.data
  const q = norm(term.value.trim())
  return props.data.filter(row =>
    props.columns.some(col => norm(cellValue(row, col)).includes(q))
  )
})

const sorted = computed<T[]>(() => {
  if (!sortKey.value) return filtered.value
  const col = props.columns.find(c => c.key === sortKey.value)
  if (!col) return filtered.value
  const dir = sortDir.value === 'asc' ? 1 : -1
  return [...filtered.value].sort((a, b) => {
    const va = cellValue(a, col)
    const vb = cellValue(b, col)
    if (va == null && vb == null) return 0
    if (va == null) return 1
    if (vb == null) return -1
    if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir
    return norm(va).localeCompare(norm(vb)) * dir
  })
})

const totalPages = computed(() => Math.max(1, Math.ceil(sorted.value.length / localPageSize.value)))
const paged = computed<T[]>(() => {
  const start = (currentPage.value - 1) * localPageSize.value
  return sorted.value.slice(start, start + localPageSize.value)
})

const rangeStart = computed(() => sorted.value.length === 0 ? 0 : (currentPage.value - 1) * localPageSize.value + 1)
const rangeEnd = computed(() => Math.min(currentPage.value * localPageSize.value, sorted.value.length))

function toggleSort(col: DataTableColumn<T>) {
  if (!col.sortable) return
  if (sortKey.value === col.key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = col.key
    sortDir.value = 'asc'
  }
}

function keyFor(row: T, i: number): string | number {
  if (props.rowKey) return props.rowKey(row, i)
  const maybeId = (row as unknown as Record<string, unknown>).id
  return typeof maybeId === 'string' || typeof maybeId === 'number' ? maybeId : i
}

function prev() { if (currentPage.value > 1) currentPage.value-- }
function next() { if (currentPage.value < totalPages.value) currentPage.value++ }
</script>

<template>
  <div class="w-full">
    <div v-if="searchable || pageSizes.length > 1" class="flex flex-col sm:flex-row sm:items-center gap-2 mb-3">
      <div v-if="searchable" class="flex-1">
        <input
          v-model="term"
          type="search"
          class="input w-full"
          :placeholder="searchPlaceholder"
          aria-label="Buscar na tabela"
        />
      </div>
      <div class="flex items-center gap-2 text-sm text-text-light">
        <label class="whitespace-nowrap">Itens por página:</label>
        <select v-model.number="localPageSize" class="input py-1 pr-8">
          <option v-for="s in pageSizes" :key="s" :value="s">{{ s }}</option>
        </select>
      </div>
    </div>

    <div class="overflow-x-auto border border-border rounded-card bg-white">
      <table class="w-full text-sm">
        <thead>
          <tr class="bg-surface">
            <th
              v-for="col in columns"
              :key="col.key"
              scope="col"
              class="px-3 py-2 text-[13px] font-medium text-primary"
              :class="[
                col.sortable ? 'cursor-pointer select-none hover:bg-border/40' : '',
                col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left',
              ]"
              :style="col.width ? { width: col.width } : undefined"
              :aria-sort="sortKey === col.key ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'"
              @click="toggleSort(col)"
            >
              <span class="inline-flex items-center gap-1">
                {{ col.label }}
                <span v-if="col.sortable" class="text-xs opacity-70">
                  <template v-if="sortKey === col.key">{{ sortDir === 'asc' ? '▲' : '▼' }}</template>
                  <template v-else>↕</template>
                </span>
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          <template v-if="loading">
            <tr v-for="i in 5" :key="'sk' + i" class="border-t border-border">
              <td v-for="col in columns" :key="col.key" class="px-3 py-3">
                <div class="h-3 bg-border/60 rounded animate-pulse" />
              </td>
            </tr>
          </template>
          <template v-else-if="paged.length === 0">
            <tr>
              <td :colspan="columns.length" class="px-3 py-8 text-center text-text-light">
                <slot name="empty">Nenhum registro encontrado.</slot>
              </td>
            </tr>
          </template>
          <template v-else>
            <tr
              v-for="(row, i) in paged"
              :key="keyFor(row, i)"
              class="border-t border-border hover:bg-surface odd:bg-white even:bg-bg"
            >
              <td
                v-for="col in columns"
                :key="col.key"
                class="px-3 py-2 align-middle"
                :class="col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'"
              >
                <slot :name="`cell-${col.key}`" :row="row" :value="cellValue(row, col)">
                  {{ cellValue(row, col) ?? '' }}
                </slot>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-3 text-sm text-text-light">
      <div>
        Exibindo <strong class="text-text">{{ rangeStart }}</strong>–<strong class="text-text">{{ rangeEnd }}</strong>
        de <strong class="text-text">{{ sorted.length }}</strong> registros
      </div>
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="btn-secondary px-3 py-1 disabled:opacity-40 disabled:cursor-not-allowed"
          :disabled="currentPage <= 1"
          @click="prev"
        >Anterior</button>
        <span class="text-xs">Página {{ currentPage }} de {{ totalPages }}</span>
        <button
          type="button"
          class="btn-secondary px-3 py-1 disabled:opacity-40 disabled:cursor-not-allowed"
          :disabled="currentPage >= totalPages"
          @click="next"
        >Próximo</button>
      </div>
    </div>
  </div>
</template>
