import type { OrderItem } from '~/types'

export interface ItemCategoryInfo {
  code: 'CAT-01' | 'CAT-02' | 'CAT-03' | 'CAT-04' | 'CAT-05' | 'CAT-06'
  label: string
  icon: string
}

/**
 * Resolve a categoria exibível (badge) de um item de pedido.
 * Para snacks e beverages, usa o `kind` cadastrado no menu para distinguir
 * lanche/beirute/porção e suco/refrigerante. Se o menu ainda não carregou,
 * retorna um fallback genérico.
 */
export function resolveItemCategory(
  item: OrderItem,
  opts: {
    snackKindById?: (id: string) => 'lanche' | 'beirute' | 'porcao' | undefined
    beverageKindById?: (id: string) => 'suco' | 'refrigerante' | undefined
  } = {}
): ItemCategoryInfo {
  if (item.kind === 'pizza') {
    return { code: 'CAT-01', label: 'Pizza', icon: '🍕' }
  }
  if (item.kind === 'snack') {
    const k = opts.snackKindById?.(item.productId)
    if (k === 'beirute') return { code: 'CAT-03', label: 'Beirute', icon: '🥙' }
    if (k === 'porcao') return { code: 'CAT-04', label: 'Porção', icon: '🍟' }
    return { code: 'CAT-02', label: 'Lanche', icon: '🥪' }
  }
  // beverage
  const k = opts.beverageKindById?.(item.productId)
  if (k === 'suco') return { code: 'CAT-05', label: 'Suco', icon: '🥤' }
  return { code: 'CAT-06', label: 'Refrigerante', icon: '🥤' }
}

/**
 * Composable que usa o menuStore para resolver categorias de itens.
 * Uso em templates:
 *   const { category } = useItemCategory()
 *   category(item) → { code, label, icon }
 */
export function useItemCategory() {
  const menu = useMenuStore()
  const category = (item: OrderItem): ItemCategoryInfo =>
    resolveItemCategory(item, {
      snackKindById: (id) => menu.snacks.find(s => s.id === id)?.kind,
      beverageKindById: (id) => menu.beverages.find(b => b.id === id)?.kind,
    })
  return { category }
}
