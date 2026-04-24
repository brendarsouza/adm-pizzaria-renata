<script setup lang="ts">
import type { OrderItem } from '~/types'
import { describeItemLine, describeItemLine2, itemExtraNotes, formatFullAddress, formatPaymentLabel } from '~/composables/useComandaFormat'

const props = defineProps<{
  open: boolean
  submitting?: boolean
}>()

const emit = defineEmits<{
  close: []
  finalizeAndPrint: []
  finalizeNoPrint: []
}>()

const order = useOrderStore()

const modalRef = ref<HTMLDivElement | null>(null)
const btnPrintRef = ref<HTMLButtonElement | null>(null)

function itemPrice(item: OrderItem): number {
  // Usa os preços já calculados no carrinho
  if (item.kind === 'pizza') {
    // O valor final é calculado pela orderStore.itemsSubtotal; aqui mostramos
    // por linha apenas a quantidade × preço unitário quando possível.
    const unit = (item as any).unitPrice ?? 0
    return unit * (item.quantity || 1)
  }
  if (item.kind === 'snack') return item.unitPrice * item.quantity
  return item.unitPrice * item.quantity
}

function close() {
  emit('close')
}
function finalizePrint() {
  emit('finalizeAndPrint')
}
function finalizeNoPrint() {
  emit('finalizeNoPrint')
}

// Foco inicial no botão primário quando o modal abre
watch(() => props.open, async (v) => {
  if (v) {
    await nextTick()
    btnPrintRef.value?.focus()
  }
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-40 bg-black/50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="order-summary-title"
      @keydown.esc="close"
      @click.self="close"
    >
      <div
        ref="modalRef"
        class="bg-white rounded-card shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col"
      >
        <header class="flex items-center justify-between p-4 border-b border-border">
          <h2 id="order-summary-title" class="font-serif text-xl">📋 Resumo do pedido</h2>
          <button class="text-text-light hover:text-text" aria-label="Fechar" @click="close">✖</button>
        </header>

        <div class="overflow-y-auto p-4 space-y-4 text-sm">
          <!-- Cliente -->
          <section>
            <h3 class="font-semibold text-xs uppercase text-text-light mb-1">Cliente</h3>
            <p class="font-medium">{{ order.draft.customer?.name }}</p>
            <p class="font-mono text-xs">{{ order.draft.customer?.phone }}</p>
          </section>

          <!-- Endereço -->
          <section v-if="order.draft.address">
            <h3 class="font-semibold text-xs uppercase text-text-light mb-1">Endereço</h3>
            <p>{{ formatFullAddress(order.draft.address) }}</p>
          </section>

          <!-- Itens -->
          <section>
            <h3 class="font-semibold text-xs uppercase text-text-light mb-1">Itens</h3>
            <ul class="divide-y divide-border/40">
              <li v-for="(it, i) in order.draft.items" :key="i" class="py-2">
                <div class="flex justify-between items-baseline gap-2">
                  <div class="flex-1 min-w-0">
                    <div class="font-medium flex items-start gap-2 flex-wrap">
                      <CategoryBadge :item="it" />
                      <span>
                        {{ it.quantity }}× {{ describeItemLine(it) }}
                        <span v-if="it.kind === 'pizza'" class="text-xs text-text-light">· {{ it.size }}</span>
                      </span>
                    </div>
                    <div v-if="describeItemLine2(it)" class="font-medium">
                      &nbsp;&nbsp;&nbsp;&nbsp;{{ describeItemLine2(it) }}
                    </div>
                    <p
                      v-for="(n, k) in itemExtraNotes(it)"
                      :key="k"
                      class="text-xs text-text-light italic pl-4"
                    >{{ n }}</p>
                  </div>
                </div>
              </li>
            </ul>
          </section>

          <!-- Totais -->
          <section class="border-t border-border pt-3 space-y-1">
            <div class="flex justify-between"><span class="text-text-light">Subtotal</span><span class="font-mono">{{ formatBRL(order.itemsSubtotal) }}</span></div>
            <div class="flex justify-between"><span class="text-text-light">Taxa de entrega</span><span class="font-mono">{{ formatBRL(order.draft.deliveryFee) }}</span></div>
            <div class="flex justify-between text-lg font-serif pt-1">
              <strong>TOTAL</strong><strong class="text-primary font-mono">{{ formatBRL(order.total) }}</strong>
            </div>
          </section>

          <!-- Pagamento -->
          <section v-if="order.draft.payment">
            <h3 class="font-semibold text-xs uppercase text-text-light mb-1">Pagamento</h3>
            <p>{{ formatPaymentLabel(order.draft.payment) }}</p>
            <p
              v-if="order.draft.payment.method === 'CASH' && order.draft.payment.needsChange && order.draft.payment.cashGiven"
              class="text-xs"
            >
              Cliente paga {{ formatBRL(order.draft.payment.cashGiven) }} · Troco {{ formatBRL(order.draft.payment.change || 0) }}
            </p>
          </section>

          <!-- Entrega -->
          <section>
            <h3 class="font-semibold text-xs uppercase text-text-light mb-1">Entrega</h3>
            <p>Estimativa: <strong>{{ order.draft.estimateMinutes }} min</strong></p>
          </section>
        </div>

        <footer class="flex flex-wrap gap-2 justify-end p-4 border-t border-border">
          <button class="btn-secondary text-sm" :disabled="submitting" @click="close">
            ← Voltar e editar
          </button>
          <button class="btn-ghost text-sm border border-border" :disabled="submitting" @click="finalizeNoPrint">
            ✅ Finalizar sem imprimir
          </button>
          <button
            ref="btnPrintRef"
            class="btn-primary text-sm"
            :disabled="submitting"
            @click="finalizePrint"
          >
            {{ submitting ? 'Finalizando…' : '🖨 Finalizar e imprimir' }}
          </button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>
