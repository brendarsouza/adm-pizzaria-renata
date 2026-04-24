import { reactive, ref } from 'vue'

/**
 * Tipos de campo suportados pelo CRUD genérico (BaseCrudTable / BaseCrudField).
 */
export type CrudFieldType =
  | 'text'
  | 'number'
  | 'money'
  | 'textarea'
  | 'select'
  | 'checkbox'
  | 'product-number' // 3 dígitos numéricos
  | 'csv-list'       // string separada por vírgulas → array de strings
  | 'price-by-size'  // { BROTO?, MEDIA?, GRANDE?, FAMILIA? }
  | 'variants'       // Array<{ label: string; price: number }>
  | 'autocomplete'

export interface CrudFieldOption {
  label: string
  value: any
}

export interface CrudField {
  key: string
  label: string
  type: CrudFieldType
  required?: boolean
  placeholder?: string
  help?: string
  maxLength?: number
  /** Layout em grid de 12 colunas (default: 12 = linha inteira) */
  colSpan?: number
  /** Opções para select/autocomplete */
  options?: CrudFieldOption[] | (() => CrudFieldOption[])
  /** Valor inicial (quando criando) */
  defaultValue?: any
  /** Conversão item → form (ao abrir edição) */
  toForm?: (item: any) => any
  /** Conversão form → payload (ao salvar) */
  fromForm?: (formValue: any, form: Record<string, any>) => any
  /** Validação: retorna mensagem de erro ou undefined */
  validate?: (value: any, form: Record<string, any>) => string | undefined
  /** Exibir condicionalmente */
  show?: (form: Record<string, any>) => boolean
}

/** Valor default apropriado por tipo */
function defaultFor(field: CrudField): any {
  if (field.defaultValue !== undefined) return field.defaultValue
  switch (field.type) {
    case 'checkbox': return false
    case 'number':
    case 'money': return 0
    case 'csv-list': return ''
    case 'price-by-size': return { BROTO: 0, MEDIA: 0, GRANDE: 0, FAMILIA: 0 }
    case 'variants': return [{ label: '', price: 0 }]
    default: return ''
  }
}

/**
 * Composable para gerenciar o estado de um formulário dirigido por configuração.
 */
export function useCrudForm(fields: CrudField[]) {
  const form = reactive<Record<string, any>>({})
  const errors = reactive<Record<string, string | undefined>>({})
  const isEditing = ref(false)
  const editingId = ref<string | null>(null)
  const saving = ref(false)

  function reset() {
    for (const k of Object.keys(form)) delete form[k]
    for (const k of Object.keys(errors)) delete errors[k]
    for (const f of fields) form[f.key] = clone(defaultFor(f))
    isEditing.value = false
    editingId.value = null
  }

  function load(item: Record<string, any>) {
    for (const k of Object.keys(errors)) delete errors[k]
    for (const f of fields) {
      const raw = item[f.key]
      const initial = f.toForm ? f.toForm(item) : (raw !== undefined ? clone(raw) : clone(defaultFor(f)))
      form[f.key] = initial
    }
    isEditing.value = true
    editingId.value = typeof item.id === 'string' ? item.id : null
  }

  function validate(): boolean {
    let ok = true
    for (const f of fields) {
      if (f.show && !f.show(form)) { errors[f.key] = undefined; continue }
      const v = form[f.key]
      let err: string | undefined
      if (f.required && isEmpty(v)) err = 'Obrigatório'
      if (!err && f.validate) err = f.validate(v, form)
      errors[f.key] = err
      if (err) ok = false
    }
    return ok
  }

  function toPayload(): Record<string, any> {
    const payload: Record<string, any> = {}
    for (const f of fields) {
      if (f.show && !f.show(form)) continue
      const value = form[f.key]
      payload[f.key] = f.fromForm ? f.fromForm(value, form) : value
    }
    return payload
  }

  function setField(key: string, value: any) {
    form[key] = value
  }

  return {
    form,
    errors,
    isEditing,
    editingId,
    saving,
    reset,
    load,
    validate,
    toPayload,
    setField,
  }
}

function isEmpty(v: any): boolean {
  if (v == null) return true
  if (typeof v === 'string') return v.trim() === ''
  if (Array.isArray(v)) return v.length === 0
  return false
}

function clone<T>(v: T): T {
  if (v == null || typeof v !== 'object') return v
  if (Array.isArray(v)) return v.map(clone) as any
  const out: any = {}
  for (const k of Object.keys(v as any)) out[k] = clone((v as any)[k])
  return out
}
