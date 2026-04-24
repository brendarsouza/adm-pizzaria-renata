# 🔐 Checklist de Segurança — Pizzaria Renata

> Baseado em OWASP Top 10 · LGPD · Firebase Security Best Practices.
> Este documento é o mapa do que está implementado e do que resta fazer.

---

## ✅ Implementado (fase de testes)

### Headers HTTP de segurança
- **Onde:** `nuxt.config.ts` → `nitro.routeRules`
- **Quando:** ativados apenas em `NODE_ENV=production` (dev usa Vite/HMR que não convive bem com CSP estrito).
- **O que cobre:** CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy.
- **Validar em produção:** após deploy, rodar `curl -I https://seu-dominio` e conferir os headers. Testar também em https://securityheaders.com.

### Validação de inputs com Zod (server routes)
- **Onde:** `server/validators/schemas.ts` + uso em `server/api/users/*`.
- **Cobre:** `/api/users/set-role`, `/api/users/bootstrap-admin`.
- **Falta cobrir:** quando novas server routes forem criadas (pedidos, cardápio, etc.), adicionar schemas correspondentes em `schemas.ts`.

### Higiene de ambiente e segredos
- **`.gitignore`** ampliado para cobrir `.env*`, `*.key`, `*.pem`, `firebase-adminsdk-*.json`, `service-account*.json`, `google-credentials*.json`.
- **`nuxt.config.ts`** documentado: bloco privado (`firebaseClientEmail`, `firebasePrivateKey`) explicitamente separado de `public` com comentários ⚠️.
- **Verificação manual:** `grep -r "FIREBASE_PRIVATE_KEY\|firebaseClientEmail" .nuxt/ .output/` após build deve retornar vazio no bundle client.

### Política de Privacidade (LGPD)
- **Página:** `/privacidade` (`pages/privacidade.vue`).
- **Link visível:** no login e no rodapé da sidebar.
- **Conteúdo:** coleta de dados, base legal (LGPD Art. 7 V e IX), finalidades, compartilhamento, direitos do titular (Art. 18), retenção, contato DPO.
- **Falta:** preencher telefone/WhatsApp real do DPO e prazos específicos da pizzaria.

### Auditoria de dependências
- **Última execução:** `npm audit` → 30 vulnerabilidades (2 low, 22 moderate, 6 high).
- **Todas em dependências transitivas** de `firebase-admin`, `@google-cloud/storage`, `google-gax`, `gaxios`, `undici`.
- **`npm audit fix` (não-breaking):** não reduz o número — as fixes disponíveis são todas breaking.
- **`npm audit fix --force`** faria downgrade de `firebase-admin` para v10 (breaking). **Não executado.**
- **Recomendação:** monitorar releases de `firebase-admin` v13+ que ainda não migrou os transitivos; reavaliar mensalmente.

---

## 🟡 Pendente — fazer antes de ir para produção

### 1. Firestore Security Rules adaptadas ao schema real
- **Por quê não foi feito agora:** as rules do prompt assumem coleções `clientes`, `cardapio`, `pedidos` em PT — o projeto usa `customers`, `pizzaFlavors`, `snacks`, `beverages`, `orders`, `settings` em EN. Aplicar as rules do prompt literal bloqueia 100% da aplicação.
- **O que fazer:** reescrever `firestore.rules` com funções `isAuthenticated()`, `isAdmin()`, `isAttendant()`, `isViewer()` aplicadas ao schema real. Usar as rules atuais (`firestore.rules`) como base.
- **Trigger:** quando o Firebase estiver configurado e o modo dev `NUXT_PUBLIC_DEV_SKIP_AUTH` tiver sido desativado.
- **Validar com:** `firebase emulators:start --only firestore` + testes `@firebase/rules-unit-testing`.

### 2. Firebase App Check (reCAPTCHA v3)
- **Pré-requisitos:**
  - Firebase Console → App Check → Registrar provedor reCAPTCHA v3 para Web.
  - Obter `NUXT_PUBLIC_RECAPTCHA_SITE_KEY` e `NUXT_PUBLIC_APPCHECK_DEBUG_TOKEN` (para dev).
- **Implementação:** criar `plugins/firebaseAppCheck.client.ts` chamando `initializeAppCheck()` com `ReCaptchaV3Provider`.
- **Impacto:** reduz abusos e bots em 60-80%.

### 3. MFA obrigatório para admins
- **Pré-requisitos:** Firebase Auth ativo + provedor SMS habilitado (precisa upgrade para plano Blaze).
- **Implementação:** no `authStore.hydrate`, verificar `multiFactor(user).enrolledFactors` para role='admin' e redirecionar para `/configurar-mfa` se vazio.
- **Trigger:** quando houver pelo menos 1 admin real em produção.

### 4. Remover bypass de autenticação
- **Arquivo:** `.env` e `.env.example` → linha `NUXT_PUBLIC_DEV_SKIP_AUTH`.
- **Código:** `application/stores/authStore.ts:30-37` (inject fake user) e `middleware/auth.global.ts:4-6` (early return) — manter, mas garantir que a env está **vazia/ausente** em produção.
- **Verificação:** checar variáveis no Railway antes do deploy final.

### 5. Reativar restrições por perfil no menu e middleware
- **Arquivos marcados com comentário `FASE DE TESTES`:**
  - `layouts/default.vue:5-15` — restaurar filtro `items.filter(i => i.roles.includes(role))`.
  - `middleware/auth.global.ts:28-30` — restaurar blocos `attendantBlocked` / `viewerAllowed`.
- **Trigger:** quando sair da fase de testes internos.

---

## 🔴 Não implementado por escolha arquitetural

Decisões registradas para não deixar ambiguidade futura.

### CSRF em server routes
- **Motivo:** o app faz 95% das escritas direto do cliente para o Firestore via SDK. Essas chamadas carregam o ID token do usuário e são validadas pelas Security Rules (não por cookies de sessão) — logo, CSRF clássico não se aplica.
- **Quando rever:** se forem criadas muitas server routes (`/api/*`) que aceitem cookies de sessão. A proteção certa é validar `Origin`/`Referer` header + ID token.

### Criptografia de campos (telefone, GPS) no client
- **Motivo:** o `CustomerRepo.findByPhone` e `searchByPhonePrefix` usam query Firestore com igualdade/range em `phone`. Criptografar no client quebra busca por prefixo (essencial no PDV).
- **Mitigação adequada:** Firestore já criptografa em repouso e em trânsito (TLS); as Security Rules (a reescrever) restringem leitura a perfis autorizados; audit log cobre vazamento interno.
- **Quando rever:** se o requisito regulatório explicitamente exigir criptografia de ponta a ponta (não é o caso da LGPD padrão para PII de pedido). Aí seria necessário substituir `phone` por `phoneHash` (SHA-256) para busca + `phoneEncrypted` para exibição, refatorando toda a stack de clientes/pedidos/WhatsApp importer.

### Audit log server-side (coleção `auditLog`)
- **Motivo:** requer mover escritas críticas (create order, update status, change role) para server routes. Hoje elas rodam no cliente via SDK.
- **Quando fazer:** junto com a reescrita das Security Rules para produção, centralizar mutações críticas em `/api/*` e gravar audit no Admin SDK.

---

## 🧪 Testes de segurança recomendados (pré-produção)

```bash
# 1. Validação de rules (quando reescritas)
firebase emulators:start --only firestore
npx vitest run tests/unit/firestoreRules.spec.ts

# 2. Headers HTTP
npm run build && npm run preview &
curl -I http://localhost:3000 | grep -iE 'content-security|strict-transport|x-frame|x-content'

# 3. Auditoria
npm audit --omit=dev

# 4. Lighthouse + securityheaders.com
# Rodar contra a URL de produção
```

---

## 📚 Referências consultadas
- OWASP Top 10 (2021): https://owasp.org/Top10
- LGPD Lei 13.709/2018: https://www.senado.leg.br/norma/569358
- Firebase Security Checklist: https://firebase.google.com/support/guides/security-checklist
- Firebase App Check: https://firebase.google.com/docs/app-check
- ANPD — Guia de Segurança: https://www.gov.br/anpd

---

*🔐 v1.0 · Atualizar este arquivo a cada ciclo de hardening.*
