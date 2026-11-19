import { test, expect } from '@playwright/test';
import { api, criarCliente, entrarPelaTela, semRolagemHorizontal, tokenDe } from './ajuda.js';

test('CT-013: carrinho continua igual após recarregar a página (RNF-002)', async ({ page, request }) => {
  const { email } = await criarCliente(request);
  await entrarPelaTela(page, email);

  await page.goto('/');
  await page.getByRole('button', { name: 'Pedir' }).first().click();
  await page.reload();
  await expect(page.getByTestId('carrinho-qtd')).toHaveText('1');
});

test('CT-012: fluxo feliz — login, feed, Pedir, checkout e pedido "recebido"', async ({ page, request }) => {
  const { email } = await criarCliente(request);
  await entrarPelaTela(page, email);

  const v60 = page.getByTestId('post').filter({ hasText: 'Coado V60 Etiópia' }).filter({ hasText: 'novo produto' });
  await expect(v60.getByText('Em alta')).toBeVisible(); // RN-005
  await v60.getByRole('button', { name: 'Pedir' }).click();
  await expect(page.getByTestId('carrinho-qtd')).toHaveText('1');

  await page.getByRole('link', { name: /Carrinho/ }).click();
  await page.getByRole('button', { name: 'Aumentar Coado V60 Etiópia' }).click();
  await expect(page.getByTestId('subtotal')).toHaveText('R$ 28,00');
  await expect(page.getByTestId('frete')).toHaveText('R$ 4,00'); // Centro → Centro, até 2 km
  await expect(page.getByTestId('total')).toHaveText('R$ 32,00');
  await semRolagemHorizontal(page);

  await page.getByRole('button', { name: 'Finalizar pedido' }).click();

  await expect(page).toHaveURL(/\/pedidos$/);
  await expect(page.getByText(/enviado! Acompanhe o status aqui/)).toBeVisible();
  const pedido = page.getByTestId('pedido').first();
  await expect(pedido.locator('[aria-current="step"]')).toHaveText('Recebido');
  await expect(pedido).toContainText('2× Coado V60 Etiópia');
  await expect(page.getByTestId('carrinho-qtd')).toHaveText('0');
});

test('CT-014: erro amigável no checkout abaixo do pedido mínimo (RNF-003)', async ({ page, request }) => {
  // A cafeteria publica um produto de R$ 10,00 (RF-003), que vai para o topo do feed.
  const tokenLoja = await tokenDe(request, 'graodeouro@coado.app');
  const nome = `Brigadeiro de café ${Date.now()}`;
  await api(request, 'POST', '/produtos', {
    token: tokenLoja, dados: { nome, descricao: 'Docinho com café coado.', preco: 10, estoque: 50 },
  });

  const { email } = await criarCliente(request);
  await entrarPelaTela(page, email);
  await page.getByTestId('post').filter({ hasText: nome }).getByRole('button', { name: 'Pedir' }).click();
  await page.getByRole('link', { name: /Carrinho/ }).click();

  await expect(page.getByRole('alert')).toHaveText('Pedido mínimo é R$ 15,00, adicione mais R$ 5,00');
  await expect(page.getByRole('button', { name: 'Finalizar pedido' })).toBeDisabled();
});

test('produto esgotado mostra "Esgotado" com o botão desabilitado (RN-006)', async ({ page, request }) => {
  const { email } = await criarCliente(request);
  await entrarPelaTela(page, email);
  const bolo = page.getByTestId('post').filter({ hasText: 'Bolo de cenoura' });
  await expect(bolo.getByRole('button', { name: 'Esgotado' })).toBeDisabled();
  await expect(bolo.getByRole('button', { name: 'Pedir' })).toHaveCount(0);
});

test('fora do raio de 8 km: cafeteria não aparece no Explorar (RN-003)', async ({ page, request }) => {
  const { email } = await criarCliente(request, { seguir: [] });
  await entrarPelaTela(page, email);
  await page.getByRole('link', { name: 'Explorar' }).click();
  await expect(page.getByRole('link', { name: 'Torra Fina' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Café Colonial Pirabeiraba' })).toHaveCount(0);
  await semRolagemHorizontal(page);
});
