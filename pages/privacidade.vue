<script setup lang="ts">
definePageMeta({ layout: 'default' })
const today = new Date().toLocaleDateString('pt-BR')
</script>

<template>
  <div class="max-w-3xl">
    <header class="mb-6">
      <h1>Política de Privacidade</h1>
      <p class="text-text-light mt-1">Pizzaria Renata · Última atualização: {{ today }}</p>
    </header>

    <article class="card prose-sm space-y-5 text-sm leading-relaxed">
      <section>
        <h2 class="font-serif text-lg mb-1">1. Dados coletados</h2>
        <p>
          Coletamos e tratamos os seguintes dados pessoais dos nossos clientes, necessários
          para o atendimento e entrega dos pedidos:
        </p>
        <ul class="list-disc ml-5 mt-2 space-y-0.5">
          <li>Nome completo</li>
          <li>Número de telefone (identificador do cadastro)</li>
          <li>Endereço(s) de entrega, incluindo referências e observações de acesso</li>
          <li>Coordenadas GPS, quando compartilhadas voluntariamente via link de localização</li>
          <li>Histórico de pedidos associado ao cadastro</li>
        </ul>
      </section>

      <section>
        <h2 class="font-serif text-lg mb-1">2. Base legal (LGPD Art. 7)</h2>
        <p>
          O tratamento dos seus dados pessoais ocorre com fundamento no
          <strong>inciso V (execução de contrato)</strong> e no
          <strong>inciso IX (legítimo interesse)</strong> da Lei 13.709/2018 (LGPD),
          sendo necessário para a execução do pedido de entrega e a manutenção do
          relacionamento comercial.
        </p>
      </section>

      <section>
        <h2 class="font-serif text-lg mb-1">3. Finalidades</h2>
        <ul class="list-disc ml-5 mt-2 space-y-0.5">
          <li>Registro, preparação e entrega dos pedidos</li>
          <li>Contato sobre o andamento do pedido</li>
          <li>Histórico de compras e preferências</li>
          <li>Emissão de comandas e relatórios gerenciais internos</li>
        </ul>
      </section>

      <section>
        <h2 class="font-serif text-lg mb-1">4. Compartilhamento</h2>
        <p>
          Seus dados <strong>não são vendidos ou compartilhados</strong> com terceiros para
          fins de marketing. Podem ser compartilhados exclusivamente com entregadores
          parceiros, e apenas o mínimo necessário para a execução da entrega
          (nome, endereço, telefone para contato).
        </p>
      </section>

      <section>
        <h2 class="font-serif text-lg mb-1">5. Armazenamento e segurança</h2>
        <p>
          Os dados são armazenados em servidores do Google Firebase (Firestore) com
          criptografia em trânsito (TLS) e em repouso. O acesso interno é restrito
          por perfil de usuário (admin, atendente, visualizador) e auditado.
        </p>
      </section>

      <section>
        <h2 class="font-serif text-lg mb-1">6. Seus direitos (LGPD Art. 18)</h2>
        <p>Você tem direito a:</p>
        <ul class="list-disc ml-5 mt-2 space-y-0.5">
          <li>Confirmação da existência de tratamento de seus dados</li>
          <li>Acesso aos seus dados</li>
          <li>Correção de dados incompletos, inexatos ou desatualizados</li>
          <li>Anonimização, bloqueio ou eliminação de dados desnecessários</li>
          <li>Portabilidade dos dados</li>
          <li>Eliminação dos dados tratados com o seu consentimento</li>
          <li>Revogação do consentimento</li>
        </ul>
      </section>

      <section>
        <h2 class="font-serif text-lg mb-1">7. Retenção</h2>
        <p>
          Dados de pedidos são retidos pelo prazo de 5 anos para fins fiscais e contábeis.
          Após esse período, os dados pessoais são anonimizados. Você pode solicitar a
          exclusão dos seus dados pessoais a qualquer momento (observadas obrigações legais).
        </p>
      </section>

      <section>
        <h2 class="font-serif text-lg mb-1">8. Contato do Encarregado (DPO)</h2>
        <p>
          Para exercer seus direitos ou tirar dúvidas sobre o tratamento dos seus dados
          pessoais, entre em contato com a pizzaria pelo telefone de atendimento
          ou WhatsApp oficial.
        </p>
        <p class="mt-2 text-text-light text-xs">
          Em caso de incidente de segurança envolvendo dados pessoais, a ANPD e os titulares
          afetados serão comunicados nos termos da LGPD.
        </p>
      </section>
    </article>

    <div class="mt-6 text-center text-xs text-text-light">
      <NuxtLink to="/" class="underline hover:text-primary">← Voltar</NuxtLink>
    </div>
  </div>
</template>
