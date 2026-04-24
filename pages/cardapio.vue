<script setup lang="ts">
import type { PizzaFlavor, PizzaAdditional, SnackProduct, BeverageProduct } from '~/types'
import type { CrudColumn } from '~/components/shared/BaseCrudTable.vue'
import type { CrudField } from '~/composables/useCrudForm'

const menu = useMenuStore()
onMounted(() => menu.loadAll())

const tab = ref<'flavors' | 'additionals' | 'snacks' | 'beverages' | 'import'>('flavors')

function seq(i: number) { return String(i + 1).padStart(3, '0') }

// ============ Dados ordenados ============
const sortedFlavors = computed(() => [...menu.flavors].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')))
const sortedSnacks = computed(() => [...menu.snacks].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')))
const sortedBeverages = computed(() => [...menu.beverages].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')))
const sortedAdditionals = computed(() => [...menu.pizzaAdditionals].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')))

// ============ PIZZAS (flavors) ============
type PizzaRow = PizzaFlavor & { _display: string }
const flavorRows = computed<PizzaRow[]>(() =>
  sortedFlavors.value.map((f, i) => ({ ...f, _display: f.productNumber || seq(i) }))
)
const flavorColumns: CrudColumn<PizzaRow>[] = [
  { key: 'productNumber', label: 'Nº', sortable: true, width: '80px', accessor: (r) => r._display },
  { key: 'name', label: 'Nome', sortable: true, accessor: (r) => r.name },
  { key: 'category', label: 'Tipo', sortable: true, width: '100px', accessor: (r) => r.category },
  { key: 'BROTO', label: 'Broto', sortable: true, align: 'right', width: '90px', accessor: (r) => r.priceBySize.BROTO ?? 0 },
  { key: 'MEDIA', label: 'Média', sortable: true, align: 'right', width: '90px', accessor: (r) => r.priceBySize.MEDIA ?? 0 },
  { key: 'GRANDE', label: 'Grande', sortable: true, align: 'right', width: '90px', accessor: (r) => r.priceBySize.GRANDE ?? 0 },
  { key: 'FAMILIA', label: 'Família', sortable: true, align: 'right', width: '90px', accessor: (r) => r.priceBySize.FAMILIA ?? 0 },
  { key: 'active', label: 'Status', sortable: true, width: '110px', accessor: (r) => r.active ? 1 : 0 },
]
const flavorFields: CrudField[] = [
  { key: 'productNumber', label: 'Nº', type: 'product-number', colSpan: 3,
    toForm: (i) => i.productNumber || '',
    fromForm: (v) => (v as string).trim() || undefined },
  { key: 'name', label: 'Nome', type: 'text', required: true, colSpan: 9 },
  { key: 'category', label: 'Tipo', type: 'select', required: true, colSpan: 6,
    defaultValue: 'salgada',
    options: [{ label: 'Salgada', value: 'salgada' }, { label: 'Doce', value: 'doce' }] },
  { key: 'active', label: 'Ativo', type: 'checkbox', colSpan: 6, defaultValue: true },
  { key: 'description', label: 'Descrição', type: 'text' },
  { key: 'ingredients', label: 'Ingredientes (separados por vírgula)', type: 'csv-list',
    toForm: (i) => (i.ingredients || []).join(', '),
    fromForm: (v) => String(v || '').split(',').map(s => s.trim()).filter(Boolean) },
  { key: 'priceBySize', label: 'Preços por tamanho', type: 'price-by-size' },
]
async function toggleFlavor(f: PizzaFlavor) { await menu.updateFlavor(f.id, { active: !f.active }) }

// ============ ADICIONAIS DE PIZZA ============
const additionalColumns: CrudColumn<PizzaAdditional>[] = [
  { key: 'name', label: 'Nome', sortable: true, accessor: (r) => r.name },
  { key: 'priceWhole', label: 'Pizza inteira', sortable: true, align: 'right', width: '140px', accessor: (r) => r.priceWhole },
  { key: 'priceHalf', label: 'Meia pizza', sortable: true, align: 'right', width: '140px', accessor: (r) => r.priceHalf },
  { key: 'active', label: 'Status', sortable: true, width: '110px', accessor: (r) => r.active ? 1 : 0 },
]
const additionalFields: CrudField[] = [
  { key: 'name', label: 'Nome', type: 'text', required: true },
  { key: 'priceWhole', label: 'Preço pizza inteira', type: 'money', colSpan: 6 },
  { key: 'priceHalf', label: 'Preço meia pizza', type: 'money', colSpan: 6 },
  { key: 'active', label: 'Ativo', type: 'checkbox', defaultValue: true },
]
async function toggleAdditional(a: PizzaAdditional) { await menu.updatePizzaAdditional(a.id, { active: !a.active }) }

// ============ LANCHES ============
type SnackRow = SnackProduct & { _display: string }
const snackRows = computed<SnackRow[]>(() =>
  sortedSnacks.value.map((s, i) => ({ ...s, _display: s.productNumber || seq(i) }))
)
const snackColumns: CrudColumn<SnackRow>[] = [
  { key: 'productNumber', label: 'Nº', sortable: true, width: '80px', accessor: (r) => r._display },
  { key: 'name', label: 'Nome', sortable: true, accessor: (r) => r.name },
  { key: 'kind', label: 'Tipo', sortable: true, width: '120px', accessor: (r) => r.kind },
  { key: 'price', label: 'Preço', sortable: true, align: 'right', width: '120px', accessor: (r) => r.price },
  { key: 'active', label: 'Status', sortable: true, width: '110px', accessor: (r) => r.active ? 1 : 0 },
]
const snackFields: CrudField[] = [
  { key: 'productNumber', label: 'Nº', type: 'product-number', colSpan: 3,
    toForm: (i) => i.productNumber || '',
    fromForm: (v) => (v as string).trim() || undefined },
  { key: 'name', label: 'Nome', type: 'text', required: true, colSpan: 9 },
  { key: 'kind', label: 'Tipo', type: 'select', required: true, colSpan: 6, defaultValue: 'lanche',
    options: [
      { label: 'Lanche', value: 'lanche' },
      { label: 'Beirute', value: 'beirute' },
      { label: 'Porção', value: 'porcao' },
    ] },
  { key: 'price', label: 'Preço', type: 'money', required: true, colSpan: 3 },
  { key: 'active', label: 'Ativo', type: 'checkbox', colSpan: 3, defaultValue: true },
  { key: 'description', label: 'Ingredientes / descrição', type: 'text' },
  { key: 'allowedAdditionals', label: '', type: 'text',
    show: () => false, defaultValue: [], toForm: (i) => i.allowedAdditionals || [],
    fromForm: (v) => v || [] },
]
async function toggleSnack(s: SnackProduct) { await menu.updateSnack(s.id, { active: !s.active }) }

// ============ BEBIDAS ============
const beverageColumns: CrudColumn<BeverageProduct>[] = [
  { key: 'name', label: 'Nome', sortable: true, accessor: (r) => r.name },
  { key: 'kind', label: 'Tipo', sortable: true, width: '140px', accessor: (r) => r.kind },
  { key: 'variants', label: 'Variantes', sortable: false,
    accessor: (r) => r.variants.map(v => `${v.label} - ${v.price}`).join(' | ') },
  { key: 'active', label: 'Status', sortable: true, width: '110px', accessor: (r) => r.active ? 1 : 0 },
]
const beverageFields: CrudField[] = [
  { key: 'name', label: 'Nome', type: 'text', required: true, colSpan: 8 },
  { key: 'kind', label: 'Tipo', type: 'select', required: true, colSpan: 4, defaultValue: 'refrigerante',
    options: [
      { label: 'Refrigerante', value: 'refrigerante' },
      { label: 'Suco', value: 'suco' },
    ] },
  { key: 'variants', label: 'Tamanhos / variantes', type: 'variants',
    placeholder: 'ex: Lata, 600ml, 2L',
    fromForm: (v: Array<{ label: string; price: number }>) =>
      (v || []).filter(x => x.label.trim() && x.price >= 0),
    validate: (v: Array<{ label: string; price: number }>) =>
      (v || []).filter(x => x.label.trim()).length === 0 ? 'Adicione ao menos uma variante' : undefined },
  { key: 'active', label: 'Ativo', type: 'checkbox', defaultValue: true },
]
async function toggleBeverage(b: BeverageProduct) { await menu.updateBeverage(b.id, { active: !b.active }) }
</script>

<template>
  <div>
    <header class="mb-6 flex items-center justify-between">
      <div>
        <h1>Cardápio</h1>
        <p class="text-text-light mt-1">Gerencie sabores, adicionais, lanches e bebidas</p>
      </div>
    </header>

    <nav class="flex gap-2 mb-6 border-b border-border">
      <button v-for="t in [['flavors','Pizzas'],['additionals','Adicionais'],['snacks','Lanches'],['beverages','Bebidas'],['import','Importar CSV']]"
              :key="t[0]"
              :class="['px-4 py-2 text-sm font-medium -mb-px border-b-2', tab === t[0] ? 'border-primary text-primary' : 'border-transparent text-text-light hover:text-text']"
              @click="tab = t[0] as typeof tab">
        {{ t[1] }}
      </button>
    </nav>

    <!-- Pizzas -->
    <BaseCrudTable
      v-if="tab === 'flavors'"
      title="Pizzas"
      entity-label="pizza"
      :columns="flavorColumns"
      :fields="flavorFields"
      :data="flavorRows"
      :loading="menu.loading"
      status-filter
      search-placeholder="Filtrar pizzas…"
      export-file-name="pizzas"
      modal-size="xl"
      :on-create="menu.createFlavor"
      :on-update="menu.updateFlavor"
      :on-toggle-active="toggleFlavor"
    >
      <template #cell-productNumber="{ row }">
        <span
          class="font-mono text-xs"
          :class="(row as PizzaRow).productNumber ? 'text-primary' : 'text-text-light italic'"
        >{{ (row as PizzaRow)._display }}</span>
      </template>
      <template #cell-name="{ row }">
        <div class="font-medium">{{ (row as PizzaRow).name }}</div>
        <div class="text-xs text-text-light truncate max-w-[320px]">
          {{ (row as PizzaRow).ingredients.join(', ') }}
        </div>
      </template>
      <template #cell-category="{ row }">
        <span class="badge" :class="(row as PizzaRow).category === 'doce' ? 'bg-accent/10 text-accent' : 'bg-primary/10 text-primary'">
          {{ (row as PizzaRow).category }}
        </span>
      </template>
      <template #cell-BROTO="{ row }">{{ formatBRL((row as PizzaRow).priceBySize.BROTO || 0) }}</template>
      <template #cell-MEDIA="{ row }">{{ formatBRL((row as PizzaRow).priceBySize.MEDIA || 0) }}</template>
      <template #cell-GRANDE="{ row }">{{ formatBRL((row as PizzaRow).priceBySize.GRANDE || 0) }}</template>
      <template #cell-FAMILIA="{ row }">{{ formatBRL((row as PizzaRow).priceBySize.FAMILIA || 0) }}</template>
      <template #cell-active="{ row }">
        <span :class="(row as PizzaRow).active ? 'badge-delivered' : 'badge-cancelled'">
          {{ (row as PizzaRow).active ? 'Ativo' : 'Inativo' }}
        </span>
      </template>
      <template #empty>Nenhuma pizza encontrada.</template>
    </BaseCrudTable>

    <!-- Adicionais de pizza -->
    <BaseCrudTable
      v-if="tab === 'additionals'"
      title="Adicionais"
      entity-label="adicional"
      :columns="additionalColumns"
      :fields="additionalFields"
      :data="sortedAdditionals"
      :loading="menu.loading"
      status-filter
      search-placeholder="Filtrar adicionais…"
      export-file-name="adicionais"
      :on-create="menu.createPizzaAdditional"
      :on-update="menu.updatePizzaAdditional"
      :on-toggle-active="toggleAdditional"
    >
      <template #cell-priceWhole="{ row }">{{ formatBRL((row as PizzaAdditional).priceWhole) }}</template>
      <template #cell-priceHalf="{ row }">{{ formatBRL((row as PizzaAdditional).priceHalf) }}</template>
      <template #cell-active="{ row }">
        <span :class="(row as PizzaAdditional).active ? 'badge-delivered' : 'badge-cancelled'">
          {{ (row as PizzaAdditional).active ? 'Ativo' : 'Inativo' }}
        </span>
      </template>
      <template #empty>Nenhum adicional cadastrado.</template>
    </BaseCrudTable>

    <!-- Lanches -->
    <BaseCrudTable
      v-if="tab === 'snacks'"
      title="Lanches"
      entity-label="lanche"
      :columns="snackColumns"
      :fields="snackFields"
      :data="snackRows"
      :loading="menu.loading"
      status-filter
      search-placeholder="Filtrar lanches…"
      export-file-name="lanches"
      :on-create="menu.createSnack"
      :on-update="menu.updateSnack"
      :on-toggle-active="toggleSnack"
    >
      <template #cell-productNumber="{ row }">
        <span
          class="font-mono text-xs"
          :class="(row as SnackRow).productNumber ? 'text-primary' : 'text-text-light italic'"
        >{{ (row as SnackRow)._display }}</span>
      </template>
      <template #cell-name="{ row }">
        <div class="font-medium">{{ (row as SnackRow).name }}</div>
        <div v-if="(row as SnackRow).description" class="text-xs text-text-light truncate max-w-[320px]">
          {{ (row as SnackRow).description }}
        </div>
      </template>
      <template #cell-kind="{ row }">
        <span class="badge bg-primary/10 text-primary capitalize text-[10px]">{{ (row as SnackRow).kind }}</span>
      </template>
      <template #cell-price="{ row }">{{ formatBRL((row as SnackRow).price) }}</template>
      <template #cell-active="{ row }">
        <span :class="(row as SnackRow).active ? 'badge-delivered' : 'badge-cancelled'">
          {{ (row as SnackRow).active ? 'Ativo' : 'Inativo' }}
        </span>
      </template>
      <template #empty>Nenhum lanche encontrado.</template>
    </BaseCrudTable>

    <!-- Bebidas -->
    <BaseCrudTable
      v-if="tab === 'beverages'"
      title="Bebidas"
      entity-label="bebida"
      :columns="beverageColumns"
      :fields="beverageFields"
      :data="sortedBeverages"
      :loading="menu.loading"
      status-filter
      search-placeholder="Filtrar bebidas…"
      export-file-name="bebidas"
      :on-create="menu.createBeverage"
      :on-update="menu.updateBeverage"
      :on-toggle-active="toggleBeverage"
    >
      <template #cell-kind="{ row }">
        <span class="badge bg-accent/10 text-accent capitalize text-[10px]">{{ (row as BeverageProduct).kind }}</span>
      </template>
      <template #cell-variants="{ row }">
        <div class="text-xs text-text-light">
          <span v-for="v in (row as BeverageProduct).variants" :key="v.label" class="mr-2">
            {{ v.label }} — <span class="font-mono">{{ formatBRL(v.price) }}</span>
          </span>
        </div>
      </template>
      <template #cell-active="{ row }">
        <span :class="(row as BeverageProduct).active ? 'badge-delivered' : 'badge-cancelled'">
          {{ (row as BeverageProduct).active ? 'Ativo' : 'Inativo' }}
        </span>
      </template>
      <template #empty>Nenhuma bebida encontrada.</template>
    </BaseCrudTable>

    <!-- Importação CSV -->
    <section v-if="tab === 'import'">
      <div class="card mb-4 bg-accent/5 border-accent/20">
        <h3 class="font-serif text-lg mb-2">Importação em massa via CSV</h3>
        <p class="text-sm text-text-light mb-3">
          Use esta ferramenta para popular o cardápio a partir dos arquivos CSV da Pizzaria Renata.
          Importe um arquivo por vez na ordem sugerida:
        </p>
        <ol class="text-xs text-text-light ml-5 list-decimal space-y-0.5">
          <li><code>pizzas_tradicionais.csv</code> → sabores salgados</li>
          <li><code>pizzas_promocao.csv</code> → sabores em promoção</li>
          <li><code>pizzas_doces.csv</code> → sabores doces</li>
          <li><code>lanches_tradicionais.csv</code> e <code>lanches_especiais.csv</code></li>
          <li><code>beirutes.csv</code>, <code>fritas.csv</code>, <code>bebidas.csv</code></li>
        </ol>
        <p class="text-xs text-text-light mt-3">
          ℹ️ Pizzas importadas terão apenas o preço <strong>Grande</strong> preenchido.
          Edite cada sabor para definir preços de Broto, Média e Família.
        </p>
      </div>
      <MenuCSVImporter />
    </section>
  </div>
</template>
