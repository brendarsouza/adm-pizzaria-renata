<script setup lang="ts">
import type {
  OrderItem, OrderPizzaItem, OrderSnackItem, OrderBeverageItem,
  Customer, Address, Payment, CardBrand, PaymentMethod,
} from '~/types'
import { calcularPrecoPizzaUnit } from '~/domain/rules/pizzaPricer'
import { calcularPrecoSnack, calcularPrecoBeverage, calcularTroco } from '~/domain/rules/orderCalculator'
import { Money } from '~/domain/value-objects/Money'

const auth = useAuthStore()
const menu = useMenuStore()
const customer = useCustomerStore()
const order = useOrderStore()

onMounted(() => {
  menu.loadAll()
  customer.loadRecent()
})

// ============== Step 1: Cliente ==============
const showNewCustomer = ref(false)
const newCustomer = reactive({ name: '', phone: '' })

async function selectCustomer(c: Customer) {
  order.setCustomer(c)
  if (c.addresses.length === 1) order.setAddress(c.addresses[0]!)
}
function openCreateFromSearch(termInicial: string) {
  // Se o termo parece telefone (só dígitos/pontuação), pré-preenche telefone
  const hasLetters = /[a-zA-Z\u00C0-\u024F]/.test(termInicial)
  if (hasLetters) { newCustomer.name = termInicial; newCustomer.phone = '' }
  else { newCustomer.phone = termInicial; newCustomer.name = '' }
  showNewCustomer.value = true
}
async function createCustomerInline() {
  const c = await customer.getOrCreateByPhone(newCustomer.name, newCustomer.phone)
  await selectCustomer(c)
  showNewCustomer.value = false
  newCustomer.name = ''; newCustomer.phone = ''
}

// ============== Step 2: Endereço ==============
const showNewAddress = ref(false)
function emptyAddrForm(): Omit<Address, 'id' | 'createdAt'> {
  return {
    alias: '', street: '', number: '', complement: '',
    district: '', locality: '', state: '', cep: '',
    reference: '', roadType: 'asfalto', addressNotes: '',
  }
}
const newAddrForm = ref<Omit<Address, 'id' | 'createdAt'>>(emptyAddrForm())
async function saveNewAddress() {
  if (!order.draft.customer) return
  if (!newAddrForm.value.alias?.trim()) return
  const addr = await customer.addAddress(order.draft.customer.id, { ...newAddrForm.value })
  order.setAddress(addr)
  if (customer.current) order.setCustomer(customer.current)
  showNewAddress.value = false
  newAddrForm.value = emptyAddrForm()
}

// ============== Step 3: Itens ==============
const showPizza = ref(false)
const initialPizzaFlavorId = ref<string>('')
function onPizzaAdded(item: OrderPizzaItem) { order.addItem(item); showPizza.value = false; initialPizzaFlavorId.value = '' }

// ProductSearchInput — entradas unificadas de pizzas + lanches/beirutes
type ProductEntry = {
  kind: 'pizza' | 'snack'
  product: { id: string; productNumber?: string; name: string }
  number: string
  categoryLabel: string
}
const productEntries = computed<ProductEntry[]>(() => {
  const flavors = menu.activeFlavors.map((f, i) => ({
    kind: 'pizza' as const,
    product: { id: f.id, productNumber: f.productNumber, name: f.name },
    number: f.productNumber || String(i + 1).padStart(3, '0'),
    categoryLabel: 'Pizza',
  }))
  const snacks = menu.activeSnacks.map((s, i) => ({
    kind: 'snack' as const,
    product: { id: s.id, productNumber: s.productNumber, name: s.name },
    number: s.productNumber || String(i + 1).padStart(3, '0'),
    categoryLabel: s.kind === 'beirute' ? 'Beirute' : s.kind === 'porcao' ? 'Porção' : 'Lanche',
  }))
  return [...flavors, ...snacks]
})
function onProductSearchSelect(product: ProductEntry['product']) {
  const entry = productEntries.value.find(e => e.product.id === product.id)
  if (!entry) return
  if (entry.kind === 'pizza') {
    initialPizzaFlavorId.value = product.id
    showPizza.value = true
  } else {
    snackForm.productId = product.id
    showSnack.value = true
  }
}

const showSnack = ref(false)
const snackForm = reactive({ productId: '', quantity: 1, observation: '', removed: '' })
function addSnack() {
  const s = menu.snacks.find(x => x.id === snackForm.productId)
  if (!s) return
  const item: OrderSnackItem = {
    kind: 'snack', productId: s.id, name: s.name,
    unitPrice: s.price, additionals: [], observation: snackForm.observation || undefined,
    removedIngredients: snackForm.removed.split(',').map(x => x.trim()).filter(Boolean),
    quantity: snackForm.quantity,
  }
  order.addItem(item)
  snackForm.productId = ''; snackForm.quantity = 1; snackForm.observation = ''; snackForm.removed = ''
  showSnack.value = false
}

const showBev = ref(false)
const bevForm = reactive({ productId: '', variantLabel: '', quantity: 1 })
const selectedBev = computed(() => menu.beverages.find(b => b.id === bevForm.productId))
function addBev() {
  const b = selectedBev.value
  const v = b?.variants.find(x => x.label === bevForm.variantLabel)
  if (!b || !v) return
  order.addItem({
    kind: 'beverage', productId: b.id, name: b.name,
    variantLabel: v.label, unitPrice: v.price, quantity: bevForm.quantity,
  })
  bevForm.productId = ''; bevForm.variantLabel = ''; bevForm.quantity = 1
  showBev.value = false
}

function itemPrice(item: OrderItem): number {
  if (item.kind === 'pizza') return calcularPrecoPizzaUnit(item).toReais() * item.quantity
  if (item.kind === 'snack') return calcularPrecoSnack(item).toReais()
  return calcularPrecoBeverage(item).toReais()
}
function itemDescribe(item: OrderItem): string {
  if (item.kind === 'pizza') {
    const parts = [`Pizza ${item.size}`]
    parts.push(item.isHalfHalf ? `½ ${item.flavor1.name} / ½ ${item.flavor2?.name}` : item.flavor1.name)
    if (item.stuffedCrust) parts.push('borda recheada')
    if (item.additionals.length) parts.push(`+ ${item.additionals.map(a => a.name).join(', ')}`)
    return parts.join(' · ')
  }
  if (item.kind === 'snack') return `${item.name}`
  return `${item.name} (${item.variantLabel})`
}

// ============== Step 4: Pagamento ==============
const paymentMethod = ref<PaymentMethod | ''>('')
const pixProof = ref(false)
const needsChange = ref(false)
const cashGiven = ref<number | null>(null)
const cardBrand = ref<CardBrand>('VISA')
const cardType = ref<'credit' | 'debit'>('credit')

const totalMoney = computed(() => Money.fromReais(order.total))
const trocoCalc = computed(() => {
  if (paymentMethod.value !== 'CASH' || !needsChange.value || cashGiven.value === null) return null
  return calcularTroco(totalMoney.value, cashGiven.value)
})

watch([paymentMethod, pixProof, needsChange, cashGiven, cardBrand, cardType], () => {
  if (!paymentMethod.value) { order.setPayment(null); return }
  if (paymentMethod.value === 'PIX') {
    order.setPayment({ method: 'PIX', proofConfirmed: pixProof.value })
  } else if (paymentMethod.value === 'CASH') {
    order.setPayment({
      method: 'CASH',
      needsChange: needsChange.value,
      cashGiven: needsChange.value ? (cashGiven.value ?? undefined) : undefined,
      change: trocoCalc.value?.toReais(),
    })
  } else if (paymentMethod.value === 'CARD') {
    order.setPayment({ method: 'CARD', brand: cardBrand.value, debitOrCredit: cardType.value })
  }
})

// ============== Step 5: Finalizar ==============
const submitting = ref(false)
const errorMsg = ref('')
const showSummary = ref(false)

function openSummary() {
  errorMsg.value = ''
  if (!auth.user) { errorMsg.value = 'Faça login'; return }
  if (order.draft.items.length === 0) { errorMsg.value = 'Adicione ao menos um item'; return }
  if (!order.draft.payment) { errorMsg.value = 'Selecione forma de pagamento'; return }
  showSummary.value = true
}

async function finalizeOrder(print: boolean) {
  errorMsg.value = ''
  if (!auth.user) { errorMsg.value = 'Faça login'; return }
  submitting.value = true
  try {
    const id = await order.createOrder(auth.user.uid)
    showSummary.value = false
    if (print) {
      await navigateTo(`/pedidos/${id}/comanda`)
    } else {
      await navigateTo(`/pedidos-ativos/${id}`)
    }
  } catch (e: any) {
    errorMsg.value = e?.message || 'Erro ao finalizar pedido'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="max-w-6xl mx-auto">
    <header class="mb-6">
      <h1>Novo pedido (PDV)</h1>
      <p class="text-text-light mt-1">Monte o pedido em tela única</p>
    </header>

    <div class="grid lg:grid-cols-3 gap-6">
      <!-- Coluna principal -->
      <div class="lg:col-span-2 space-y-6">
        <!-- CLIENTE -->
        <section class="card">
          <h2 class="text-lg font-serif mb-4">1. Cliente</h2>
          <template v-if="!order.draft.customer">
            <CustomerSearch
              autofocus
              show-create-hint
              @select="selectCustomer"
              @create="openCreateFromSearch"
            />
            <p class="mt-2 text-xs text-text-light">
              Busca por nome, telefone ou endereço (mín. 3 caracteres). Use <kbd class="px-1 border rounded text-[10px]">↑↓</kbd> para navegar e <kbd class="px-1 border rounded text-[10px]">Enter</kbd> para selecionar.
            </p>
          </template>
          <template v-else>
            <div class="flex items-center justify-between">
              <div>
                <div class="font-medium">{{ order.draft.customer.name }}</div>
                <div class="text-xs text-text-light">{{ order.draft.customer.phone }}</div>
              </div>
              <button class="btn-ghost text-xs" @click="order.setCustomer(null)">Trocar</button>
            </div>
          </template>
        </section>

        <!-- ENDEREÇO -->
        <section v-if="order.draft.customer" class="card">
          <h2 class="text-lg font-serif mb-4">2. Endereço de entrega</h2>
          <div v-if="order.draft.customer.addresses.length" class="space-y-2">
            <label v-for="a in order.draft.customer.addresses" :key="a.id"
                   class="flex items-start gap-3 p-3 border rounded-btn cursor-pointer"
                   :class="order.draft.address?.id === a.id ? 'border-primary bg-primary/5' : 'border-border'">
              <input type="radio" :checked="order.draft.address?.id === a.id" @change="order.setAddress(a)" />
              <div class="flex-1 text-sm">
                <div v-if="a.alias" class="text-xs font-semibold text-primary">🏷 {{ a.alias }}</div>
                <div class="font-medium">{{ a.street }}, {{ a.number }} <span v-if="a.complement">· {{ a.complement }}</span></div>
                <div class="text-text-light">{{ a.district }}<span v-if="a.locality">, {{ a.locality }}</span></div>
                <div v-if="a.reference" class="text-xs">📍 {{ a.reference }}</div>
                <div v-if="a.addressNotes || a.accessNotes" class="text-xs">ℹ️ {{ a.addressNotes || a.accessNotes }}</div>
              </div>
            </label>
          </div>
          <button class="btn-secondary mt-3" @click="showNewAddress = true">+ Novo endereço</button>
        </section>

        <!-- ITENS -->
        <section v-if="order.draft.address" class="card">
          <h2 class="text-lg font-serif mb-4">3. Itens</h2>
          <div class="mb-3">
            <ProductSearchInput
              :entries="productEntries"
              placeholder="Número ou nome: ex. '001', 'portuguesa', 'x-burguer'…"
              @select="onProductSearchSelect"
            />
            <p class="text-[11px] text-text-light mt-1">
              Use <kbd class="px-1 border rounded text-[10px]">↑↓</kbd> para navegar,
              <kbd class="px-1 border rounded text-[10px]">Enter</kbd> seleciona.
            </p>
          </div>
          <div class="flex gap-2 flex-wrap mb-4">
            <button class="btn-primary" @click="initialPizzaFlavorId = ''; showPizza = true">+ Pizza</button>
            <button class="btn-secondary" @click="showSnack = true">+ Lanche/Beirute</button>
            <button class="btn-secondary" @click="showBev = true">+ Bebida</button>
          </div>
          <ul v-if="order.draft.items.length" class="divide-y divide-border/60">
            <li v-for="(it, i) in order.draft.items" :key="i" class="py-3 flex justify-between items-start gap-3">
              <div class="flex-1">
                <div class="font-medium flex items-center gap-2 flex-wrap">
                  <CategoryBadge :item="it" />
                  <span>{{ itemDescribe(it) }}</span>
                </div>
                <div class="text-xs text-text-light">Qtd: {{ it.quantity }}
                  <span v-if="it.kind === 'pizza' && it.observation"> · {{ it.observation }}</span>
                  <span v-if="it.kind === 'pizza' && it.removedIngredients.length"> · sem {{ it.removedIngredients.join(', ') }}</span>
                </div>
              </div>
              <div class="text-right">
                <div class="font-medium">{{ formatBRL(itemPrice(it)) }}</div>
                <button class="text-xs text-status-cancelled hover:underline" @click="order.removeItem(i)">Remover</button>
              </div>
            </li>
          </ul>
          <p v-else class="text-sm text-text-light py-4">Nenhum item adicionado.</p>
        </section>

        <!-- PAGAMENTO -->
        <section v-if="order.draft.items.length" class="card">
          <h2 class="text-lg font-serif mb-4">4. Pagamento</h2>
          <div class="grid grid-cols-3 gap-2 mb-4">
            <button v-for="m in [['PIX','PIX'],['CASH','Dinheiro'],['CARD','Cartão']]" :key="m[0]"
                    :class="['px-3 py-3 rounded-btn border text-sm', paymentMethod === m[0] ? 'bg-primary text-white border-primary' : 'bg-white border-border']"
                    @click="paymentMethod = m[0] as PaymentMethod">
              {{ m[1] }}
            </button>
          </div>
          <div v-if="paymentMethod === 'PIX'" class="flex items-center gap-2">
            <input id="pix" v-model="pixProof" type="checkbox" />
            <label for="pix" class="text-sm">Comprovante PIX confirmado</label>
          </div>
          <div v-if="paymentMethod === 'CASH'" class="space-y-3">
            <label class="flex items-center gap-2 text-sm"><input v-model="needsChange" type="checkbox" /> Precisa de troco?</label>
            <div v-if="needsChange" class="grid grid-cols-2 gap-3">
              <div>
                <label class="label">Valor que o cliente vai pagar</label>
                <input v-model.number="cashGiven" type="number" step="0.01" class="input" />
              </div>
              <div class="surface !p-3">
                <div class="text-xs text-text-light">Troco</div>
                <div class="font-serif text-xl text-primary">{{ trocoCalc ? trocoCalc.format() : '—' }}</div>
              </div>
            </div>
          </div>
          <div v-if="paymentMethod === 'CARD'" class="grid grid-cols-2 gap-3">
            <div>
              <label class="label">Bandeira</label>
              <select v-model="cardBrand" class="input">
                <option value="VISA">Visa</option><option value="MASTER">Mastercard</option>
                <option value="ELO">Elo</option><option value="HIPERCARD">Hipercard</option>
                <option value="AMEX">Amex</option><option value="OTHER">Outra</option>
              </select>
            </div>
            <div>
              <label class="label">Tipo</label>
              <select v-model="cardType" class="input">
                <option value="credit">Crédito</option>
                <option value="debit">Débito</option>
              </select>
            </div>
            <div class="col-span-2 text-xs text-text-light">⚠️ Vale-refeição NÃO é aceito.</div>
          </div>
        </section>

        <!-- ENTREGA -->
        <section v-if="paymentMethod" class="card">
          <h2 class="text-lg font-serif mb-4">5. Entrega</h2>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="label">Taxa de entrega (R$)</label>
              <input :value="order.draft.deliveryFee" type="number" step="0.01" class="input"
                     @input="e => order.setDeliveryFee(Number((e.target as HTMLInputElement).value) || 0)" />
            </div>
            <div>
              <label class="label">Estimativa de tempo (minutos)</label>
              <input :value="order.draft.estimateMinutes" type="number" class="input"
                     @input="e => order.setEstimateMinutes(Number((e.target as HTMLInputElement).value) || 0)" />
            </div>
          </div>
        </section>
      </div>

      <!-- Coluna resumo -->
      <aside class="lg:sticky lg:top-4 self-start">
        <div class="card">
          <h3 class="font-serif text-lg mb-4">Resumo</h3>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between"><span class="text-text-light">Subtotal</span><span>{{ formatBRL(order.itemsSubtotal) }}</span></div>
            <div class="flex justify-between"><span class="text-text-light">Entrega</span><span>{{ formatBRL(order.draft.deliveryFee) }}</span></div>
            <div class="flex justify-between pt-2 border-t border-border font-serif text-xl">
              <span>Total</span><span class="text-primary">{{ formatBRL(order.total) }}</span>
            </div>
          </div>
          <button
            class="btn-primary w-full mt-6"
            data-testid="btn-ver-resumo"
            :disabled="submitting || order.draft.items.length === 0 || !order.draft.payment"
            @click="openSummary"
          >
            Ver resumo e finalizar →
          </button>
          <p v-if="errorMsg" class="text-sm text-status-cancelled mt-3">{{ errorMsg }}</p>
          <button class="btn-ghost w-full mt-2 text-xs" @click="order.resetDraft()">Cancelar pedido</button>
        </div>
      </aside>
    </div>

    <OrderSummaryModal
      :open="showSummary"
      :submitting="submitting"
      @close="showSummary = false"
      @finalize-and-print="finalizeOrder(true)"
      @finalize-no-print="finalizeOrder(false)"
    />

    <!-- Modais -->
    <BaseModal v-if="showNewCustomer" title="Novo cliente" @close="showNewCustomer = false">
      <form class="space-y-4" @submit.prevent="createCustomerInline">
        <div><label class="label">Nome</label><input v-model="newCustomer.name" class="input" required /></div>
        <div><label class="label">Telefone</label><input v-model="newCustomer.phone" class="input" type="tel" required /></div>
        <div class="flex justify-end gap-2">
          <button type="button" class="btn-secondary" @click="showNewCustomer = false">Cancelar</button>
          <button type="submit" class="btn-primary">Criar e selecionar</button>
        </div>
      </form>
    </BaseModal>

    <BaseModal v-if="showNewAddress" title="Novo endereço" size="lg" @close="showNewAddress = false">
      <form class="space-y-3" @submit.prevent="saveNewAddress">
        <AddressForm v-model="newAddrForm" />
        <div class="flex justify-end gap-2">
          <button type="button" class="btn-secondary" @click="showNewAddress = false">Cancelar</button>
          <button type="submit" class="btn-primary" :disabled="!newAddrForm.alias?.trim()">Salvar</button>
        </div>
      </form>
    </BaseModal>

    <BaseModal v-if="showPizza" title="Montar pizza" size="xl" @close="showPizza = false; initialPizzaFlavorId = ''">
      <PizzaSelector
        :initial-flavor1-id="initialPizzaFlavorId"
        @add="onPizzaAdded"
        @cancel="showPizza = false; initialPizzaFlavorId = ''"
      />
    </BaseModal>

    <BaseModal v-if="showSnack" title="Lanche / Beirute / Porção" @close="showSnack = false">
      <div class="space-y-3">
        <div>
          <label class="label">Produto</label>
          <select v-model="snackForm.productId" class="input">
            <option value="" disabled>Selecione…</option>
            <option v-for="s in menu.activeSnacks" :key="s.id" :value="s.id">{{ s.name }} — {{ formatBRL(s.price) }}</option>
          </select>
        </div>
        <div><label class="label">Quantidade</label><input v-model.number="snackForm.quantity" type="number" min="1" class="input" /></div>
        <div><label class="label">Remover ingredientes</label><input v-model="snackForm.removed" class="input" /></div>
        <div><label class="label">Observações</label><input v-model="snackForm.observation" class="input" /></div>
        <div class="flex justify-end gap-2"><button class="btn-secondary" @click="showSnack = false">Cancelar</button><button class="btn-primary" :disabled="!snackForm.productId" @click="addSnack">Adicionar</button></div>
      </div>
    </BaseModal>

    <BaseModal v-if="showBev" title="Bebida" @close="showBev = false">
      <div class="space-y-3">
        <div>
          <label class="label">Bebida</label>
          <select v-model="bevForm.productId" class="input">
            <option value="" disabled>Selecione…</option>
            <option v-for="b in menu.activeBeverages" :key="b.id" :value="b.id">{{ b.name }}</option>
          </select>
        </div>
        <div v-if="selectedBev">
          <label class="label">Tamanho/Variante</label>
          <select v-model="bevForm.variantLabel" class="input">
            <option value="" disabled>Selecione…</option>
            <option v-for="v in selectedBev.variants" :key="v.label" :value="v.label">{{ v.label }} — {{ formatBRL(v.price) }}</option>
          </select>
        </div>
        <div><label class="label">Quantidade</label><input v-model.number="bevForm.quantity" type="number" min="1" class="input" /></div>
        <div class="flex justify-end gap-2"><button class="btn-secondary" @click="showBev = false">Cancelar</button><button class="btn-primary" :disabled="!bevForm.productId || !bevForm.variantLabel" @click="addBev">Adicionar</button></div>
      </div>
    </BaseModal>
  </div>
</template>
