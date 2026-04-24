<script setup lang="ts">
import type { PricingRule } from '~/types'
const menu = useMenuStore()
const auth = useAuthStore()
onMounted(() => menu.loadAll())

const form = reactive({ stuffedCrustPrice: 15, halfHalfRule: 'HYBRID' as PricingRule })
watch(() => menu.settings, (s) => {
  form.stuffedCrustPrice = s.stuffedCrustPrice
  form.halfHalfRule = s.halfHalfRule
}, { immediate: true, deep: true })

const saving = ref(false)
const saved = ref(false)
async function save() {
  saving.value = true
  try {
    await menu.saveSettings({ stuffedCrustPrice: form.stuffedCrustPrice, halfHalfRule: form.halfHalfRule })
    saved.value = true
    setTimeout(() => saved.value = false, 2000)
  } finally {
    saving.value = false
  }
}

// bootstrap admin
const showBootstrap = ref(false)
const bootstrapMsg = ref('')
async function bootstrapAdmin() {
  if (!auth.user) return
  try {
    const token = await auth.getIdToken()
    const res = await $fetch<{ ok: boolean; message?: string }>('/api/users/bootstrap-admin', {
      method: 'POST',
      body: { uid: auth.user.uid },
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
    bootstrapMsg.value = res.message || 'Admin promovido.'
  } catch (e: any) {
    bootstrapMsg.value = e?.statusMessage || e?.message || 'Erro'
  }
}
</script>

<template>
  <div>
    <header class="mb-6">
      <h1>Configurações</h1>
      <p class="text-text-light mt-1">Preferências do cardápio e do sistema</p>
    </header>

    <section class="card max-w-2xl">
      <h2 class="font-serif text-lg mb-4">Precificação</h2>
      <form class="space-y-4" @submit.prevent="save">
        <div>
          <label class="label">Valor da borda recheada (R$)</label>
          <input v-model.number="form.stuffedCrustPrice" type="number" step="0.01" class="input" />
        </div>
        <div>
          <label class="label">Regra de precificação meio-a-meio</label>
          <select v-model="form.halfHalfRule" class="input">
            <option value="HYBRID">Híbrida (Pizzaria Renata) — salgada+salgada=média · com doce=maior valor</option>
            <option value="HIGHEST">Maior valor (sempre)</option>
            <option value="AVERAGE">Média (sempre)</option>
          </select>
          <p class="text-xs text-text-light mt-2">
            Na regra híbrida: quando ambas as metades são salgadas → média. Quando alguma metade é doce → maior valor.
          </p>
        </div>
        <div class="flex items-center gap-3">
          <button type="submit" class="btn-primary" :disabled="saving">{{ saving ? 'Salvando…' : 'Salvar' }}</button>
          <span v-if="saved" class="text-sm text-status-delivered">✓ Salvo</span>
        </div>
      </form>
    </section>

    <section class="card max-w-2xl mt-6">
      <h2 class="font-serif text-lg mb-2">Primeiro administrador</h2>
      <p class="text-sm text-text-light mb-4">
        Use apenas uma vez, ao configurar o sistema pela primeira vez.
        Esta ação define o usuário atual como admin no Firebase Auth.
      </p>
      <button class="btn-secondary" @click="bootstrapAdmin">Promover meu usuário a admin</button>
      <p v-if="bootstrapMsg" class="text-sm mt-3">{{ bootstrapMsg }}</p>
    </section>
  </div>
</template>
