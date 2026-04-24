<script setup lang="ts">
import type { Customer, Address, RoadType, CustomerPhone } from '~/types'
import type { DataTableColumn } from '~/components/shared/BaseDataTable.vue'
const customerStore = useCustomerStore()

function genPhoneId(): string {
  return `ph_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

const customerColumns: DataTableColumn<Customer>[] = [
  { key: 'name', label: 'Nome', sortable: true, accessor: (c) => c.name },
  { key: 'phone', label: 'Telefone', sortable: true, accessor: (c) => c.phone },
  { key: 'addresses', label: 'Endereços', sortable: true, accessor: (c) => c.addresses?.length || 0, align: 'center', width: '120px' },
  { key: 'actions', label: '', sortable: false, align: 'right', width: '140px' },
]
const query = ref('')

// Busca inteligente: nome, telefone OU endereço (>= 3 chars).
watchDebounced(query, async (q) => {
  if (q && q.trim().length >= 3) await customerStore.searchSmart(q)
  else await customerStore.loadRecent()
}, { debounce: 300, immediate: true })

const showForm = ref(false)
const editing = ref<Customer | null>(null)
const form = reactive<{ name: string; phones: CustomerPhone[] }>({
  name: '',
  phones: [{ id: genPhoneId(), number: '', label: '', isPrimary: true }],
})

function openNew() {
  editing.value = null
  // Pré-preenche se o usuário já digitou algo compatível
  const hasLetters = /[a-zA-Z\u00C0-\u024F]/.test(query.value)
  form.name = hasLetters ? query.value : ''
  form.phones = [{
    id: genPhoneId(),
    number: hasLetters ? '' : query.value.replace(/\D/g, ''),
    label: '',
    isPrimary: true,
  }]
  showForm.value = true
}
async function saveCustomer() {
  const primary = form.phones.find(p => p.isPrimary) ?? form.phones[0]
  if (!primary || !primary.number) return
  const c = await customerStore.getOrCreateByPhone(form.name, primary.number)
  const updates: Partial<Customer> = {}
  if (editing.value) updates.name = form.name
  if (form.phones.length > 0) updates.phones = form.phones.map(p => ({ ...p }))
  if (Object.keys(updates).length) await customerStore.update(c.id, updates)
  showForm.value = false
  await customerStore.loadRecent()
}

// Address form (for detail modal)
const detail = ref<Customer | null>(null)
const showAddrForm = ref(false)
function emptyAddrForm(): Omit<Address, 'id' | 'createdAt'> {
  return {
    alias: '', street: '', number: '', complement: '',
    district: '', locality: '', state: '', cep: '',
    reference: '', roadType: 'asfalto' as RoadType,
    addressNotes: '',
  }
}
const addrForm = ref<Omit<Address, 'id' | 'createdAt'>>(emptyAddrForm())

async function openDetail(c: Customer) {
  const { db } = useFirebase()
  const repo = new (await import('~/infrastructure/firebase/repositories')).CustomerRepo(db)
  const fresh = await repo.get(c.id)
  detail.value = fresh || c
  customerStore.setCurrent(detail.value)
}
function resetAddr() { addrForm.value = emptyAddrForm() }
async function saveAddr() {
  if (!detail.value) return
  if (!addrForm.value.alias?.trim()) return // alias é obrigatório
  await customerStore.addAddress(detail.value.id, { ...addrForm.value })
  detail.value = customerStore.current
  showAddrForm.value = false
  resetAddr()
}

function getAddressNotes(a: Address): string {
  return a.addressNotes || a.accessNotes || ''
}
function getGPSDisplay(a: Address): string | null {
  if (a.latitude != null && a.longitude != null) return `${a.latitude.toFixed(5)}, ${a.longitude.toFixed(5)}`
  if (a.gps) return `${a.gps.latitude.toFixed(5)}, ${a.gps.longitude.toFixed(5)}`
  return null
}

function formatPhone(p: string) {
  if (p.length === 11) return `(${p.slice(0,2)}) ${p.slice(2,7)}-${p.slice(7)}`
  if (p.length === 10) return `(${p.slice(0,2)}) ${p.slice(2,6)}-${p.slice(6)}`
  return p
}

const list = computed(() => query.value ? customerStore.searchResults : customerStore.recent)
</script>

<template>
  <div>
    <header class="mb-6 flex items-center justify-between">
      <div>
        <h1>Clientes</h1>
        <p class="text-text-light mt-1">Busca por telefone · cadastros com múltiplos endereços (zona rural)</p>
      </div>
      <button class="btn-primary" @click="openNew">+ Novo cliente</button>
    </header>

    <div class="card mb-4">
      <input
        v-model="query"
        class="input"
        type="search"
        placeholder="Buscar por nome, telefone ou endereço (mín. 3 caracteres)"
        aria-label="Buscar cliente"
      />
      <p class="text-xs text-text-light mt-2">
        Busca por substring em nome, telefone, logradouro, bairro, referência ou observações de acesso.
      </p>
    </div>

    <BaseDataTable
      :columns="customerColumns"
      :data="list"
      :page-size="15"
      :searchable="false"
      search-placeholder="Filtrar na página…"
      :row-key="(c) => c.id"
    >
      <template #cell-name="{ row }">
        <button class="font-medium text-left hover:text-primary" @click="openDetail(row as Customer)">
          {{ (row as Customer).name }}
        </button>
      </template>
      <template #cell-phone="{ row }">
        <span class="font-mono">{{ formatPhone((row as Customer).phone) }}</span>
      </template>
      <template #cell-addresses="{ row }">
        {{ (row as Customer).addresses?.length || 0 }}
      </template>
      <template #cell-actions="{ row }">
        <button class="btn-ghost" @click="openDetail(row as Customer)">Detalhes →</button>
      </template>
      <template #empty>
        {{ query ? 'Nenhum cliente encontrado.' : 'Nenhum cliente cadastrado ainda.' }}
      </template>
    </BaseDataTable>

    <!-- Modal novo cliente -->
    <BaseModal v-if="showForm" title="Novo cliente" size="lg" @close="showForm = false">
      <form class="space-y-4" @submit.prevent="saveCustomer">
        <div><label class="label">Nome completo</label><input v-model="form.name" class="input" required /></div>
        <div>
          <label class="label">Telefones</label>
          <PhoneListEditor v-model="form.phones" />
        </div>
        <div class="flex justify-end gap-2">
          <button type="button" class="btn-secondary" @click="showForm = false">Cancelar</button>
          <button type="submit" class="btn-primary">Salvar</button>
        </div>
      </form>
    </BaseModal>

    <!-- Modal detalhe -->
    <BaseModal v-if="detail" :title="detail.name" size="lg" @close="detail = null">
      <section class="mb-6">
        <h4 class="font-serif text-lg mb-2">Telefones</h4>
        <ul v-if="detail.phones && detail.phones.length" class="text-sm space-y-1">
          <li v-for="p in detail.phones" :key="p.id" class="flex items-center gap-2">
            <span v-if="p.isPrimary" class="text-primary" aria-label="Principal">★</span>
            <span class="font-mono">{{ formatPhone(p.number) }}</span>
            <span v-if="p.label" class="text-xs text-text-light">· {{ p.label }}</span>
          </li>
        </ul>
        <div v-else class="text-sm font-mono text-text-light">{{ formatPhone(detail.phone) }}</div>
      </section>

      <div class="flex items-center justify-between mb-3">
        <h4 class="font-serif text-lg">Endereços</h4>
        <button class="btn-primary text-xs" @click="resetAddr(); showAddrForm = true">+ Adicionar</button>
      </div>
      <div v-if="detail.addresses?.length === 0" class="text-text-light text-sm py-4">Nenhum endereço cadastrado.</div>
      <ul v-else class="space-y-2">
        <li v-for="a in detail.addresses" :key="a.id" class="surface !p-4">
          <div v-if="a.alias" class="text-sm font-semibold text-primary mb-1">🏷 {{ a.alias }}</div>
          <div class="font-medium">{{ a.street }}, {{ a.number }} <span v-if="a.complement">· {{ a.complement }}</span></div>
          <div class="text-sm text-text-light">{{ a.district }}<span v-if="a.locality">, {{ a.locality }}</span><span v-if="a.state"> - {{ a.state }}</span></div>
          <div v-if="a.cep" class="text-xs text-text-light">CEP: {{ a.cep }}</div>
          <div v-if="a.reference" class="text-xs mt-1">📍 Ref: {{ a.reference }}</div>
          <div class="text-xs text-text-light mt-1">Via: {{ a.roadType === 'estrada_terra' ? 'Estrada de terra' : a.roadType }}</div>
          <div v-if="getGPSDisplay(a)" class="text-xs mt-1 font-mono">GPS: {{ getGPSDisplay(a) }}</div>
          <div v-if="getAddressNotes(a)" class="text-xs mt-1">ℹ️ {{ getAddressNotes(a) }}</div>
        </li>
      </ul>

      <BaseModal v-if="showAddrForm" title="Novo endereço" size="lg" @close="showAddrForm = false">
        <form class="space-y-3" @submit.prevent="saveAddr">
          <AddressForm v-model="addrForm" />
          <div class="flex justify-end gap-2">
            <button type="button" class="btn-secondary" @click="showAddrForm = false">Cancelar</button>
            <button type="submit" class="btn-primary" :disabled="!addrForm.alias?.trim()">Salvar endereço</button>
          </div>
        </form>
      </BaseModal>
    </BaseModal>
  </div>
</template>
