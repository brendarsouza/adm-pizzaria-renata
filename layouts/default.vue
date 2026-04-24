<script setup lang="ts">
const auth = useAuthStore()
const route = useRoute()

// FASE DE TESTES: todas as rotas visíveis para qualquer usuário autenticado.
// Para reativar restrições por perfil, restaure o filtro por `i.roles.includes(role)`.
const nav = computed(() => [
  { to: '/', label: 'Dashboard', icon: '◆' },
  { to: '/pedidos', label: 'Novo pedido (PDV)', icon: '✚' },
  { to: '/pedidos-ativos', label: 'Pedidos ativos', icon: '●' },
  { to: '/clientes', label: 'Clientes', icon: '◒' },
  { to: '/cardapio', label: 'Cardápio', icon: '▣' },
  { to: '/relatorios', label: 'Relatórios', icon: '▦' },
  { to: '/configuracoes', label: 'Configurações', icon: '⚙' },
])

const isLogin = computed(() => route.path === '/login')
</script>

<template>
  <div v-if="isLogin" class="min-h-screen bg-bg">
    <slot />
  </div>
  <div v-else class="flex min-h-screen bg-bg">
    <aside class="w-64 bg-primary-dark text-white flex-shrink-0 hidden md:flex md:flex-col">
      <div class="p-6 border-b border-white/10">
        <h1 class="font-serif text-xl text-white">Pizzaria Renata</h1>
        <p class="text-xs text-white/60 mt-1">Sistema de Gestão</p>
      </div>
      <nav class="flex-1 p-3 space-y-0.5 overflow-y-auto">
        <NuxtLink
          v-for="item in nav"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-3 px-3 py-2 rounded-btn text-sm text-white/80 hover:bg-white/10 hover:text-white transition-colors"
          active-class="bg-white/15 text-white font-medium"
        >
          <span class="w-4 text-center opacity-70">{{ item.icon }}</span>
          {{ item.label }}
        </NuxtLink>
      </nav>
      <div class="p-4 border-t border-white/10 text-xs">
        <div class="text-white/60">{{ auth.user?.displayName || auth.user?.email }}</div>
        <div class="text-white/40 mb-2 capitalize">{{ auth.role }}</div>
        <button class="text-white/70 hover:text-white underline" @click="auth.logout()">Sair</button>
        <NuxtLink to="/privacidade" class="block mt-3 text-white/40 hover:text-white/70 text-[10px]">
          Política de Privacidade
        </NuxtLink>
      </div>
    </aside>
    <main class="flex-1 overflow-y-auto">
      <div class="md:hidden bg-primary-dark text-white px-4 py-3 flex items-center justify-between">
        <h1 class="font-serif">Pizzaria Renata</h1>
        <button class="text-sm underline" @click="auth.logout()">Sair</button>
      </div>
      <div class="p-4 md:p-8 max-w-7xl mx-auto">
        <slot />
      </div>
    </main>
  </div>
</template>
