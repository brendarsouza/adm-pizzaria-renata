<script setup lang="ts" generic="T extends { id: string; active?: boolean }">
import { computed, ref } from 'vue'
import type { DataTableColumn } from '~/components/shared/BaseDataTable.vue'
import type { CrudField } from '~/composables/useCrudForm'
import { useCrudForm } from '~/composables/useCrudForm'
import { useCsvExport, type CsvExportColumn } from '~/composables/useCsvExport'

export type CrudColumn<R = any> = DataTableColumn<R>
type ActiveFilter = 'all' | 'active' | 'inactive'

interface Props {
  title: string
  entityLabel?: string // ex: "pizza", "lanche" (usado nos botões/títulos de modal)
  columns: CrudColumn<T>[]
  fields: CrudField[]
  data: T[]
  loading?: boolean
  statusFilter?: boolean
  searchPlaceholder?: string
  pageSize?: number
  exportFileName?: string
  exportEnabled?: boolean
  modalSize?: 'sm' | 'md' | 'lg' | 'xl'
  /** Oculta a coluna de ações padrão */
  hideActions?: boolean
  onCreate?: (payload: any) => Promise<void> | void
  onUpdate?: (id: string, payload: any) => Promise<void> | void
  onToggleActive?: (item: T) => Promise<void> | void
  onDelete?: (id: string) => Promise<void> | void
}

const props = withDefaults(defineProps<Props>(), {
  entityLabel: 'registro',
  loading: false,
  statusFilter: false,
  searchPlaceholder: 'Buscar…',
  pageSize: 15,
  exportEnabled: true,
  modalSize: 'lg',
  hideActions: false,
})

const emit = defineEmits<{ (e: 'refresh'): void }>()

// ========== Filtros ==========
const statusValue = ref<ActiveFilter>('all')
const filteredData = computed<T[]>(() => {
  if (!props.statusFilter || statusValue.value === 'all') return props.data
  if (statusValue.value === 'active') return props.data.filter(r => r.active !== false)
  return props.data.filter(r => r.active === false)
})

// ========== Colunas efetivas (inclui coluna de ações se necessário) ==========
const effectiveColumns = computed<CrudColumn<T>[]>(() => {
  if (props.hideActions) return props.columns
  return [
    ...props.columns,
    { key: '__actions', label: '', sortable: false, align: 'right', width: '160px' },
  ]
})

// ========== Modal / Form ==========
const { exportToCsv } = useCsvExport()
const { form, errors, isEditing, editingId, saving, reset, load, validate, toPayload } = useCrudForm(props.fields)
const showModal = ref(false)

function openCreate() {
  reset()
  showModal.value = true
}
function openEdit(item: T) {
  load(item as any)
  showModal.value = true
}
function closeModal() {
  showModal.value = false
}

async function save() {
  if (!validate()) return
  saving.value = true
  try {
    const payload = toPayload()
    if (isEditing.value && editingId.value) {
      await props.onUpdate?.(editingId.value, payload)
    } else {
      await props.onCreate?.(payload)
    }
    showModal.value = false
    emit('refresh')
  } finally {
    saving.value = false
  }
}

async function toggleActive(item: T) {
  if (!props.onToggleActive) return
  await props.onToggleActive(item)
  emit('refresh')
}

async function remove(item: T) {
  if (!props.onDelete) return
  if (!window.confirm(`Excluir este ${props.entityLabel}?`)) return
  await props.onDelete(item.id)
  emit('refresh')
}

// ========== Exportação ==========
function handleExport() {
  const csvColumns: CsvExportColumn<T>[] = props.columns.map(c => ({
    key: c.key,
    label: c.label,
    accessor: c.accessor as any,
  }))
  exportToCsv(filteredData.value, csvColumns, props.exportFileName || props.title.toLowerCase())
}

// Expose p/ páginas consumidoras (se necessário futuramente)
defineExpose({ openCreate, openEdit, closeModal })

// Visibilidade de campo (show())
function isFieldVisible(f: CrudField) {
  return !f.show || f.show(form)
}

// Mapa estático de col-span para o Tailwind JIT detectar as classes
const COL_SPAN_CLASSES: Record<number, string> = {
  1: 'col-span-1', 2: 'col-span-2', 3: 'col-span-3', 4: 'col-span-4',
  5: 'col-span-5', 6: 'col-span-6', 7: 'col-span-7', 8: 'col-span-8',
  9: 'col-span-9', 10: 'col-span-10', 11: 'col-span-11', 12: 'col-span-12',
}
function colSpanClass(n?: number) { return COL_SPAN_CLASSES[n || 12] || 'col-span-12' }
</script>

<template>
  <section>
    <!-- Toolbar -->
    <div class="flex justify-between items-center mb-3 flex-wrap gap-2">
      <div class="flex items-center gap-3 flex-wrap">
        <div v-if="statusFilter" class="flex gap-1">
          <button
            v-for="f in [['all','Todos'],['active','Ativos'],['inactive','Inativos']] as const"
            :key="f[0]"
            :class="['px-3 py-1 text-xs rounded-btn border', statusValue === f[0] ? 'bg-primary text-white border-primary' : 'bg-white border-border text-text-light']"
            @click="statusValue = f[0]"
          >{{ f[1] }}</button>
        </div>
        <p class="text-xs text-text-light">
          {{ filteredData.length }} de {{ data.length }}
        </p>
      </div>
      <div class="flex items-center gap-2">
        <button
          v-if="exportEnabled"
          class="btn-secondary text-xs"
          type="button"
          @click="handleExport"
        >⬇ Exportar CSV</button>
        <button
          v-if="onCreate"
          class="btn-primary"
          type="button"
          @click="openCreate"
        >+ Novo {{ entityLabel }}</button>
      </div>
    </div>

    <!-- Tabela -->
    <BaseDataTable
      :columns="effectiveColumns"
      :data="filteredData"
      :loading="loading"
      :page-size="pageSize"
      :search-placeholder="searchPlaceholder"
      :row-key="(r) => (r as T).id"
    >
      <!-- Repassa todos os slots cell-* para o consumidor -->
      <template
        v-for="col in columns"
        #[`cell-${col.key}`]="slotProps"
        :key="col.key"
      >
        <slot :name="`cell-${col.key}`" v-bind="slotProps">
          {{ slotProps.value ?? '' }}
        </slot>
      </template>

      <!-- Coluna de ações padrão -->
      <template v-if="!hideActions" #cell-__actions="{ row }">
        <div class="flex gap-1 justify-end">
          <button
            v-if="onToggleActive"
            class="btn-ghost text-xs"
            :title="(row as T).active ? 'Desativar' : 'Ativar'"
            @click="toggleActive(row as T)"
          >{{ (row as T).active ? '🟢' : '🔴' }}</button>
          <button
            v-if="onUpdate"
            class="btn-ghost text-xs"
            @click="openEdit(row as T)"
          >✏️ Editar</button>
          <button
            v-if="onDelete"
            class="btn-ghost text-xs text-status-cancelled"
            @click="remove(row as T)"
          >🗑</button>
        </div>
      </template>

      <template #empty>
        <slot name="empty">Nenhum {{ entityLabel }} encontrado.</slot>
      </template>
    </BaseDataTable>

    <!-- Modal de cadastro/edição -->
    <BaseModal
      v-if="showModal"
      :title="(isEditing ? 'Editar ' : 'Novo ') + entityLabel"
      :size="modalSize"
      @close="closeModal"
    >
      <form class="space-y-4" @submit.prevent="save">
        <div class="grid grid-cols-12 gap-3">
          <div
            v-for="f in fields"
            v-show="isFieldVisible(f)"
            :key="f.key"
            :class="colSpanClass(f.colSpan)"
          >
            <BaseCrudField
              :field="f"
              :model-value="form[f.key]"
              :error="errors[f.key]"
              :form="form"
              @update:model-value="form[f.key] = $event"
            />
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <button type="button" class="btn-secondary" @click="closeModal">Cancelar</button>
          <button type="submit" class="btn-primary" :disabled="saving">
            {{ saving ? 'Salvando…' : 'Salvar' }}
          </button>
        </div>
      </form>
    </BaseModal>
  </section>
</template>
