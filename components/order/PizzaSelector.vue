<script setup lang="ts">
import type {
  PizzaSize, PizzaFlavor, PizzaAdditional, OrderPizzaItem,
  OrderPizzaAdditional, HalfPosition, PricingRule,
} from '~/types'
import { calcularPrecoPizzaUnit } from '~/domain/rules/pizzaPricer'

const props = defineProps<{ initialFlavor1Id?: string }>()
const emit = defineEmits<{ (e: 'add', item: OrderPizzaItem): void; (e: 'cancel'): void }>()

const menu = useMenuStore()

const size = ref<PizzaSize>('GRANDE')
const isHalfHalf = ref(false)
const flavor1Id = ref<string>(props.initialFlavor1Id || '')
const flavor2Id = ref<string>('')
const brotoWarning = ref(false)

const halfHalfDisabled = computed(() => size.value === 'BROTO')

watch(size, (newSize) => {
  if (newSize === 'BROTO' && isHalfHalf.value) {
    isHalfHalf.value = false
    flavor2Id.value = ''
    // Remove adicionais aplicados a metades específicas
    selectedAdds.value = selectedAdds.value.filter(a => a.half === 'FULL')
    brotoWarning.value = true
    setTimeout(() => { brotoWarning.value = false }, 4000)
  }
})
const stuffedCrust = ref(false)
const observation = ref('')
const quantity = ref(1)
const removed = ref<string>('') // comma-separated

interface SelectedAdd { id: string; half: HalfPosition }
const selectedAdds = ref<SelectedAdd[]>([])

function toggleAdd(id: string, half: HalfPosition) {
  const idx = selectedAdds.value.findIndex(a => a.id === id && a.half === half)
  if (idx >= 0) selectedAdds.value.splice(idx, 1)
  else selectedAdds.value.push({ id, half })
}
function isAddSelected(id: string, half: HalfPosition) {
  return selectedAdds.value.some(a => a.id === id && a.half === half)
}

const flavor1 = computed(() => menu.flavors.find(f => f.id === flavor1Id.value))
const flavor2 = computed(() => menu.flavors.find(f => f.id === flavor2Id.value))

const pricingRule = computed<PricingRule>(() => menu.settings.halfHalfRule)

const previewItem = computed<OrderPizzaItem | null>(() => {
  if (!flavor1.value) return null
  if (isHalfHalf.value && !flavor2.value) return null
  const adds: OrderPizzaAdditional[] = selectedAdds.value
    .map((sa) => {
      const a = menu.pizzaAdditionals.find(x => x.id === sa.id)
      if (!a) return null
      return {
        additionalId: a.id, name: a.name,
        priceWhole: a.priceWhole, priceHalf: a.priceHalf, half: sa.half,
      }
    })
    .filter((x): x is OrderPizzaAdditional => x !== null)
  return {
    kind: 'pizza',
    size: size.value,
    flavor1: {
      id: flavor1.value.id, name: flavor1.value.name,
      category: flavor1.value.category, priceBySize: flavor1.value.priceBySize,
    },
    flavor2: isHalfHalf.value && flavor2.value ? {
      id: flavor2.value.id, name: flavor2.value.name,
      category: flavor2.value.category, priceBySize: flavor2.value.priceBySize,
    } : undefined,
    isHalfHalf: isHalfHalf.value,
    pricingRule: pricingRule.value,
    stuffedCrust: stuffedCrust.value,
    stuffedCrustPrice: menu.settings.stuffedCrustPrice,
    additionals: adds,
    removedIngredients: removed.value.split(',').map(s => s.trim()).filter(Boolean),
    observation: observation.value || undefined,
    quantity: quantity.value,
  }
})

const unitPrice = computed(() => previewItem.value ? calcularPrecoPizzaUnit(previewItem.value).toReais() : 0)
const totalPrice = computed(() => unitPrice.value * quantity.value)

function add() {
  if (!previewItem.value) return
  emit('add', previewItem.value)
}

const sizesOptions: Array<{ value: PizzaSize; label: string }> = [
  { value: 'BROTO', label: 'Broto' },
  { value: 'MEDIA', label: 'Média' },
  { value: 'GRANDE', label: 'Grande' },
  { value: 'FAMILIA', label: 'Família' },
]
</script>

<template>
  <p> PIZZAS BRENDA</p>
  <div class="space-y-4">
    <div>
      <label class="label">Tamanho</label>
      <div class="flex gap-2 flex-wrap">
        <button v-for="s in sizesOptions" :key="s.value" type="button"
                :class="['px-3 py-1.5 rounded-btn text-sm border', size === s.value ? 'bg-primary text-white border-primary' : 'bg-white border-border text-text']"
                @click="size = s.value">
          {{ s.label }}
        </button>
      </div>
    </div>

    <div class="flex items-center gap-2">
      <input
        id="half"
        v-model="isHalfHalf"
        type="checkbox"
        :disabled="halfHalfDisabled"
      />
      <label
        for="half"
        class="text-sm"
        :class="halfHalfDisabled ? 'opacity-50 cursor-not-allowed' : ''"
        :title="halfHalfDisabled ? 'Indisponível para tamanho Broto' : ''"
      >
        Meio a meio (2 sabores)
      </label>
      <span v-if="halfHalfDisabled" class="text-xs text-text-light italic">
        — indisponível para Broto
      </span>
    </div>
    <p v-if="brotoWarning" class="text-xs text-status-cancelled -mt-2" role="alert">
      Pizza broto não permite meio a meio. Seleção do 2º sabor foi limpa.
    </p>

    <div class="grid gap-3" :class="isHalfHalf ? 'md:grid-cols-2' : 'grid-cols-1'">
      <div>
        <label class="label">{{ isHalfHalf ? '1ª metade' : 'Sabor' }}</label>
        <select v-model="flavor1Id" class="input">
          <option value="" disabled>Selecione…</option>
          <option v-for="f in menu.activeFlavors" :key="f.id" :value="f.id">
            {{ f.name }} ({{ f.category }}) — {{ formatBRL(f.priceBySize[size] || 0) }}
          </option>
        </select>
      </div>
      <div v-if="isHalfHalf">
        <label class="label">2ª metade</label>
        <select v-model="flavor2Id" class="input">
          <option value="" disabled>Selecione…</option>
          <option v-for="f in menu.activeFlavors" :key="f.id" :value="f.id">
            {{ f.name }} ({{ f.category }}) — {{ formatBRL(f.priceBySize[size] || 0) }}
          </option>
        </select>
      </div>
    </div>

    <div class="flex items-center gap-2">
      <input id="crust" v-model="stuffedCrust" type="checkbox" />
      <label for="crust" class="text-sm">Borda recheada (+{{ formatBRL(menu.settings.stuffedCrustPrice) }})</label>
    </div>

    <div v-if="menu.activePizzaAdditionals.length">
      <label class="label">Adicionais</label>
      <div class="space-y-1 surface !p-3">
        <div v-for="a in menu.activePizzaAdditionals" :key="a.id" class="flex items-center justify-between py-1 border-b border-border/40 last:border-0">
          <div class="text-sm">
            <div class="font-medium">{{ a.name }}</div>
            <div class="text-xs text-text-light">Inteira {{ formatBRL(a.priceWhole) }} · Meia {{ formatBRL(a.priceHalf) }}</div>
          </div>
          <div class="flex gap-1">
            <button type="button"
                    :class="['px-2 py-1 rounded text-xs border', isAddSelected(a.id, 'FULL') ? 'bg-primary text-white border-primary' : 'bg-white border-border']"
                    @click="toggleAdd(a.id, 'FULL')">Inteira</button>
            <button v-if="isHalfHalf" type="button"
                    :class="['px-2 py-1 rounded text-xs border', isAddSelected(a.id, 'HALF_1') ? 'bg-primary text-white border-primary' : 'bg-white border-border']"
                    @click="toggleAdd(a.id, 'HALF_1')">1ª meia</button>
            <button v-if="isHalfHalf" type="button"
                    :class="['px-2 py-1 rounded text-xs border', isAddSelected(a.id, 'HALF_2') ? 'bg-primary text-white border-primary' : 'bg-white border-border']"
                    @click="toggleAdd(a.id, 'HALF_2')">2ª meia</button>
          </div>
        </div>
      </div>
    </div>

    <div>
      <label class="label">Remover ingredientes (separados por vírgula — não gera desconto)</label>
      <input v-model="removed" class="input" placeholder="ex: cebola, azeitona" />
    </div>

    <div>
      <label class="label">Observações</label>
      <input v-model="observation" class="input" placeholder='ex: "bem assada", "massa fina"' />
    </div>

    <div class="flex items-center gap-3">
      <label class="label mb-0">Quantidade</label>
      <input v-model.number="quantity" type="number" min="1" class="input w-24" />
    </div>

    <div class="surface flex items-center justify-between">
      <div>
        <div class="text-xs text-text-light uppercase tracking-wide">Total</div>
        <div class="font-serif text-2xl text-primary">{{ formatBRL(totalPrice) }}</div>
        <div v-if="quantity > 1" class="text-xs text-text-light">{{ formatBRL(unitPrice) }} por unidade</div>
      </div>
      <div class="flex gap-2">
        <button type="button" class="btn-secondary" @click="emit('cancel')">Cancelar</button>
        <button type="button" class="btn-primary" :disabled="!previewItem" @click="add">Adicionar</button>
      </div>
    </div>
  </div>
</template>
