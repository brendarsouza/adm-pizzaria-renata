import { getAdminAuth, getAdminDb } from '~/server/utils/firebaseAdmin'
import { validateBody, bootstrapAdminSchema } from '~/server/validators/schemas'

/**
 * Promove o primeiro usuário cadastrado a admin.
 * Só funciona se AINDA NÃO houver nenhum admin no sistema.
 * Usar uma única vez para criar o primeiro administrador.
 */
export default defineEventHandler(async (event) => {
  const body = await validateBody(event, bootstrapAdminSchema)

  const db = getAdminDb()
  // Verifica se já existe algum usuário admin listado
  const bootstrapDoc = await db.collection('_meta').doc('bootstrap').get()
  if (bootstrapDoc.exists && bootstrapDoc.data()?.adminCreated) {
    throw createError({ statusCode: 403, statusMessage: 'Admin inicial já foi criado. Use set-role.' })
  }

  await getAdminAuth().setCustomUserClaims(body.uid, { role: 'admin' })
  await db.collection('_meta').doc('bootstrap').set({ adminCreated: true, uid: body.uid, createdAt: Date.now() })
  return { ok: true, message: 'Usuário promovido a admin. Faça logout e login novamente para aplicar o claim.' }
})
