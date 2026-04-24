<script setup lang="ts">
definePageMeta({ layout: 'default' })
const auth = useAuthStore()
const email = ref('')
const password = ref('')
const submitting = ref(false)

async function doLogin() {
  submitting.value = true
  try {
    await auth.loginWithEmail(email.value, password.value)
    await navigateTo('/')
  } finally {
    submitting.value = false
  }
}
async function doGoogle() {
  submitting.value = true
  try {
    await auth.loginWithGoogle()
    await navigateTo('/')
  } finally {
    submitting.value = false
  }
}
async function doDev() {
  submitting.value = true
  try {
    auth.loginAsDev()
    await navigateTo('/')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center p-4">
    <div class="w-full max-w-md">
      <div class="text-center mb-8">
        <h1 class="font-serif text-4xl text-primary">Pizzaria Renata</h1>
        <p class="text-text-light mt-2">Sistema de Gestão</p>
      </div>
      <div class="card">
        <h2 class="font-serif text-xl mb-6">Entrar</h2>
        <form class="space-y-4" @submit.prevent="doLogin">
          <div>
            <label class="label" for="email">E-mail</label>
            <input id="email" v-model="email" type="email" class="input" required autocomplete="email" />
          </div>
          <div>
            <label class="label" for="password">Senha</label>
            <input id="password" v-model="password" type="password" class="input" required autocomplete="current-password" />
          </div>
          <button type="submit" class="btn-primary w-full" :disabled="submitting">
            {{ submitting ? 'Entrando…' : 'Entrar' }}
          </button>
        </form>
        <div class="my-4 text-center text-xs text-text-light uppercase tracking-wider">ou</div>
        <button class="btn-secondary w-full" :disabled="submitting" @click="doGoogle">
          Entrar com Google
        </button>
        <p v-if="auth.error" class="mt-4 text-sm text-status-cancelled">{{ auth.error }}</p>
      </div>

      <div class="mt-4 border border-dashed border-border rounded-card p-4 bg-surface/60">
        <div class="flex items-center gap-2 mb-2">
          <span class="text-xs uppercase tracking-wider text-text-light">Modo desenvolvedor</span>
          <span class="badge bg-accent/15 text-accent">DEV</span>
        </div>
        <p class="text-xs text-text-light mb-3">
          Acesso sem autenticação para testes. Acesso total como administrador.
        </p>
        <button class="btn-ghost w-full border border-border" :disabled="submitting" @click="doDev">
          🛠 Entrar sem autenticação
        </button>
      </div>
      <p class="text-center text-xs text-text-light mt-6">
        🍕 Acesso restrito · Pizzaria Renata © {{ new Date().getFullYear() }}
        · <NuxtLink to="/privacidade" class="underline hover:text-primary">Privacidade</NuxtLink>
      </p>
    </div>
  </div>
</template>
