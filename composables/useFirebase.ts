import type { FirebaseApp } from 'firebase/app'
import type { Auth } from 'firebase/auth'
import type { Firestore } from 'firebase/firestore'
import { FirestoreAdapter } from '~/infrastructure/firebase/firestoreAdapter'

export function useFirebase() {
  const { $firebase } = useNuxtApp() as unknown as {
    $firebase?: { app: FirebaseApp; auth: Auth; db: Firestore }
  }
  if (!$firebase) throw new Error('Firebase não inicializado — configure .env')
  return $firebase
}

export function useFirestoreAdapter(): FirestoreAdapter {
  const { db } = useFirebase()
  return new FirestoreAdapter(db)
}
