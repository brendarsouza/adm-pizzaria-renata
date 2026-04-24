import { getAdminAuth, verifyIdTokenFromRequest, requireRole } from '~/server/utils/firebaseAdmin'
import { validateBody, setRoleSchema } from '~/server/validators/schemas'

// Define custom claim `role` em um usuário (apenas admin).
export default defineEventHandler(async (event) => {
  const caller = await verifyIdTokenFromRequest(event)
  requireRole(caller, ['admin'])
  const body = await validateBody(event, setRoleSchema)
  await getAdminAuth().setCustomUserClaims(body.uid, { role: body.role })
  return { ok: true }
})
