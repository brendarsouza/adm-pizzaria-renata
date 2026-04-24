<script setup lang="ts">
import { computed } from 'vue'
import type { CrudField, CrudFieldOption } from '~/composables/useCrudForm'

const props = defineProps<{
  field: CrudField
  modelValue: any
  error?: string
  form: Record<string, any>
}>()
const emit = defineEmits<{ (e: 'update:modelValue', v: any): void }>()

const options = computed<CrudFieldOption[]>(() => {
  const o = props.field.options
  if (!o) return []
  return typeof o === 'function' ? o() : o
})

function onInput(e: Event) {
  const t = e.target as HTMLInputElement
  emit('update:modelValue', t.value)
}
function onNumber(e: Event) {
  const t = e.target as HTMLInputElement
  emit('update:modelValue', t.value === '' ? 0 : Number(t.value))
}
function onCheckbox(e: Event) {
  emit('update:modelValue', (e.target as HTMLInputElement).checked)
}
function onProductNumber(e: Event) {
  const t = e.target as HTMLInputElement
  emit('update:modelValue', t.value.replace(/\D/g, '').slice(0, 3))
}

// Autocomplete
const showDropdown = ref(false)
const autocompleteTerm = ref('')
const filteredOptions = computed<CrudFieldOption[]>(() => {
  if (!autocompleteTerm.value) return options.value
  const q = autocompleteTerm.value.toLowerCase()
  return options.value.filter(o => o.label.toLowerCase().includes(q))
})
const selectedLabel = computed(() => options.value.find(o => o.value === props.modelValue)?.label || '')
function pickOption(o: CrudFieldOption) {
  emit('update:modelValue', o.value)
  autocompleteTerm.value = o.label
  showDropdown.value = false
}
</script>

<template>
  <div>
    <label v-if="field.type !== 'checkbox'" class="label">
      {{ field.label }}
      <span v-if="field.required" class="text-status-cancelled">*</span>
    </label>

    <!-- text -->
    <input
      v-if="field.type === 'text'"
      :value="modelValue"
      class="input"
      :placeholder="field.placeholder"
      :maxlength="field.maxLength"
      :required="field.required"
      @input="onInput"
    />

    <!-- product-number (3 dígitos) -->
    <input
      v-else-if="field.type === 'product-number'"
      :value="modelValue"
      class="input font-mono"
      maxlength="3"
      :placeholder="field.placeholder || '001'"
      @input="onProductNumber"
    />

    <!-- csv-list -->
    <input
      v-else-if="field.type === 'csv-list'"
      :value="modelValue"
      class="input"
      :placeholder="field.placeholder || 'separados por vírgula'"
      @input="onInput"
    />

    <!-- number / money -->
    <input
      v-else-if="field.type === 'number' || field.type === 'money'"
      :value="modelValue"
      type="number"
      :step="field.type === 'money' ? '0.01' : '1'"
      min="0"
      class="input"
      :placeholder="field.placeholder"
      :required="field.required"
      @input="onNumber"
    />

    <!-- textarea -->
    <textarea
      v-else-if="field.type === 'textarea'"
      :value="modelValue"
      class="input"
      rows="3"
      :placeholder="field.placeholder"
      @input="onInput"
    />

    <!-- select -->
    <select
      v-else-if="field.type === 'select'"
      :value="modelValue"
      class="input"
      :required="field.required"
      @change="emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
    >
      <option v-if="!field.required" value="">—</option>
      <option v-for="o in options" :key="String(o.value)" :value="o.value">{{ o.label }}</option>
    </select>

    <!-- checkbox -->
    <label
      v-else-if="field.type === 'checkbox'"
      class="flex items-center gap-2 text-sm pt-6"
    >
      <input
        type="checkbox"
        :checked="modelValue"
        @change="onCheckbox"
      />
      {{ field.label }}
    </label>

    <!-- price-by-size -->
    <BasePriceBySizeField
      v-else-if="field.type === 'price-by-size'"
      :model-value="modelValue"
      @update:model-value="emit('update:modelValue', $event)"
    />

    <!-- variants -->
    <BaseVariantListField
      v-else-if="field.type === 'variants'"
      :model-value="modelValue"
      :label-placeholder="field.placeholder"
      @update:model-value="emit('update:modelValue', $event)"
    />

    <!-- autocomplete -->
    <div v-else-if="field.type === 'autocomplete'" class="relative">
      <input
        :value="autocompleteTerm || selectedLabel"
        class="input"
        :placeholder="field.placeholder || 'Digite para buscar…'"
        @input="autocompleteTerm = ($event.target as HTMLInputElement).value; showDropdown = true"
        @focus="showDropdown = true"
        @blur="setTimeout(() => showDropdown = false, 150)"
      />
      <div
        v-if="showDropdown && filteredOptions.length"
        class="absolute z-10 mt-1 w-full bg-white border border-border rounded-card shadow-card max-h-60 overflow-y-auto"
      >
        <button
          v-for="o in filteredOptions"
          :key="String(o.value)"
          type="button"
          class="w-full text-left px-3 py-2 hover:bg-surface text-sm"
          @mousedown.prevent="pickOption(o)"
        >{{ o.label }}</button>
      </div>
    </div>

    <p v-if="field.help && !error" class="text-xs text-text-light mt-1">{{ field.help }}</p>
    <p v-if="error" class="text-xs text-status-cancelled mt-1">{{ error }}</p>
  </div>
</template>
