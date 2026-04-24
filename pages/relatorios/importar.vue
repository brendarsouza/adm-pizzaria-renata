<script setup lang="ts">
import { parseWhatsAppExport, extractHistoryEntries, type ParsedHistoryEntry } from '~/infrastructure/parsers/whatsappImporter'

const file = ref<File | null>(null)
const entries = ref<ParsedHistoryEntry[]>([])
const parsing = ref(false)
const imported = ref<number | null>(null)

async function onFile(e: Event) {
  const input = e.target as HTMLInputElement
  file.value = input.files?.[0] || null
  if (!file.value) return
  parsing.value = true
  const text = await file.value.text()
  const msgs = parseWhatsAppExport(text)
  entries.value = extractHistoryEntries(msgs)
  parsing.value = false
}

async function importCustomers() {
  let n = 0
  for (const e of entries.value) {
    if (!e.phone) continue
    try {
      await useCustomerStore().getOrCreateByPhone(e.customerName, e.phone)
      n++
    } catch {}
  }
  imported.value = n
}
</script>

<template>
  <div>
    <header class="mb-6">
      <NuxtLink to="/relatorios" class="text-sm text-primary hover:underline">← Relatórios</NuxtLink>
      <h1>Importar histórico WhatsApp</h1>
      <p class="text-text-light mt-1">Carregue o arquivo .txt exportado do WhatsApp. O sistema extrairá clientes, telefones e valores.</p>
    </header>

    <div class="card max-w-2xl">
      <label class="label">Arquivo .txt exportado</label>
      <input type="file" accept=".txt" class="input" @change="onFile" />

      <div v-if="parsing" class="mt-4 text-sm text-text-light">Processando…</div>

      <div v-if="entries.length" class="mt-6">
        <p class="text-sm mb-3"><strong>{{ entries.length }}</strong> entradas detectadas. Revise antes de importar:</p>
        <div class="max-h-80 overflow-y-auto border border-border rounded-btn">
          <table class="w-full text-sm">
            <thead class="text-left text-text-light bg-surface">
              <tr><th class="p-2">Data</th><th>Cliente</th><th>Telefone</th><th>Total</th></tr>
            </thead>
            <tbody>
              <tr v-for="(e, i) in entries.slice(0, 200)" :key="i" class="border-t border-border/40">
                <td class="p-2 text-xs">{{ e.date.toLocaleDateString('pt-BR') }}</td>
                <td>{{ e.customerName }}</td>
                <td class="font-mono text-xs">{{ e.phone || '—' }}</td>
                <td>{{ e.totalBRL ? formatBRL(e.totalBRL) : '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="mt-4 flex gap-3 items-center">
          <button class="btn-primary" @click="importCustomers">Importar clientes</button>
          <span v-if="imported !== null" class="text-sm text-status-delivered">✓ {{ imported }} clientes criados/atualizados</span>
        </div>
      </div>
    </div>
  </div>
</template>
