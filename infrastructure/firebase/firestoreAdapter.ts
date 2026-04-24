// Adapter genérico tipado para Firestore (client-side)
import {
  collection, doc, getDoc, getDocs, query, where, orderBy, limit as fsLimit,
  addDoc, setDoc, updateDoc, deleteDoc, onSnapshot, serverTimestamp,
  type Firestore, type Query, type DocumentData, type QueryConstraint,
} from 'firebase/firestore'

export interface FireFilter {
  field: string
  op: '==' | '!=' | '<' | '<=' | '>' | '>='
  value: unknown
}

/**
 * Remove recursivamente todas as chaves com valor `undefined` de um objeto.
 * Firestore rejeita `undefined`; este helper garante compatibilidade.
 */
export function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(stripUndefined).filter(v => v !== undefined) as unknown as T
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) {
      if (v !== undefined) out[k] = stripUndefined(v)
    }
    return out as T
  }
  return value
}

export class FirestoreAdapter {
  constructor(private readonly db: Firestore) {}

  async findById<T>(col: string, id: string): Promise<T | null> {
    const ref = doc(this.db, col, id)
    const snap = await getDoc(ref)
    return snap.exists() ? ({ id: snap.id, ...(snap.data() as DocumentData) } as T) : null
  }

  async find<T>(col: string, filters: FireFilter[] = [], opts: { orderBy?: string; desc?: boolean; limit?: number } = {}): Promise<T[]> {
    const constraints: QueryConstraint[] = filters.map(f => where(f.field, f.op, f.value))
    if (opts.orderBy) constraints.push(orderBy(opts.orderBy, opts.desc ? 'desc' : 'asc'))
    if (opts.limit) constraints.push(fsLimit(opts.limit))
    const q: Query = query(collection(this.db, col), ...constraints)
    const snap = await getDocs(q)
    return snap.docs.map(d => ({ id: d.id, ...(d.data() as DocumentData) } as T))
  }

  async create<T extends object>(col: string, data: T): Promise<string> {
    const clean = stripUndefined(data)
    const ref = await addDoc(collection(this.db, col), {
      ...clean,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    return ref.id
  }

  async upsert<T extends object>(col: string, id: string, data: T): Promise<void> {
    const clean = stripUndefined(data)
    await setDoc(doc(this.db, col, id), { ...clean, updatedAt: serverTimestamp() }, { merge: true })
  }

  async update<T extends object>(col: string, id: string, data: Partial<T>): Promise<void> {
    const clean = stripUndefined(data)
    await updateDoc(doc(this.db, col, id), { ...clean, updatedAt: serverTimestamp() })
  }

  async remove(col: string, id: string): Promise<void> {
    await deleteDoc(doc(this.db, col, id))
  }

  watch<T>(col: string, filters: FireFilter[], cb: (items: T[]) => void, opts: { orderBy?: string; desc?: boolean } = {}): () => void {
    const constraints: QueryConstraint[] = filters.map(f => where(f.field, f.op, f.value))
    if (opts.orderBy) constraints.push(orderBy(opts.orderBy, opts.desc ? 'desc' : 'asc'))
    const q = query(collection(this.db, col), ...constraints)
    return onSnapshot(q, (snap) => {
      cb(snap.docs.map(d => ({ id: d.id, ...(d.data() as DocumentData) } as T)))
    })
  }
}
