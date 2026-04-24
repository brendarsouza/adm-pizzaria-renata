export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return

  // DEV: bypass completo quando NUXT_PUBLIC_DEV_SKIP_AUTH=true
  const { public: pub } = useRuntimeConfig()
  if (pub.devSkipAuth === 'true') return

  const authStore = useAuthStore()
  await authStore.init()
  // aguarda hidratação inicial
  if (authStore.loading) {
    await new Promise<void>((resolve) => {
      const unwatch = watch(
        () => authStore.loading,
        (v) => { if (!v) { unwatch(); resolve() } },
        { immediate: true },
      )
    })
  }

  const isLogin = to.path === '/login'
  if (!authStore.isAuthenticated && !isLogin) {
    return navigateTo('/login')
  }
  if (authStore.isAuthenticated && isLogin) {
    return navigateTo('/')
  }
  // FASE DE TESTES: qualquer usuário autenticado tem acesso total.
  // Para reativar restrições por perfil, restaure os blocos `attendantBlocked` / `viewerAllowed`.
  return
})
