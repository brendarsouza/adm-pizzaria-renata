# Diagrama de Sequência — Pizzaria Renata

## 1. Autenticação (Login)

```mermaid
sequenceDiagram
    actor Usuario
    participant Browser
    participant Middleware as auth.global.ts
    participant AuthStore as authStore.ts
    participant FirebaseAuth as Firebase Auth SDK
    participant Firestore as Cloud Firestore

    Usuario->>Browser: Acessa /login
    Browser->>Middleware: Navegação
    Middleware->>AuthStore: init()
    AuthStore->>FirebaseAuth: onIdTokenChanged()
    FirebaseAuth-->>AuthStore: Usuário nulo
    AuthStore-->>Middleware: Não autenticado
    Middleware-->>Browser: Permite /login

    alt Login com E-mail/Senha
        Usuario->>Browser: Preenche e-mail + senha
        Browser->>AuthStore: loginWithEmail(email, password)
        AuthStore->>FirebaseAuth: signInWithEmailAndPassword()
        FirebaseAuth-->>AuthStore: Token + User
        AuthStore->>AuthStore: hydrate(user)
        AuthStore-->>Browser: Autenticado
        Browser->>Browser: navigateTo('/')
    else Login com Google
        Usuario->>Browser: Clica "Entrar com Google"
        Browser->>AuthStore: loginWithGoogle()
        AuthStore->>FirebaseAuth: signInWithPopup(GoogleProvider)
        FirebaseAuth-->>AuthStore: Token + User
        AuthStore->>AuthStore: hydrate(user)
        AuthStore-->>Browser: Autenticado
        Browser->>Browser: navigateTo('/')
    else Login Dev (bypass)
        Usuario->>Browser: Clica "Entrar sem autenticação"
        Browser->>AuthStore: loginAsDev()
        AuthStore->>AuthStore: user fake (role=dev)
        AuthStore-->>Browser: Autenticado
        Browser->>Browser: navigateTo('/')
    end

    Browser->>Middleware: Navegação para / (autenticado)
    Middleware->>AuthStore: init()
    AuthStore-->>Middleware: isAuthenticated = true
    Middleware-->>Browser: Permite acesso
```

## 2. Criar Pedido (PDV Completo)

```mermaid
sequenceDiagram
    actor Atendente
    participant PagePDV as pages/pedidos.vue
    participant OrderStore as orderStore.ts
    participant CustomerStore as customerStore.ts
    participant MenuStore as menuStore.ts
    participant Domain as Domain Rules
    participant CustomerRepo as CustomerRepo
    participant OrderRepo as OrderRepo
    participant FirestoreAdapter as FirestoreAdapter
    participant Firestore as Cloud Firestore

    Atendente->>PagePDV: Acessa /pedidos
    PagePDV->>MenuStore: loadAll()
    MenuStore->>FirestoreAdapter: find() múltiplas coleções
    FirestoreAdapter->>Firestore: Queries de cardápio
    Firestore-->>FirestoreAdapter: Sabores, adicionais, lanches, bebidas
    FirestoreAdapter-->>MenuStore: Dados do cardápio
    MenuStore-->>PagePDV: Cardápio carregado

    Atendente->>PagePDV: Busca cliente por nome/telefone
    PagePDV->>CustomerStore: searchSmart(term)
    CustomerStore->>CustomerRepo: searchByTokens(term)
    CustomerRepo->>FirestoreAdapter: find('customers', array-contains)
    FirestoreAdapter->>Firestore: Query searchTokens
    Firestore-->>FirestoreAdapter: Resultados
    FirestoreAdapter-->>CustomerRepo: Clientes
    CustomerRepo-->>CustomerStore: Clientes
    CustomerStore-->>PagePDV: Lista de clientes

    alt Cliente novo
        Atendente->>PagePDV: Cadastra novo cliente
        PagePDV->>CustomerStore: getOrCreateByPhone(name, phone)
        CustomerStore->>Domain: Phone.fromRaw()
        CustomerStore->>CustomerRepo: findByPhone() / create()
        CustomerRepo->>FirestoreAdapter: find() / create('customers')
        FirestoreAdapter->>Firestore: addDoc / query
        Firestore-->>FirestoreAdapter: Cliente criado
        FirestoreAdapter-->>CustomerRepo: Cliente
        CustomerRepo-->>CustomerStore: Cliente
        CustomerStore-->>PagePDV: Cliente selecionado
    else Cliente existente
        Atendente->>PagePDV: Seleciona cliente
        PagePDV->>OrderStore: setCustomer(c)
        OrderStore-->>PagePDV: Rascunho atualizado
    end

    alt Endereço novo
        Atendente->>PagePDV: Adiciona endereço
        PagePDV->>CustomerStore: addAddress(customerId, addr)
        CustomerStore->>CustomerRepo: update('customers', {addresses})
        CustomerRepo->>FirestoreAdapter: update()
        FirestoreAdapter->>Firestore: updateDoc
        Firestore-->>FirestoreAdapter: OK
        FirestoreAdapter-->>CustomerRepo: OK
        CustomerRepo-->>CustomerStore: Endereço salvo
        CustomerStore-->>PagePDV: Endereço selecionado
    end
    PagePDV->>OrderStore: setAddress(addr)

    Atendente->>PagePDV: Adiciona itens (pizza/lanche/bebida)
    PagePDV->>OrderStore: addItem(item)
    OrderStore->>Domain: calcularPrecoItem() / calcularSubtotal()
    Domain->>Domain: pizzaPricer / Money VO
    Domain-->>OrderStore: Preço calculado
    OrderStore-->>PagePDV: Itens + subtotal

    Atendente->>PagePDV: Define pagamento (PIX/Dinheiro/Cartão)
    PagePDV->>OrderStore: setPayment(payment)
    OrderStore->>Domain: pagamentoEstaValido()
    Domain-->>OrderStore: Validação OK
    OrderStore-->>PagePDV: Pagamento registrado

    Atendente->>PagePDV: Finaliza pedido
    PagePDV->>OrderStore: createOrder(uid)
    OrderStore->>OrderStore: Valida rascunho
    OrderStore->>Domain: calcularTotalPedido()
    Domain-->>OrderStore: Total
    OrderStore->>OrderRepo: create(orderData)
    OrderRepo->>FirestoreAdapter: create('orders')
    FirestoreAdapter->>Firestore: addDoc
    Firestore-->>FirestoreAdapter: ID gerado
    FirestoreAdapter-->>OrderRepo: ID
    OrderRepo-->>OrderStore: Pedido criado
    OrderStore->>OrderStore: resetDraft()
    OrderStore-->>PagePDV: Pedido confirmado (#sequencial)
```

## 3. Acompanhamento de Pedidos em Tempo Real

```mermaid
sequenceDiagram
    actor Atendente
    participant Dashboard as pages/index.vue
    participant ActivePage as pages/pedidos-ativos/index.vue
    participant DetailPage as pages/pedidos-ativos/[id].vue
    participant OrderStore as orderStore.ts
    participant OrderRepo as OrderRepo
    participant FirestoreAdapter as FirestoreAdapter
    participant Firestore as Cloud Firestore

    Atendente->>Dashboard: Acessa / (Dashboard)
    Dashboard->>OrderStore: subscribeActive()
    OrderStore->>OrderRepo: watchActive(cb)
    OrderRepo->>FirestoreAdapter: watch('orders', status in [OPEN, PREPARING...])
    FirestoreAdapter->>Firestore: onSnapshot(query)
    Firestore-->>FirestoreAdapter: Stream de pedidos ativos
    FirestoreAdapter-->>OrderRepo: Pedidos atualizados
    OrderRepo-->>OrderStore: activeOrders[]
    OrderStore-->>Dashboard: todayStats + activeOrders

    Atendente->>ActivePage: Acessa /pedidos-ativos
    ActivePage->>OrderStore: subscribeActive()
    OrderStore->>OrderRepo: watchActive(cb)
    OrderRepo->>FirestoreAdapter: watch('orders')
    FirestoreAdapter->>Firestore: onSnapshot
    Firestore-->>FirestoreAdapter: Stream em tempo real
    FirestoreAdapter-->>OrderRepo: Pedidos
    OrderRepo-->>OrderStore: activeOrders
    OrderStore-->>ActivePage: Lista com filtros

    Atendente->>DetailPage: Acessa /pedidos-ativos/:id
    DetailPage->>OrderStore: fetchOrder(id)
    OrderStore->>OrderRepo: get(id)
    OrderRepo->>FirestoreAdapter: findById('orders', id)
    FirestoreAdapter->>Firestore: getDoc
    Firestore-->>FirestoreAdapter: Pedido
    FirestoreAdapter-->>OrderRepo: Pedido
    OrderRepo-->>OrderStore: Pedido
    OrderStore-->>DetailPage: Pedido carregado

    alt Avançar Status
        Atendente->>DetailPage: Avança status (ex: PREPARING -> OUT_FOR_DELIVERY)
        DetailPage->>OrderStore: updateStatus(id, status)
        OrderStore->>OrderRepo: update(id, {status})
        OrderRepo->>FirestoreAdapter: update('orders', id, ...)
        FirestoreAdapter->>Firestore: updateDoc
        Firestore-->>FirestoreAdapter: OK
        FirestoreAdapter-->>OrderRepo: OK
        OrderRepo-->>OrderStore: OK
        OrderStore-->>DetailPage: Status atualizado
        Firestore-->>FirestoreAdapter: onSnapshot trigger
        FirestoreAdapter-->>ActivePage: Lista atualizada (tempo real)
    end

    alt Cancelar Pedido
        Atendente->>DetailPage: Cancela pedido + motivo
        DetailPage->>OrderStore: cancelOrder(id, {reason, notes, pixRefund})
        OrderStore->>OrderStore: Verifica payment.method == PIX
        OrderStore->>OrderRepo: update(id, {status: CANCELLED, cancelReason...})
        OrderRepo->>FirestoreAdapter: update('orders')
        FirestoreAdapter->>Firestore: updateDoc
        Firestore-->>FirestoreAdapter: OK
        FirestoreAdapter-->>OrderRepo: OK
        OrderRepo-->>OrderStore: OK
        OrderStore-->>DetailPage: Pedido cancelado
        Firestore-->>FirestoreAdapter: onSnapshot trigger
        FirestoreAdapter-->>ActivePage: Pedido removido da lista ativa
    end

    alt Confirmar PIX
        Atendente->>DetailPage: Confirma comprovante PIX
        DetailPage->>OrderStore: confirmPixProof(id)
        OrderStore->>OrderRepo: update(id, {status: PREPARING, payment.proofConfirmed})
        OrderRepo->>FirestoreAdapter: update('orders')
        FirestoreAdapter->>Firestore: updateDoc
        Firestore-->>FirestoreAdapter: OK
        FirestoreAdapter-->>OrderRepo: OK
        OrderRepo-->>OrderStore: OK
        OrderStore-->>DetailPage: Status -> PREPARING
    end
```

## 4. Gerenciamento de Cardápio

```mermaid
sequenceDiagram
    actor Admin
    participant PageCardapio as pages/cardapio.vue
    participant MenuStore as menuStore.ts
    participant Repos as Repositories (Flavor/Additional/Snack/Bev)
    participant FirestoreAdapter as FirestoreAdapter
    participant Firestore as Cloud Firestore

    Admin->>PageCardapio: Acessa /cardapio
    PageCardapio->>MenuStore: loadAll()
    MenuStore->>Repos: list() múltiplos
    Repos->>FirestoreAdapter: find() cada coleção
    FirestoreAdapter->>Firestore: Queries
    Firestore-->>FirestoreAdapter: Resultados
    FirestoreAdapter-->>Repos: Itens do cardápio
    Repos-->>MenuStore: Cardápio completo
    MenuStore-->>PageCardapio: Dados carregados

    alt CRUD Sabor
        Admin->>PageCardapio: Adiciona/Edita sabor
        PageCardapio->>MenuStore: createFlavor() / updateFlavor()
        MenuStore->>Repos: create() / update()
        Repos->>FirestoreAdapter: create() / update()
        FirestoreAdapter->>Firestore: addDoc / updateDoc
        Firestore-->>FirestoreAdapter: OK
        FirestoreAdapter-->>Repos: OK
        Repos-->>MenuStore: OK
        MenuStore->>MenuStore: reload()
        MenuStore-->>PageCardapio: Cardápio atualizado
    end

    alt Importar CSV
        Admin->>PageCardapio: Cola dados CSV
        PageCardapio->>MenuStore: importFromCSV(grouped, overwrite)
        MenuStore->>MenuStore: loadAll() para detectar duplicatas
        MenuStore->>Repos: update() / create() em loop
        Repos->>FirestoreAdapter: múltiplas operações
        FirestoreAdapter->>Firestore: batch de writes
        Firestore-->>FirestoreAdapter: OK
        FirestoreAdapter-->>Repos: OK
        Repos-->>MenuStore: OK
        MenuStore->>MenuStore: reload()
        MenuStore-->>PageCardapio: Resultado importação
    end
```

## 5. Relatórios

```mermaid
sequenceDiagram
    actor Admin
    participant PageRel as pages/relatorios.vue
    participant OrderRepo as OrderRepo
    participant FirestoreAdapter as FirestoreAdapter
    participant Firestore as Cloud Firestore

    Admin->>PageRel: Acessa /relatorios
    Admin->>PageRel: Seleciona período (hoje/semana/mês/ano)
    PageRel->>OrderRepo: listByDateRange(start, end)
    OrderRepo->>FirestoreAdapter: find('orders', createdAt >= start, <= end)
    FirestoreAdapter->>Firestore: Query com where + orderBy
    Firestore-->>FirestoreAdapter: Pedidos do período
    FirestoreAdapter-->>OrderRepo: Pedidos[]
    OrderRepo-->>PageRel: Pedidos[]
    PageRel->>PageRel: Calcula KPIs (faturamento, ticket médio, top clientes, top sabores)
    PageRel-->>Admin: Dashboard de relatórios
```

## 6. Bootstrap de Administrador (Server-side)

```mermaid
sequenceDiagram
    actor Admin
    participant ConfigPage as pages/configuracoes.vue
    participant AuthStore as authStore.ts
    participant NuxtAPI as server/api/users/bootstrap-admin.post.ts
    participant ServerUtil as server/utils/firebaseAdmin.ts
    participant FirebaseAdmin as Firebase Admin SDK
    participant Firestore as Cloud Firestore

    Admin->>ConfigPage: Acessa /configuracoes
    Admin->>ConfigPage: Clica "Promover a admin"
    ConfigPage->>AuthStore: getIdToken()
    AuthStore->>AuthStore: currentUser.getIdToken()
    AuthStore-->>ConfigPage: Bearer Token
    ConfigPage->>NuxtAPI: POST /api/users/bootstrap-admin (body: uid, header: Bearer)
    NuxtAPI->>ServerUtil: verifyIdTokenFromRequest(event)
    ServerUtil->>FirebaseAdmin: verifyIdToken(token)
    FirebaseAdmin-->>ServerUtil: Decoded token (uid, email)
    ServerUtil-->>NuxtAPI: Usuário verificado
    NuxtAPI->>Firestore: _meta/bootstrap — já existe admin?
    Firestore-->>NuxtAPI: Não existe
    NuxtAPI->>FirebaseAdmin: setCustomUserClaims(uid, {role: 'admin'})
    FirebaseAdmin-->>NuxtAPI: OK
    NuxtAPI->>Firestore: _meta/bootstrap.set({adminCreated: true})
    Firestore-->>NuxtAPI: OK
    NuxtAPI-->>ConfigPage: {ok: true, message: "Promovido"}
    ConfigPage-->>Admin: Mensagem de sucesso
```
