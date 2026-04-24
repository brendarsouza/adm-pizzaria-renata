<script setup lang="ts">
interface Variant { label: string; price: number }
const props = defineProps<{ modelValue: Variant[]; labelPlaceholder?: string }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: Variant[]): void }>()

function update(next: Variant[]) { emit('update:modelValue', next) }
function addItem() { update([...(props.modelValue || []), { label: '', price: 0 }]) }
function removeItem(i: number) {
  const next = [...(props.modelValue || [])]
  next.splice(i, 1)
  update(next.length ? next : [{ label: '', price: 0 }])
}
function setLabel(i: number, label: string) {
  const next = props.modelValue.map((v, idx) => idx === i ? { ...v, label } : v)
  update(next)
}
function setPrice(i: number, price: number) {
  const next = props.modelValue.map((v, idx) => idx === i ? { ...v, price } : v)
  update(next)
}
</script>

<template>
  <div class="space-y-2">
    <div
      v-for="(v, i) in modelValue"
      :key="i"
      class="flex gap-2 items-center"
    >
      <input
        :value="v.label"
        class="input flex-1"
        :placeholder="labelPlaceholder || 'ex: Lata, 600ml, 2L'"
        @input="setLabel(i, ($event.target as HTMLInputElement).value)"
      />
      <input
        :value="v.price"
        type="number"
        step="0.01"
        min="0"
        class="input w-28"
        placeholder="Preço"
        @input="setPrice(i, Number(($event.target as HTMLInputElement).value))"
      />
      <button
        type="button"
        class="btn-ghost text-status-cancelled text-sm"
        :disabled="modelValue.length <= 1"
        @click="removeItem(i)"
      >✕</button>
    </div>
    <button type="button" class="btn-secondary text-xs" @click="addItem">+ Adicionar</button>
  </div>
</template>
