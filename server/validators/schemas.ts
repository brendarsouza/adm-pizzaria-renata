// Schemas Zod para validação de inputs em server routes.
// Evita injection, type confusion e payloads malformados chegarem ao Firebase Admin.
import { z } from 'zod'

// ─── Users ──────────────────────────────────────────────────────────────────

export const setRoleSchema = z.object({
  uid: z.string().min(1).max(128),
  role: z.enum(['admin', 'attendant', 'viewer']),
})

export const bootstrapAdminSchema = z.object({
  uid: z.string().min(1).max(128),
})

// ─── Utilitário para uso em event handlers ─────────────────────────────────

import type { H3Event } from 'h3'
import { readBody, createError } from 'h3'

/**
 * Lê o body do evento e valida contra o schema.
 * Lança 400 com lista de erros formatada se inválido.
 */
export async function validateBody<T extends z.ZodTypeAny>(
  event: H3Event,
  schema: T,
): Promise<z.infer<T>> {
  const raw = await readBody(event)
  const result = schema.safeParse(raw)
  if (!result.success) {
    const issues = result.error.issues
      .map(i => `${i.path.join('.') || '(raiz)'}: ${i.message}`)
      .join('; ')
    throw createError({ statusCode: 400, statusMessage: `Dados inválidos — ${issues}` })
  }
  return result.data
}
