import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'

export default defineNuxtPlugin((nuxtApp) => {
  const cfg = useRuntimeConfig().public
  if (!cfg.firebaseApiKey) {
    console.warn('[firebase.client] Credenciais Firebase não configuradas — Auth/Firestore não funcionarão.')
    return
  }

  const firebaseConfig = {
    apiKey: cfg.firebaseApiKey,
    authDomain: cfg.firebaseAuthDomain,
    projectId: cfg.firebaseProjectId,
    appId: cfg.firebaseAppId,
  }

  const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]!
  const auth: Auth = getAuth(app)
  const db: Firestore = getFirestore(app)

  return {
    provide: {
      firebase: { app, auth, db },
    },
  }
})
