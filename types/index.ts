// Tipos centrais do domínio Pizzaria Renata

export type UserRole = 'admin' | 'attendant' | 'viewer' | 'dev'

export interface AuthUser {
  uid: string
  email: string | null
  displayName: string | null
  role: UserRole
}

// ============ Catálogo ============

export type PizzaSize = 'BROTO' | 'MEDIA' | 'GRANDE' | 'FAMILIA'
export type PizzaCategory = 'salgada' | 'doce'
export type HalfPosition = 'FULL' | 'HALF_1' | 'HALF_2'
export type PricingRule = 'HIGHEST' | 'AVERAGE' | 'HYBRID'
// HYBRID (regra Renata): salgada+salgada = AVERAGE; qualquer combinação com doce = HIGHEST

export interface PriceBySize {
  BROTO?: number
  MEDIA?: number
  GRANDE?: number
  FAMILIA?: number
}

export interface PizzaFlavor {
  id: string
  name: string
  /** Número de cadastro exibido no cardápio (ex: "001"). Único por categoria, 3 dígitos. */
  productNumber?: string
  description?: string
  ingredients: string[]
  category: PizzaCategory
  priceBySize: PriceBySize
  active: boolean
  createdAt?: number
  updatedAt?: number
}

export interface PizzaAdditional {
  id: string
  name: string
  priceWhole: number
  priceHalf: number
  active: boolean
}

export type SnackKind = 'lanche' | 'beirute' | 'porcao'

export interface SnackProduct {
  /** Número de cadastro exibido no cardápio (ex: "001"). 3 dígitos. */
  productNumber?: string
  id: string
  name: string
  description?: string
  kind: SnackKind
  price: number
  sizes?: Array<{ label: string; price: number }>
  allowedAdditionals: string[] // ids de additionals específicos
  active: boolean
}

export interface SnackAdditional {
  id: string
  name: string
  price: number
  active: boolean
}

export type BeverageKind = 'suco' | 'refrigerante'

export interface BeverageProduct {
  id: string
  name: string
  kind: BeverageKind
  variants: Array<{ label: string; price: number }>
  active: boolean
}

export interface MenuSettings {
  stuffedCrustPrice: number // R$ borda recheada
  halfHalfRule: PricingRule // padrão do sistema — HYBRID
}

// ============ Cliente ============

export type RoadType = 'asfalto' | 'estrada_terra' | 'outro'

export interface GPSCoordinates {
  latitude: number
  longitude: number
}

export interface Address {
  id: string
  /** Apelido obrigatório para identificação rápida: "Casa", "Trabalho", "Casa da mãe" */
  alias?: string
  street: string
  number: string
  complement?: string
  district: string // bairro/comunidade/localidade
  locality?: string // cidade
  state?: string // UF
  cep?: string // formato 00000-000 ou 00000000
  reference?: string
  roadType: RoadType
  /** Legado: objeto GPS completo */
  gps?: GPSCoordinates
  /** Novo: latitude/longitude individuais (preenchidos por geocoding) */
  latitude?: number
  longitude?: number
  /** Novo nome (renomeado de accessNotes). Fallback de leitura via helper. */
  addressNotes?: string
  /** @deprecated use addressNotes. Mantido para compat com documentos antigos. */
  accessNotes?: string
  createdAt?: number
}

/** Um número telefônico do cliente (múltiplos suportados). */
export interface CustomerPhone {
  id: string
  number: string
  label?: string
  isPrimary: boolean
}

export interface Customer {
  id: string
  name: string
  /** Legado: telefone principal — mantido para compat e busca. */
  phone: string // identificador único — normalizado E.164 parcial
  /** Todos os telefones cadastrados; `phone` espelha o `isPrimary`. */
  phones?: CustomerPhone[]
  addresses: Address[]
  /** Tokens normalizados de busca (nome, todos os telefones, endereços). */
  searchTokens?: string[]
  createdAt?: number
  updatedAt?: number
}

// ============ Pedido ============

export interface OrderPizzaAdditional {
  additionalId: string
  name: string
  priceWhole: number
  priceHalf: number
  half: HalfPosition
}

export interface OrderPizzaItem {
  kind: 'pizza'
  size: PizzaSize
  flavor1: { id: string; name: string; category: PizzaCategory; priceBySize: PriceBySize }
  flavor2?: { id: string; name: string; category: PizzaCategory; priceBySize: PriceBySize }
  isHalfHalf: boolean
  pricingRule: PricingRule
  stuffedCrust: boolean
  stuffedCrustPrice: number
  additionals: OrderPizzaAdditional[]
  removedIngredients: string[]
  observation?: string
  quantity: number
}

export interface OrderSnackItem {
  kind: 'snack'
  productId: string
  name: string
  unitPrice: number
  sizeLabel?: string
  additionals: Array<{ id: string; name: string; price: number }>
  removedIngredients: string[]
  observation?: string
  quantity: number
}

export interface OrderBeverageItem {
  kind: 'beverage'
  productId: string
  name: string
  variantLabel: string
  unitPrice: number
  quantity: number
}

export type OrderItem = OrderPizzaItem | OrderSnackItem | OrderBeverageItem

export type PaymentMethod = 'PIX' | 'CASH' | 'CARD'
export type CardBrand = 'VISA' | 'MASTER' | 'ELO' | 'HIPERCARD' | 'AMEX' | 'OTHER'

export interface PaymentPIX {
  method: 'PIX'
  proofConfirmed: boolean
  confirmedAt?: number
  /** Melhoria 5: devolução do PIX ao cancelar um pedido pago. */
  pixRefundRecorded?: boolean
  pixRefundKey?: string
  pixRefundAt?: number
}
export interface PaymentCash {
  method: 'CASH'
  needsChange: boolean
  cashGiven?: number // valor que cliente vai pagar
  change?: number // troco calculado
}
export interface PaymentCard {
  method: 'CARD'
  brand: CardBrand
  debitOrCredit: 'debit' | 'credit'
}
export type Payment = PaymentPIX | PaymentCash | PaymentCard

export type OrderStatus =
  | 'OPEN'
  | 'AWAITING_PIX'
  | 'PREPARING'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'

/** Sub-tipos de cancelamento (categorias de perda operacional). */
export type CancelReason =
  | 'WRONG_PIZZA'         // Pizza feita errada
  | 'RETURNED_PIZZA'      // Pizza devolvida pelo cliente
  | 'NOT_RECEIVED'        // Cliente não recebeu / não atendeu
  | 'CUSTOMER_CANCELLED'  // Cliente desistiu antes do preparo
  | 'OUT_OF_STOCK'        // Ingrediente em falta
  | 'OTHER'               // Outro motivo (requer observação)

export interface Order {
  id: string
  sequentialNumber: number
  customerId: string
  customerSnapshot: { name: string; phone: string }
  addressSnapshot: Address
  items: OrderItem[]
  deliveryFee: number
  estimateMinutes: number
  estimatedDeliveryAt: number // timestamp
  itemsSubtotal: number
  total: number
  payment: Payment
  status: OrderStatus
  /** Categoria do cancelamento (enum). Documentos antigos podem ter string livre. */
  cancelReason?: CancelReason | string
  /** Observação livre do cancelamento (obrigatória quando reason = OTHER). */
  cancelNotes?: string
  cancelledAt?: number
  cancelledBy?: string // uid
  createdAt: number
  updatedAt: number
  createdBy: string // uid
}
