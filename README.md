# 🍕 Sistema Pizzaria Renata

Sistema web completo de gestão e PDV para a Pizzaria Renata.

## Stack

- **Nuxt 3** (Vue 3 + SSR) + TypeScript strict
- **TailwindCSS v3** com design system próprio (vinho/bege)
- **Pinia** (state management)
- **Firebase Auth** (Google + e-mail/senha) + Firestore (banco tempo real)
- **Server routes** Nitro (backend embutido)
- **Vitest** (unit) + **Playwright** (e2e)
- Deploy em **Railway**

## Setup local

```bash
npm install
cp .env.example .env   # preencher com credenciais Firebase (ver abaixo)
npm run dev            # http://localhost:3000
```

### Configuração Firebase (obrigatório para Auth/Firestore)

1. Crie um projeto em https://console.firebase.google.com
2. Ative **Authentication** → provedores Google e E-mail/Senha
3. Ative **Firestore Database** (modo produção)
4. Em _Project Settings → General_: copie API Key, Auth Domain, Project ID, App ID → preencha `NUXT_PUBLIC_FIREBASE_*` no `.env`
5. Em _Project Settings → Service Accounts_: gere uma chave privada → preencha `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` no `.env` (a private key precisa dos `\n` escapados ou entre aspas duplas com quebras reais)
6. Faça o seed inicial: `npm run dev` → acesse `/api/seed` (protegido; rode só uma vez)

## Scripts

| Script | Descrição |
|---|---|
| `npm run dev` | Dev server com HMR |
| `npm run build` | Build de produção (Nitro) |
| `npm run preview` | Preview do build |
| `npm run test` | Testes unitários (Vitest) |
| `npm run test:e2e` | Testes e2e (Playwright) |
| `npm run typecheck` | Validação TypeScript |

## Perfis de acesso

- **Administrador** — acesso total
- **Atendente** — pedidos + clientes + status (sem relatórios financeiros)
- **Visualizador** — somente leitura

Definidos via **custom claims** do Firebase (`role: 'admin' | 'attendant' | 'viewer'`).

## Deploy Railway

Push na `main` → Railway detecta `railway.json` → builda com Nixpacks → roda `node .output/server/index.mjs`.
Configure as variáveis de ambiente no dashboard da Railway (mesmas do `.env.example`).

## Estrutura

Ver `/docs` ou o prompt original em `prompt-pizzaria-renata.md`.

---

*🍕 Pizzaria Renata · v1.0*
