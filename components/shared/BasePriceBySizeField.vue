<script setup lang="ts">
interface PriceBySize { BROTO?: number; MEDIA?: number; GRANDE?: number; FAMILIA?: number }
const props = defineProps<{ modelValue: PriceBySize }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: PriceBySize): void }>()

const sizes: Array<{ key: keyof PriceBySize; label: string }> = [
  { key: 'BROTO', label: 'Broto' },
  { key: 'MEDIA', label: 'Média' },
  { key: 'GRANDE', label: 'Grande' },
  { key: 'FAMILIA', label: 'Família' },
]

function setSize(key: keyof PriceBySize, value: number) {
  emit('update:modelValue', { ...props.modelValue, [key]: value })
}
</script>

<template>
  <div class="grid grid-cols-2 gap-3">
    <div v-for="s in sizes" :key="s.key">
      <label class="label">{{ s.label }}</label>
      <input
        :value="modelValue?.[s.key] ?? 0"
        type="number"
        step="0.01"
        class="input"
        @input="setSize(s.key, Number(($event.target as HTMLInputElement).value))"
      />
    </div>
  </div>
</template>
