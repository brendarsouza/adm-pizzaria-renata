import { getAdminDb, verifyIdTokenFromRequest, requireRole } from '~/server/utils/firebaseAdmin'

// Seed inicial do cardápio e configurações. Requer perfil admin.
export default defineEventHandler(async (event) => {
  const user = await verifyIdTokenFromRequest(event)
  requireRole(user, ['admin'])

  const db = getAdminDb()
  const now = Date.now()

  const flavors = [
    { name: 'Calabresa', category: 'salgada', ingredients: ['calabresa', 'cebola', 'azeitona'], description: 'Tradicional com cebola e azeitona preta',
      priceBySize: { BROTO: 30, MEDIA: 45, GRANDE: 60, FAMILIA: 75 }, active: true },
    { name: 'Portuguesa', category: 'salgada', ingredients: ['presunto', 'ovo', 'cebola', 'azeitona', 'pimentão'], description: 'Completa',
      priceBySize: { BROTO: 35, MEDIA: 50, GRANDE: 65, FAMILIA: 80 }, active: true },
    { name: 'Margherita', category: 'salgada', ingredients: ['mussarela', 'tomate', 'manjericão'],
      priceBySize: { BROTO: 32, MEDIA: 48, GRANDE: 62, FAMILIA: 78 }, active: true },
    { name: 'Frango com Catupiry', category: 'salgada', ingredients: ['frango desfiado', 'catupiry'],
      priceBySize: { BROTO: 35, MEDIA: 50, GRANDE: 65, FAMILIA: 82 }, active: true },
    { name: 'Chocolate', category: 'doce', ingredients: ['chocolate ao leite', 'granulado'],
      priceBySize: { BROTO: 35, MEDIA: 52, GRANDE: 70, FAMILIA: 88 }, active: true },
    { name: 'Romeu e Julieta', category: 'doce', ingredients: ['goiabada', 'queijo'],
      priceBySize: { BROTO: 35, MEDIA: 52, GRANDE: 70, FAMILIA: 88 }, active: true },
  ]
  const pizzaAdditionals = [
    { name: 'Catupiry extra', priceWhole: 10, priceHalf: 6, active: true },
    { name: 'Bacon', priceWhole: 12, priceHalf: 7, active: true },
    { name: 'Cheddar', priceWhole: 10, priceHalf: 6, active: true },
    { name: 'Cebola caramelizada', priceWhole: 8, priceHalf: 5, active: true },
  ]
  const snacks = [
    { name: 'X-Salada', kind: 'lanche', price: 22, description: 'Pão, hambúrguer, queijo, alface, tomate', allowedAdditionals: [], active: true },
    { name: 'X-Bacon', kind: 'lanche', price: 26, description: 'Pão, hambúrguer, queijo, bacon, alface, tomate', allowedAdditionals: [], active: true },
    { name: 'Beirute de Frango', kind: 'beirute', price: 28, description: 'Pão sírio, frango, queijo, alface, tomate', allowedAdditionals: [], active: true },
    { name: 'Porção de Fritas M', kind: 'porcao', price: 20, sizes: [{ label: 'P', price: 15 }, { label: 'M', price: 20 }, { label: 'G', price: 28 }], allowedAdditionals: [], active: true },
  ]
  const snackAdditionals = [
    { name: 'Queijo extra', price: 4, active: true },
    { name: 'Bacon', price: 6, active: true },
    { name: 'Ovo', price: 3, active: true },
  ]
  const beverages = [
    { name: 'Coca-Cola', kind: 'refrigerante', variants: [{ label: 'Lata 350ml', price: 7 }, { label: 'Garrafa 600ml', price: 10 }, { label: '2L', price: 15 }], active: true },
    { name: 'Guaraná Antarctica', kind: 'refrigerante', variants: [{ label: 'Lata 350ml', price: 7 }, { label: '2L', price: 13 }], active: true },
    { name: 'Suco de Laranja', kind: 'suco', variants: [{ label: 'Copo 300ml', price: 8 }, { label: 'Jarra 1L', price: 18 }], active: true },
    { name: 'Suco de Maracujá', kind: 'suco', variants: [{ label: 'Copo 300ml', price: 8 }, { label: 'Jarra 1L', price: 18 }], active: true },
  ]

  const batch = db.batch()
  for (const f of flavors) batch.set(db.collection('pizzaFlavors').doc(), { ...f, createdAt: now, updatedAt: now })
  for (const a of pizzaAdditionals) batch.set(db.collection('pizzaAdditionals').doc(), { ...a, createdAt: now, updatedAt: now })
  for (const s of snacks) batch.set(db.collection('snacks').doc(), { ...s, createdAt: now, updatedAt: now })
  for (const a of snackAdditionals) batch.set(db.collection('snackAdditionals').doc(), { ...a, createdAt: now, updatedAt: now })
  for (const b of beverages) batch.set(db.collection('beverages').doc(), { ...b, createdAt: now, updatedAt: now })
  batch.set(db.collection('settings').doc('menu'), { stuffedCrustPrice: 15, halfHalfRule: 'HYBRID', updatedAt: now })
  await batch.commit()

  return { ok: true, seeded: { flavors: flavors.length, pizzaAdditionals: pizzaAdditionals.length, snacks: snacks.length, snackAdditionals: snackAdditionals.length, beverages: beverages.length } }
})
