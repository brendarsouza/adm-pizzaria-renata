<script setup lang="ts">
import { parseCSV, groupIntoDomain, type CSVParseError, type GroupedMenu } from '~/domain/rules/csvMenuImporter'

const menu = useMenuStore()

const fileInput = ref<HTMLInputElement | null>(null)
const fileName = ref<string>('')
const isDragging = ref(false)
const csvContent = ref<string>('')
const parseErrors = ref<CSVParseError[]>([])
const grouped = ref<GroupedMenu | null>(null)
const overwrite = ref(false)
const importing = ref(false)
const result = ref<{ imported: number; skipped: number; errors: Array<{ name: string; error: string }> } | null>(null)

const totalDetected = computed(() => grouped.value
  ? grouped.value.flavors.length + grouped.value.snacks.length + grouped.value.beverages.length
  : 0)

async function readFile(file: File) {
  fileName.value = file.name
  result.value = null
  const text = await file.text()
  csvContent.value = text
  const parsed = parseCSV(text)
  parseErrors.value = parsed.errors
  grouped.value = groupIntoDomain(parsed.rows)
}

function onSelectFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) readFile(file)
}
function onDrop(e: DragEvent) {
  isDragging.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file) readFile(file)
}

async function doImport() {
  if (!grouped.value) return
  importing.value = true
  try {
    result.value = await menu.importFromCSV(grouped.value, overwrite.value)
  } catch (e) {
    result.value = { imported: 0, skipped: 0, errors: [{ name: '(geral)', error: (e as Error).message }] }
  } finally {
    importing.value = false
  }
}

function reset() {
  fileName.value = ''
  csvContent.value = ''
  grouped.value = null
  parseErrors.value = []
  result.value = null
  overwrite.value = false
  if (fileInput.value) fileInput.value.value = ''
}
</script>

<template>
  <div>
    <div
      class="border-2 border-dashed rounded-card p-8 text-center transition-colors"
      :class="isDragging ? 'border-primary bg-primary/5' : 'border-border bg-surface/40'"
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @drop.prevent="onDrop"
    >
      <input ref="fileInput" type="file" accept=".csv,text/csv" class="hidden" @change="onSelectFile" />
      <div class="text-4xl mb-2">📄</div>
      <p class="text-sm text-text-light mb-3">
        Arraste o arquivo <code>.csv</code> aqui
        <br>ou
      </p>
      <button class="btn-secondary" @click="fileInput?.click()">Selecionar arquivo</button>
      <p class="text-xs text-text-light mt-4">
        Formato esperado: <code>categoria,subcategoria,nome,descricao,preco,tamanho,ativo</code>
      </p>
    </div>

    <div v-if="fileName" class="card mt-4">
      <div class="flex items-start justify-between gap-4">
        <div class="flex-1">
          <p class="text-sm font-medium">📎 {{ fileName }}</p>
          <p class="text-xs text-text-light mt-1">
            {{ totalDetected }} item(ns) pronto(s) para importar
            <span v-if="parseErrors.length" class="text-status-cancelled">
              · {{ parseErrors.length }} linha(s) com erro
            </span>
          </p>
        </div>
        <button class="text-xs text-text-light hover:text-text" @click="reset">Limpar</button>
      </div>

      <div v-if="grouped && totalDetected > 0" class="mt-4 grid grid-cols-3 gap-3 text-sm">
        <div class="bg-surface rounded-btn p-3 text-center">
          <div class="text-xs text-text-light uppercase">Pizzas</div>
          <div class="font-serif text-xl text-primary">{{ grouped.flavors.length }}</div>
        </div>
        <div class="bg-surface rounded-btn p-3 text-center">
          <div class="text-xs text-text-light uppercase">Lanches/Porções</div>
          <div class="font-serif text-xl text-primary">{{ grouped.snacks.length }}</div>
        </div>
        <div class="bg-surface rounded-btn p-3 text-center">
          <div class="text-xs text-text-light uppercase">Bebidas</div>
          <div class="font-serif text-xl text-primary">{{ grouped.beverages.length }}</div>
        </div>
      </div>

      <details v-if="grouped && grouped.flavors.length" class="mt-4 text-xs">
        <summary class="cursor-pointer text-text-light hover:text-text">Prévia (primeiros 3 itens de cada)</summary>
        <div class="mt-2 space-y-2 text-text-light">
          <div v-if="grouped.flavors.length">
            <strong>Pizzas:</strong>
            <ul class="ml-4 list-disc">
              <li v-for="f in grouped.flavors.slice(0, 3)" :key="f.name">
                {{ f.name }} ({{ f.category }}) — {{ formatBRL(f.priceBySize.GRANDE || 0) }}
              </li>
            </ul>
          </div>
          <div v-if="grouped.snacks.length">
            <strong>Lanches/Porções:</strong>
            <ul class="ml-4 list-disc">
              <li v-for="s in grouped.snacks.slice(0, 3)" :key="s.name">
                {{ s.name }} ({{ s.kind }})
                <span v-if="s.sizes"> · tamanhos: {{ s.sizes.map(x => x.label).join(', ') }}</span>
                <span v-else> · {{ formatBRL(s.price) }}</span>
              </li>
            </ul>
          </div>
          <div v-if="grouped.beverages.length">
            <strong>Bebidas:</strong>
            <ul class="ml-4 list-disc">
              <li v-for="b in grouped.beverages.slice(0, 3)" :key="b.name">
                {{ b.name }} · {{ b.variants.map(v => v.label).join(', ') }}
              </li>
            </ul>
          </div>
        </div>
      </details>

      <details v-if="parseErrors.length" class="mt-3 text-xs">
        <summary class="cursor-pointer text-status-cancelled hover:opacity-80">
          ⚠️ {{ parseErrors.length }} erro(s) de parse
        </summary>
        <ul class="mt-2 ml-4 list-disc text-text-light space-y-1 max-h-40 overflow-y-auto">
          <li v-for="err in parseErrors" :key="err.linha">
            Linha {{ err.linha }}: {{ err.erro }}
          </li>
        </ul>
      </details>

      <div class="mt-4 flex items-center justify-between gap-3 pt-4 border-t border-border">
        <label class="flex items-center gap-2 text-sm cursor-pointer">
          <input v-model="overwrite" type="checkbox" />
          <span>Sobrescrever itens já existentes (match por nome)</span>
        </label>
        <button class="btn-primary" :disabled="importing || totalDetected === 0" @click="doImport">
          {{ importing ? 'Importando…' : `Importar ${totalDetected} item(ns)` }}
        </button>
      </div>
    </div>

    <div v-if="result" class="card mt-4" :class="result.errors.length ? 'border-status-cancelled/30' : 'border-status-delivered/40'">
      <h4 class="font-serif text-lg mb-2">
        <span v-if="!result.errors.length">✅ Importação concluída</span>
        <span v-else>⚠️ Importação concluída com erros</span>
      </h4>
      <ul class="text-sm space-y-1">
        <li>✓ <strong>{{ result.imported }}</strong> item(ns) importado(s)</li>
        <li v-if="result.skipped">↷ <strong>{{ result.skipped }}</strong> ignorado(s) (já existiam)</li>
        <li v-if="result.errors.length">✕ <strong>{{ result.errors.length }}</strong> erro(s) durante gravação</li>
      </ul>
      <details v-if="result.errors.length" class="mt-3 text-xs">
        <summary class="cursor-pointer text-text-light">Ver erros</summary>
        <ul class="mt-2 ml-4 list-disc text-text-light space-y-1">
          <li v-for="(err, i) in result.errors" :key="i">
            <strong>{{ err.name }}:</strong> {{ err.error }}
          </li>
        </ul>
      </details>
    </div>
  </div>
</template>
