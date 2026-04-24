import { cert, getApps, initializeApp, type App } from 'firebase-admin/app'
import { getAuth, type Auth } from 'firebase-admin/auth'
import { getFirestore, type Firestore } from 'firebase-admin/firestore'

let app: App | null = null

export function getAdminApp(): App {
  if (app) return app
  if (getApps().length > 0) {
    app = getApps()[0]!
    return app
  }
  const cfg = useRuntimeConfig()
  const privateKey = (cfg.firebasePrivateKey || '').replace(/\\n/g, '\n')
  if (!cfg.firebaseProjectId || !cfg.firebaseClientEmail || !privateKey) {
    throw new Error('Firebase Admin: variáveis de ambiente não configuradas')
  }
  app = initializeApp({
    credential: cert({
      projectId: cfg.firebaseProjectId,
      clientEmail: cfg.firebaseClientEmail,
      privateKey,
    }),
  })
  return app
}

export function getAdminAuth(): Auth {
  return getAuth(getAdminApp())
}

export function getAdminDb(): Firestore {
  return getFirestore(getAdminApp())
}

export async function verifyIdTokenFromRequest(event: any): Promise<{
  uid: string
  email?: string
  role?: 'admin' | 'attendant' | 'viewer'
}> {
  const authHeader = event.node?.req?.headers?.authorization || ''
  const match = authHeader.match(/^Bearer\s+(.+)$/)
  if (!match) throw createError({ statusCode: 401, statusMessage: 'Token ausente' })
  const decoded = await getAdminAuth().verifyIdToken(match[1]!)
  return {
    uid: decoded.uid,
    email: decoded.email,
    role: (decoded.role as 'admin' | 'attendant' | 'viewer' | undefined),
  }
}

export function requireRole(
  user: { role?: 'admin' | 'attendant' | 'viewer' },
  allowed: Array<'admin' | 'attendant' | 'viewer'>,
) {
  if (!user.role || !allowed.includes(user.role)) {
    throw createError({ statusCode: 403, statusMessage: 'Acesso negado' })
  }
}
