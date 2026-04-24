import { defineStore } from 'pinia'
import {
  GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword,
  signOut as fbSignOut, onIdTokenChanged, type User,
} from 'firebase/auth'
import type { AuthUser, UserRole } from '~/types'

interface AuthState {
  user: AuthUser | null
  loading: boolean
  error: string | null
  initialized: boolean
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    user: null,
    loading: true,
    error: null,
    initialized: false,
  }),
  getters: {
    isAuthenticated: (s) => !!s.user,
    role: (s): UserRole | null => s.user?.role ?? null,
    can: (s) => (allowed: UserRole[]) => !!s.user && allowed.includes(s.user.role),
  },
  actions: {
    async init() {
      if (this.initialized) return
      // DEV bypass: injeta usuário fake admin
      const { public: pub } = useRuntimeConfig()
      if (pub.devSkipAuth === 'true') {
        this.user = { uid: 'dev-admin', email: 'dev@local', displayName: 'Dev Admin', role: 'admin' }
        this.loading = false
        this.initialized = true
        return
      }
      try {
        const { auth } = useFirebase()
        onIdTokenChanged(auth, async (u) => {
          await this.hydrate(u)
        })
        this.initialized = true
      } catch (e) {
        console.warn('[authStore] Firebase indisponível', e)
        this.loading = false
      }
    },
    async hydrate(u: User | null) {
      if (!u) {
        this.user = null
        this.loading = false
        return
      }
      const tokenResult = await u.getIdTokenResult()
      const claimRole = tokenResult.claims.role as UserRole | undefined
      this.user = {
        uid: u.uid,
        email: u.email,
        displayName: u.displayName,
        role: claimRole ?? 'viewer',
      }
      this.loading = false
    },
    async loginWithGoogle() {
      this.error = null
      const { auth } = useFirebase()
      try {
        await signInWithPopup(auth, new GoogleAuthProvider())
      } catch (e: unknown) {
        this.error = (e as Error).message
        throw e
      }
    },
    async loginWithEmail(email: string, password: string) {
      this.error = null
      const { auth } = useFirebase()
      try {
        await signInWithEmailAndPassword(auth, email, password)
      } catch (e: unknown) {
        this.error = (e as Error).message
        throw e
      }
    },
    async logout() {
      this.user = null
      try {
        const { auth } = useFirebase()
        await fbSignOut(auth)
      } catch { /* Firebase indisponível: logout local basta */ }
    },
    /**
     * Login de desenvolvedor — não usa Firebase.
     * Injeta um usuário fake com role 'dev' (mesmos privilégios de admin).
     * Use apenas em desenvolvimento.
     */
    loginAsDev() {
      this.error = null
      this.user = {
        uid: 'dev-local',
        email: 'dev@local',
        displayName: 'Desenvolvedor',
        role: 'dev',
      }
      this.loading = false
      this.initialized = true
    },
    async getIdToken(): Promise<string | null> {
      const { auth } = useFirebase()
      const u = auth.currentUser
      return u ? u.getIdToken() : null
    },
  },
})
