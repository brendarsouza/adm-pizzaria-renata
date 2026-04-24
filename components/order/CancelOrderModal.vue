<script setup lang="ts">
import type { CancelReason, Order } from '~/types'

const props = defineProps<{
  order: Order
  open: boolean
  submitting?: boolean
}>()

const emit = defineEmits<{
  close: []
  confirm: [payload: { reason: CancelReason; notes?: string; pixRefund?: { key?: string } }]
}>()

const reason = ref<CancelReason | ''>('')
const notes = ref('')
const pixRefundRecord = ref(false)
const pixRefundKey = ref('')

const reasonsLabels: Array<{ value: CancelReason; label: string; hint?: string }> = [
  { value: 'WRONG_PIZZA', label: 'Pizza feita errada' },
  { value: 'RETURNED_PIZZA', label: 'Pizza devolvida pelo cliente' },
  { value: 'NOT_RECEIVED', label: 'Cliente não recebeu / não atendeu' },
  { value: 'CUSTOMER_CANCELLED', label: 'Cliente desistiu antes do preparo' },
  { value: 'OUT_OF_STOCK', label: 'Ingrediente em falta' },
  { value: 'OTHER', label: 'Outro motivo', hint: 'Observação obrigatória' },
]

const isPixPaid = computed(() =>
  props.order.payment.method === 'PIX' && props.order.payment.proofConfirmed,
)

const canSubmit = computed(() => {
  if (!reason.value) return false
  if (reason.value === 'OTHER' && !notes.value.trim()) return false
  return true
})

watch(() => props.open, (v) => {
  if (v) {
    reason.value = ''
    notes.value = ''
    pixRefundRecord.value = false
    pixRefundKey.value = ''
  }
})

function submit() {
  if (!canSubmit.value || !reason.value) return
  emit('confirm', {
    reason: reason.value as CancelReason,
    notes: notes.value.trim() || undefined,
    pixRefund: isPixPaid.value && pixRefundRecord.value
      ? { key: pixRefundKey.value.trim() || undefined }
      : undefined,
  })
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-40 bg-black/50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-order-title"
      @keydown.esc="emit('close')"
      @click.self="emit('close')"
    >
      <div class="bg-white rounded-card shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <header class="flex items-center justify-between p-4 border-b border-border">
          <h2 id="cancel-order-title" class="font-serif text-lg">
            Cancelar pedido #{{ order.sequentialNumber }}
          </h2>
          <button class="text-text-light hover:text-text" aria-label="Fechar" @click="emit('close')">✖</button>
        </header>

        <form class="overflow-y-auto p-4 space-y-4 text-sm" @submit.prevent="submit">
          <fieldset class="space-y-2">
            <legend class="font-semibold mb-2">Motivo do cancelamento <span class="text-status-cancelled">*</span></legend>
            <label
              v-for="opt in reasonsLabels"
              :key="opt.value"
              class="flex items-start gap-2 p-2 border rounded-btn cursor-pointer"
              :class="reason === opt.value ? 'border-primary bg-primary/5' : 'border-border'"
            >
              <input v-model="reason" type="radio" :value="opt.value" class="mt-0.5" />
              <div>
                <div>{{ opt.label }}</div>
                <div v-if="opt.hint" class="text-xs text-text-light">{{ opt.hint }}</div>
              </div>
            </label>
          </fieldset>

          <div>
            <label class="label">
              Observações
              <span v-if="reason === 'OTHER'" class="text-status-cancelled">*</span>
            </label>
            <textarea
              v-model="notes"
              class="input"
              rows="2"
              :required="reason === 'OTHER'"
              :placeholder="reason === 'OTHER' ? 'Descreva o motivo' : 'Opcional'"
            />
          </div>

          <section v-if="isPixPaid" class="surface !p-3 space-y-2 border-l-4 border-primary">
            <p class="text-sm"><strong>💸 Pagamento PIX confirmado</strong></p>
            <p class="text-xs text-text-light">Houve devolução do valor ao cliente?</p>
            <label class="flex items-center gap-2 text-sm">
              <input v-model="pixRefundRecord" type="checkbox" />
              Registrar devolução do PIX
            </label>
            <div v-if="pixRefundRecord">
              <label class="label">Chave PIX usada para devolução</label>
              <input
                v-model="pixRefundKey"
                class="input"
                placeholder="ex: 11999999999 ou email@exemplo.com"
              />
            </div>
          </section>

          <footer class="flex flex-wrap gap-2 justify-end pt-2 border-t border-border">
            <button type="button" class="btn-secondary" :disabled="submitting" @click="emit('close')">
              Voltar
            </button>
            <button
              type="submit"
              class="btn-danger"
              :disabled="!canSubmit || submitting"
            >
              {{ submitting ? 'Cancelando…' : 'Confirmar cancelamento' }}
            </button>
          </footer>
        </form>
      </div>
    </div>
  </Teleport>
</template>
