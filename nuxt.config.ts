// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-10-01',
  devtools: { enabled: true },
  ssr: true,
  modules: [
    '@nuxtjs/tailwindcss',
    '@pinia/nuxt',
    '@vueuse/nuxt',
    '@vite-pwa/nuxt',
  ],
  imports: {
    dirs: ['stores', 'composables', 'application/stores', 'domain/rules', 'domain/value-objects'],
  },
  // Auto-importa componentes de subpastas SEM prefixar com o nome da pasta.
  // Ex.: components/shared/BaseModal.vue → <BaseModal /> (e não <SharedBaseModal />)
  components: [
    { path: '~/components', pathPrefix: false },
  ],
  css: ['~/assets/css/main.css'],
  typescript: {
    strict: true,
    typeCheck: false,
  },
  runtimeConfig: {
    // ⚠️ PRIVADO — server-side apenas. NUNCA colocar em `public`.
    firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
    firebaseClientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    firebasePrivateKey: process.env.FIREBASE_PRIVATE_KEY,
    public: {
      // ✓ PÚBLICO — pode ir para o browser
      firebaseApiKey: process.env.NUXT_PUBLIC_FIREBASE_API_KEY,
      firebaseAuthDomain: process.env.NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      firebaseProjectId: process.env.NUXT_PUBLIC_FIREBASE_PROJECT_ID,
      firebaseAppId: process.env.NUXT_PUBLIC_FIREBASE_APP_ID,
      // DEV ONLY: quando 'true', pula autenticação e usa um usuário fake admin
      devSkipAuth: process.env.NUXT_PUBLIC_DEV_SKIP_AUTH || '',
    },
  },
  // ─── Security headers (OWASP) ──────────────────────────────────────────────
  // Desativados em dev (Vite/HMR quebram com CSP estrito). Aplicados em produção.
  nitro: {
    routeRules: process.env.NODE_ENV === 'production' ? {
      '/**': {
        headers: {
          'Content-Security-Policy': [
            "default-src 'self'",
            // 'unsafe-inline' necessário para hydration do Nuxt
            "script-src 'self' 'unsafe-inline' https://www.gstatic.com https://apis.google.com https://www.google.com https://www.recaptcha.net",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' https://fonts.gstatic.com data:",
            "img-src 'self' data: https:",
            // Firestore + Auth + reCAPTCHA endpoints
            "connect-src 'self' https://*.firebaseio.com https://*.googleapis.com https://*.google.com wss://*.firebaseio.com https://firestore.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com",
            "frame-src https://www.google.com https://*.firebaseapp.com https://www.recaptcha.net",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            "frame-ancestors 'none'",
          ].join('; '),
          'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
          'X-Frame-Options': 'DENY',
          'X-Content-Type-Options': 'nosniff',
          'Referrer-Policy': 'strict-origin-when-cross-origin',
          'Permissions-Policy': 'camera=(), microphone=(), geolocation=(self), payment=()',
        },
      },
    } : {},
  },
  app: {
    head: {
      title: 'Pizzaria Renata · Gestão',
      htmlAttrs: { lang: 'pt-BR' },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'theme-color', content: '#6B1A1A' },
        { name: 'description', content: 'Sistema de gestão e PDV da Pizzaria Renata' },
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@500;600;700&family=JetBrains+Mono:wght@400;500&display=swap',
        },
      ],
    },
  },
  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'Pizzaria Renata',
      short_name: 'Renata',
      theme_color: '#6B1A1A',
      background_color: '#FAF8F5',
      display: 'standalone',
      lang: 'pt-BR',
      icons: [
        { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      ],
    },
    workbox: {
      navigateFallback: '/',
      globPatterns: ['**/*.{js,css,html,png,svg,ico,woff2}'],
    },
    devOptions: { enabled: false },
  },
})
