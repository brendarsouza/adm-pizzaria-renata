<script setup lang="ts">
import type { Address, RoadType } from '~/types'
import { lookupCEP, lookupByCurrentLocation, formatCEP } from '~/composables/useAddressLookup'

type FormState = Omit<Address, 'id' | 'createdAt'> & { cep?: string }

const props = defineProps<{
  modelValue: FormState
}>()
const emit = defineEmits<{
  'update:modelValue': [value: FormState]
}>()

const form = reactive<FormState>({
  alias: props.modelValue.alias || '',
  street: props.modelValue.street || '',
  number: props.modelValue.number || '',
  complement: props.modelValue.complement || '',
  district: props.modelValue.district || '',
  locality: props.modelValue.locality || '',
  state: props.modelValue.state || '',
  cep: props.modelValue.cep || '',
  reference: props.modelValue.reference || '',
  roadType: props.modelValue.roadType || 'asfalto',
  addressNotes: props.modelValue.addressNotes || props.modelValue.accessNotes || '',
  latitude: props.modelValue.latitude,
  longitude: props.modelValue.longitude,
})

watch(form, (v) => emit('update:modelValue', { ...v }), { deep: true })

const cepLoading = ref(false)
const cepError = ref('')
const gpsLoading = ref(false)
const gpsError = ref('')

function onCepInput(e: Event) {
  const raw = (e.target as HTMLInputElement).value
  form.cep = formatCEP(raw)
  const digits = form.cep.replace(/\D/g, '')
  if (digits.length === 8) void doCepLookup()
}

async function doCepLookup() {
  cepError.value = ''
  cepLoading.value = true
  try {
    const data = await lookupCEP(form.cep || '')
    if (!data) {
      cepError.value = 'CEP não encontrado'
      return
    }
    if (data.street) form.street = data.street
    if (data.district) form.district = data.district
    if (data.locality) form.locality = data.locality
    if (data.state) form.state = data.state
    if (data.cep) form.cep = data.cep
  } finally {
    cepLoading.value = false
  }
}

async function useMyLocation() {
  gpsError.value = ''
  gpsLoading.value = true
  try {
    const data = await lookupByCurrentLocation()
    if (!data) {
      gpsError.value = 'Não foi possível obter a localização.'
      return
    }
    if (data.latitude != null) form.latitude = data.latitude
    if (data.longitude != null) form.longitude = data.longitude
    if (data.street) form.street = data.street
    if (data.number) form.number = data.number
    if (data.district) form.district = data.district
    if (data.locality) form.locality = data.locality
    if (data.state) form.state = data.state
    if (data.cep) form.cep = formatCEP(data.cep)
  } finally {
    gpsLoading.value = false
  }
}
</script>

<template>
  <div class="space-y-3">
    <div>
      <label class="label">Apelido <span class="text-status-cancelled">*</span></label>
      <input
        v-model="form.alias"
        class="input"
        placeholder='Ex.: "Casa", "Trabalho", "Casa da mãe"'
        required
      />
      <p class="text-xs text-text-light mt-1">Obrigatório — ajuda a identificar o endereço no pedido.</p>
    </div>

    <div class="flex flex-wrap gap-2">
      <button
        type="button"
        class="btn-secondary text-xs"
        :disabled="gpsLoading"
        @click="useMyLocation"
      >
        {{ gpsLoading ? '🛰 Buscando…' : '📍 Usar minha localização' }}
      </button>
      <p v-if="gpsError" class="text-xs text-status-cancelled self-center">{{ gpsError }}</p>
    </div>

    <div class="grid grid-cols-3 gap-3">
      <div>
        <label class="label">CEP</label>
        <div class="relative">
          <input
            :value="form.cep"
            class="input font-mono"
            maxlength="9"
            placeholder="00000-000"
            @input="onCepInput"
            @blur="form.cep && form.cep.replace(/\D/g, '').length === 8 && doCepLookup()"
          />
          <span v-if="cepLoading" class="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-text-light">⏳</span>
        </div>
        <p v-if="cepError" class="text-xs text-status-cancelled mt-1">{{ cepError }}</p>
      </div>
      <div class="col-span-2">
        <label class="label">Logradouro</label>
        <input v-model="form.street" class="input" required />
      </div>
    </div>

    <div class="grid grid-cols-3 gap-3">
      <div><label class="label">Número</label><input v-model="form.number" class="input" required /></div>
      <div class="col-span-2"><label class="label">Complemento</label><input v-model="form.complement" class="input" /></div>
    </div>

    <div class="grid grid-cols-3 gap-3">
      <div class="col-span-2"><label class="label">Bairro/Comunidade</label><input v-model="form.district" class="input" required /></div>
      <div><label class="label">UF</label><input v-model="form.state" class="input uppercase" maxlength="2" /></div>
    </div>

    <div><label class="label">Cidade</label><input v-model="form.locality" class="input" /></div>

    <div><label class="label">Ponto de referência</label><input v-model="form.reference" class="input" placeholder="ex.: em frente à praça" /></div>

    <div>
      <label class="label">Tipo de via</label>
      <select v-model="form.roadType" class="input">
        <option value="asfalto">Asfalto</option>
        <option value="estrada_terra">Estrada de terra</option>
        <option value="outro">Outro</option>
      </select>
    </div>

    <div>
      <label class="label">Observações do endereço</label>
      <textarea
        v-model="form.addressNotes"
        class="input"
        rows="2"
        placeholder='Ex.: "em frente ao número 45", "portão azul", "depois da ponte"'
      />
    </div>

    <div v-if="form.latitude != null && form.longitude != null" class="text-xs text-text-light font-mono">
      GPS: {{ form.latitude.toFixed(5) }}, {{ form.longitude.toFixed(5) }}
    </div>
  </div>
</template>
