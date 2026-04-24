<script setup lang="ts">
import type { CustomerPhone } from '~/types'

const props = defineProps<{ modelValue: CustomerPhone[] }>()
const emit = defineEmits<{ 'update:modelValue': [value: CustomerPhone[]] }>()

const phones = ref<CustomerPhone[]>(
  props.modelValue && props.modelValue.length > 0
    ? props.modelValue.map(p => ({ ...p }))
    : [{ id: genId(), number: '', label: '', isPrimary: true }]
)

function genId(): string {
  return `ph_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

watch(phones, (v) => {
  // Garante exatamente um primário.
  if (!v.some(p => p.isPrimary) && v.length > 0) v[0]!.isPrimary = true
  emit('update:modelValue', v.map(p => ({ ...p })))
}, { deep: true })

function add() {
  phones.value.push({ id: genId(), number: '', label: '', isPrimary: false })
}

function remove(idx: number) {
  if (phones.value.length <= 1) return
  const removingPrimary = phones.value[idx]?.isPrimary
  phones.value.splice(idx, 1)
  if (removingPrimary && phones.value[0]) phones.value[0].isPrimary = true
}

function setPrimary(idx: number) {
  phones.value.forEach((p, i) => { p.isPrimary = i === idx })
}

function hasDuplicates(): boolean {
  const digits = phones.value.map(p => p.number.replace(/\D/g, '')).filter(Boolean)
  return new Set(digits).size !== digits.length
}
const duplicatesWarning = computed(() => hasDuplicates())

defineExpose({ hasDuplicates })
</script>

<template>
  <div class="space-y-2">
    <div
      v-for="(p, i) in phones"
      :key="p.id"
      class="flex items-center gap-2 p-2 border border-border rounded-btn"
      :class="p.isPrimary ? 'bg-primary/5 border-primary/50' : 'bg-white'"
    >
      <button
        type="button"
        class="text-lg"
        :class="p.isPrimary ? 'text-primary' : 'text-text-light hover:text-primary'"
        :title="p.isPrimary ? 'Telefone principal' : 'Definir como principal'"
        :aria-label="p.isPrimary ? 'Principal' : 'Definir como principal'"
        @click="setPrimary(i)"
      >
        {{ p.isPrimary ? '★' : '☆' }}
      </button>
      <input
        v-model="p.number"
        type="tel"
        class="input flex-1"
        placeholder="(11) 99999-9999"
        required
      />
      <input
        v-model="p.label"
        type="text"
        class="input w-40"
        placeholder="WhatsApp, fixo…"
      />
      <button
        type="button"
        class="btn-ghost text-status-cancelled text-sm"
        :disabled="phones.length <= 1"
        :title="phones.length <= 1 ? 'Mantenha ao menos 1 telefone' : 'Remover'"
        @click="remove(i)"
      >
        ✕
      </button>
    </div>

    <p v-if="duplicatesWarning" class="text-xs text-status-cancelled">
      Existem telefones duplicados.
    </p>

    <button type="button" class="btn-secondary text-xs" @click="add">+ Adicionar telefone</button>
  </div>
</template>
