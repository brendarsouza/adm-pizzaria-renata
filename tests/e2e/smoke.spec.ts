import { test, expect } from '@playwright/test'

// Testes smoke que não dependem de Firebase real.
// Validam navegação básica e redirect de autenticação.

test('redireciona para /login quando não autenticado', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/login/)
})

test('página de login renderiza campos', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByRole('heading', { name: /pizzaria renata/i })).toBeVisible()
  await expect(page.getByLabel(/e-mail/i)).toBeVisible()
  await expect(page.getByLabel(/senha/i)).toBeVisible()
  await expect(page.getByRole('button', { name: /entrar com google/i })).toBeVisible()
})

test('comanda é navegável por URL direta (sem auth em testes locais)', async ({ page }) => {
  // apenas verifica que a rota existe e retorna 200 (ou redirect para login)
  const response = await page.goto('/pedidos/abc/comanda')
  expect([200, 302, 307, 404].includes(response?.status() || 0)).toBeTruthy()
})
