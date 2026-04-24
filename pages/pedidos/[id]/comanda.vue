<script setup lang="ts">
import type { Order, OrderItem } from '~/types'
import {
  describeItemLine, describeItemLine2, itemExtraNotes, formatFullAddress,
  formatHourMinute, formatSequentialNumber,
} from '~/composables/useComandaFormat'
import { resolveItemCategory } from '~/composables/useItemCategory'

definePageMeta({ layout: false })

const route = useRoute()
const order = useOrderStore()
const menu = useMenuStore()
const current = ref<Order | null>(null)
const ready = ref(false)

function categoryLabel(it: OrderItem): string {
  return resolveItemCategory(it, {
    snackKindById: (id) => menu.snacks.find(s => s.id === id)?.kind,
    beverageKindById: (id) => menu.beverages.find(b => b.id === id)?.kind,
  }).label
}

onMounted(async () => {
  await menu.loadAll()
  current.value = await order.fetchOrder(route.params.id as string)
  await nextTick()
  ready.value = true
  // Auto-abre a janela de impressão depois de um pequeno delay para o DOM
  // estabilizar (evita impressão parcial em alguns browsers).
  setTimeout(() => { try { window.print() } catch { /* ignorar */ } }, 500)
})

function itemLinePrice(it: OrderItem): number {
  // Preço da linha (unitário × quantidade) para exibição.
  if (it.kind === 'pizza') {
    // Pizza já tem preço final calculado no subtotal do pedido; para exibição por linha,
    // proporcionamos itemsSubtotal/total proporcionalmente seria complexo. Usamos
    // o total do item se vier pré-calculado, senão deixamos em branco e mostramos
    // somente o total geral.
    // Para o layout da Renata pedido, cada linha tem seu valor próprio.
    return 0 // calculado a partir de contexto externo (ver pizzaPricer)
  }
  if (it.kind === 'snack') return it.unitPrice * it.quantity
  return it.unitPrice * it.quantity
}
</script>

<template>
  <div v-if="!current" class="p-8 text-center text-sm">Carregando comanda…</div>
  <div v-else class="comanda-wrapper">

    <!-- Controles de tela (não imprimem) -->
    <div class="no-print p-4 text-center bg-bg border-b border-border flex justify-center gap-2">
      <button class="btn-primary" onclick="window.print()">🖨 Imprimir</button>
      <button class="btn-secondary" onclick="window.history.back()">← Voltar</button>
      <button class="btn-ghost" onclick="window.close()">Fechar</button>
    </div>

    <!-- Corpo da comanda -->
    <div class="comanda">

      <!-- Cabeçalho: logo + número -->
      <header class="comanda-head">
        <div class="brand">
          <div class="brand-name">🍕 PIZZARIA RENATA</div>
          <div class="brand-small">Comanda de pedido</div>
        </div>
        <div class="pedido-num">
          <div class="pedido-label">Pedido nº</div>
          <div class="pedido-value">{{ formatSequentialNumber(current.sequentialNumber) }}</div>
        </div>
      </header>

      <div class="sep"></div>

      <!-- Cliente e endereço -->
      <section>
        <div class="cliente-nome">{{ current.customerSnapshot.name }}</div>
        <div class="cliente-tel">{{ current.customerSnapshot.phone }}</div>
        <div class="endereco">{{ formatFullAddress(current.addressSnapshot) }}</div>
        <div v-if="current.addressSnapshot.gps" class="small">
          GPS: {{ current.addressSnapshot.gps.latitude.toFixed(5) }}, {{ current.addressSnapshot.gps.longitude.toFixed(5) }}
        </div>
      </section>

      <div class="sep"></div>

      <!-- Itens -->
      <section class="itens">
        <div v-for="(it, i) in current.items" :key="i" class="item-bloco">

          <!-- Pizza meio-a-meio: duas linhas, preço na primeira -->
          <template v-if="it.kind === 'pizza' && it.isHalfHalf && it.flavor2">
            <div class="item-linha">
              <span class="item-qtd">{{ it.quantity }}</span>
              <span class="item-nome">[{{ categoryLabel(it) }}] {{ describeItemLine(it) }}</span>
              <span class="item-dots" aria-hidden="true"></span>
              <span class="item-valor">—</span>
            </div>
            <div class="item-linha item-linha-cont">
              <span class="item-qtd"></span>
              <span class="item-nome">{{ describeItemLine2(it) }}</span>
            </div>
          </template>

          <!-- Demais itens: uma linha -->
          <template v-else>
            <div class="item-linha">
              <span class="item-qtd">{{ it.quantity }}</span>
              <span class="item-nome">[{{ categoryLabel(it) }}] {{ describeItemLine(it) }}</span>
              <span class="item-dots" aria-hidden="true"></span>
              <span class="item-valor">{{ itemLinePrice(it) ? formatBRL(itemLinePrice(it)) : '' }}</span>
            </div>
          </template>

          <!-- Observações do item -->
          <div
            v-for="(note, k) in itemExtraNotes(it)"
            :key="k"
            class="item-obs"
          >{{ note }}</div>
        </div>
      </section>

      <div class="sep"></div>

      <!-- Totais -->
      <section class="totais">
        <div class="total-linha">
          <span>Subtotal</span>
          <span class="item-dots" aria-hidden="true"></span>
          <span>{{ formatBRL(current.itemsSubtotal) }}</span>
        </div>
        <div class="total-linha">
          <span>Taxa de entrega</span>
          <span class="item-dots" aria-hidden="true"></span>
          <span>{{ formatBRL(current.deliveryFee) }}</span>
        </div>
        <div class="total-linha total-final">
          <strong>TOTAL</strong>
          <span class="item-dots item-dots-strong" aria-hidden="true"></span>
          <strong>{{ formatBRL(current.total) }}</strong>
        </div>
      </section>

      <div class="sep"></div>

      <!-- Pagamento e horários -->
      <footer class="rodape">
        <div><strong>FORMA DE PAGAMENTO:</strong> {{ current.payment.method === 'CASH' ? 'DINHEIRO' : current.payment.method === 'CARD' ? 'CARTÃO' : 'PIX' }}</div>
        <div v-if="current.payment.method === 'CASH' && current.payment.needsChange && current.payment.cashGiven">
          <strong>TROCO PARA:</strong> {{ formatBRL(current.payment.cashGiven) }} —
          <strong>TROCO:</strong> {{ formatBRL(current.payment.change || 0) }}
        </div>
        <div v-if="current.payment.method === 'PIX' && !current.payment.proofConfirmed">
          <strong>⚠️ AGUARDANDO COMPROVANTE PIX</strong>
        </div>
        <div v-if="current.payment.method === 'CARD'">
          <strong>{{ current.payment.debitOrCredit === 'credit' ? 'CRÉDITO' : 'DÉBITO' }}</strong> · Bandeira: {{ current.payment.brand }}
        </div>
        <div><strong>HORÁRIO DO PEDIDO:</strong> {{ formatHourMinute(current.createdAt) }}</div>
        <div><strong>TEMPO ESTIMATIVA ENTREGA:</strong> {{ current.estimateMinutes }} min</div>
        <div><strong>PREVISÃO:</strong> {{ formatHourMinute(current.estimatedDeliveryAt) }}</div>
      </footer>

      <div class="sep"></div>

      <div class="agradecimento">🍕 Obrigado pela preferência!</div>
    </div>
  </div>
</template>

<style scoped>
/* ─────────────────────────────────────────────────────────────
 * Comanda — layout para impressora térmica 80mm
 * Fonte monoespaçada para alinhamento. Uso de flex + dotted
 * leader entre nome e preço.
 * ───────────────────────────────────────────────────────────── */

.comanda-wrapper { background: #f3f3f3; min-height: 100vh; }

.comanda {
  max-width: 80mm;
  width: 80mm;
  margin: 0 auto;
  padding: 6mm 4mm;
  background: #fff;
  color: #000;
  font-family: 'JetBrains Mono', 'Courier New', Courier, monospace;
  font-size: 11px;
  line-height: 1.45;
}

/* Cabeçalho */
.comanda-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;
}
.brand-name { font-weight: 700; font-size: 13px; letter-spacing: 0.5px; }
.brand-small { font-size: 9px; color: #333; }
.pedido-label { font-size: 9px; text-align: right; }
.pedido-value {
  font-weight: 700; font-size: 13px;
  padding: 2px 6px; border: 1px solid #000; border-radius: 3px;
  letter-spacing: 0.5px;
}

.sep { border-top: 1px dashed #000; margin: 5px 0; }

/* Cliente */
.cliente-nome { font-weight: 700; font-size: 12px; }
.cliente-tel { font-size: 11px; margin-bottom: 2px; }
.endereco { font-size: 10.5px; }
.small { font-size: 9px; color: #444; }

/* Itens */
.itens { margin: 2px 0; }
.item-bloco { margin-bottom: 4px; }

.item-linha {
  display: flex;
  align-items: baseline;
  gap: 3px;
  font-size: 11px;
}
.item-linha-cont { padding-left: 0; }

.item-qtd {
  flex: 0 0 auto;
  min-width: 14px;
  font-weight: 600;
}
.item-nome {
  flex: 0 1 auto;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 48mm;
}
.item-dots {
  flex: 1 1 auto;
  border-bottom: 1px dotted #000;
  margin: 0 3px;
  position: relative;
  top: -3px;
  min-width: 6px;
}
.item-dots-strong { border-bottom-style: solid; }
.item-valor {
  flex: 0 0 auto;
  min-width: 18mm;
  text-align: right;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.item-obs {
  font-size: 10px;
  font-style: italic;
  padding-left: 4mm;
  margin-top: 1px;
}

/* Totais */
.totais { margin-top: 2px; }
.total-linha {
  display: flex;
  align-items: baseline;
  gap: 3px;
  margin: 2px 0;
}
.total-linha span:first-child,
.total-linha strong:first-child {
  flex: 0 0 auto;
}
.total-linha span:last-child,
.total-linha strong:last-child {
  flex: 0 0 auto;
  min-width: 20mm;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.total-final { font-size: 13px; padding-top: 3px; }

/* Rodapé */
.rodape { font-size: 10.5px; }
.rodape div { margin: 2px 0; }

.agradecimento { text-align: center; font-size: 11px; padding: 4px 0 0 0; }

/* ─── Impressão térmica 80mm ─────────────────────────────── */
@media print {
  @page {
    size: 80mm auto;
    margin: 0;
  }
  body { background: #fff !important; }
  .comanda-wrapper { background: #fff; min-height: 0; }
  .no-print { display: none !important; }
  .comanda {
    max-width: 80mm;
    width: 80mm;
    padding: 3mm;
    margin: 0;
    box-shadow: none;
  }
}

/* Fallback para impressoras A4 (comanda centralizada) */
@media print and (min-width: 120mm) {
  @page {
    size: A4;
    margin: 15mm;
  }
  .comanda {
    margin: 0 auto;
    border: 1px solid #ccc;
    padding: 6mm;
  }
}
</style>
