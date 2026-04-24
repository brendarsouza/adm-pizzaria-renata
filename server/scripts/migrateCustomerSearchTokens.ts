// Script one-shot para gerar o campo `searchTokens` em todos os clientes existentes.
// Executar com: npx tsx server/scripts/migrateCustomerSearchTokens.ts
//
// Pré-requisitos (variáveis de ambiente):
//   FIREBASE_PROJECT_ID
//   FIREBASE_CLIENT_EMAIL
//   FIREBASE_PRIVATE_KEY
//
// O script é idempotente: rodar múltiplas vezes só atualiza os tokens
// (não duplica documentos).

import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { generateTokensForCustomer } from '../../domain/rules/customerSearchTokens'

function initAdmin() {
  if (getApps().length) return
  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n')
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Variáveis FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL e FIREBASE_PRIVATE_KEY obrigatórias.',
    )
  }
  initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) })
}

const BATCH_SIZE = 400

async function migrar() {
  initAdmin()
  const db = getFirestore()
  const snap = await db.collection('customers').get()
  console.log(`Encontrados ${snap.size} clientes na coleção 'customers'.`)

  let updated = 0
  const docs = snap.docs

  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const batch = db.batch()
    const chunk = docs.slice(i, i + BATCH_SIZE)
    for (const d of chunk) {
      const data = d.data() as { name?: string; phone?: string; addresses?: any[] }
      const tokens = generateTokensForCustomer({
        name: data.name ?? '',
        phone: data.phone ?? '',
        addresses: data.addresses ?? [],
      })
      batch.update(d.ref, { searchTokens: tokens })
      updated++
    }
    await batch.commit()
    console.log(`  ✓ lote ${Math.floor(i / BATCH_SIZE) + 1} — ${updated}/${docs.length}`)
  }

  console.log(`\n✅ Migração concluída: ${updated} clientes atualizados.`)
}

migrar().catch((err) => {
  console.error('❌ Erro na migração:', err)
  process.exit(1)
})
