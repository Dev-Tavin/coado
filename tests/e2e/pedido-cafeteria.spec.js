import { test, expect } from '@playwright/test';
import { api, criarCliente, entrarPelaTela, semRolagemHorizontal } from './ajuda.js';

test('cafeteria avança o status até "entregue" e o cliente avalia; a avaliação aparece no feed', async ({ browser, request }) => {
  // Cliente faz um pedido de cold brew na Torra Fina.
  const cliente = await criarCliente(request);
  const torra = cliente.lojas.find((l) => l.nome === 'Torra Fina');
  const { produtos } = await api(request, 'GET', `/cafeterias/${torra.id}`, { token: cliente.token });
  const coldBrew = produtos.find((p) => p.nome === 'Cold brew 300 ml');
  const pedido = await api(request, 'POST', '/pedidos', {
    token: cliente.token, dados: { cafeteriaId: torra.id, itens: [{ produtoId: coldBrew.id, quantidade: 2 }] },
  });

  // Cafeteria: painel → avança três vezes.
  const telaLoja = await (await browser.newContext()).newPage();
  await entrarPelaTela(telaLoja, 'torrafina@coado.app');
  await telaLoja.getByRole('link', { name: 'Painel' }).click();
  const cartao = telaLoja.getByTestId('pedido').filter({ hasText: `Pedido #${pedido.id}` });
  await semRolagemHorizontal(telaLoja);
  for (const proximo of ['Em preparo', 'Saiu para entrega']) {
    await cartao.getByRole('button', { name: `Avançar para “${proximo}”` }).click();
    await expect(cartao.locator('[aria-current="step"]')).toHaveText(proximo);
  }
  await cartao.getByRole('button', { name: 'Avançar para “Entregue”' }).click();
  await expect(cartao).toHaveCount(0); // o painel lista só pedidos em andamento

  // Cliente: acompanha, avalia com 5 estrelas e vê a avaliação no feed.
  const telaCliente = await (await browser.newContext()).newPage();
  await entrarPelaTela(telaCliente, cliente.email);
  await telaCliente.getByRole('link', { name: 'Pedidos' }).click();
  const meuPedido = telaCliente.getByTestId('pedido').filter({ hasText: `Pedido #${pedido.id}` });
  await expect(meuPedido.locator('[aria-current="step"]')).toHaveText('Entregue');
  await semRolagemHorizontal(telaCliente);

  const comentario = `Gelado e encorpado! ${Date.now()}`;
  await meuPedido.getByRole('radio', { name: '5 estrela(s)' }).check();
  await meuPedido.getByLabel('Comentário').fill(comentario);
  await meuPedido.getByRole('button', { name: 'Publicar avaliação' }).click();
  await expect(meuPedido.getByLabel('Nota 5 de 5')).toBeVisible();

  // Grãos creditados na entrega: 2 × R$ 15,00 = 30 grãos (RN-002).
  await expect(telaCliente.getByText('🫘 30 grãos')).toBeVisible();

  await telaCliente.getByRole('link', { name: 'Feed', exact: true }).click();
  const primeiro = telaCliente.getByTestId('post').first();
  await expect(primeiro).toContainText(comentario);
  await expect(primeiro).toContainText('avaliação de');
});

test('cancelar só enquanto "recebido" (RN-007)', async ({ page, request }) => {
  const cliente = await criarCliente(request);
  const grao = cliente.lojas.find((l) => l.nome === 'Grão de Ouro');
  const { produtos } = await api(request, 'GET', `/cafeterias/${grao.id}`, { token: cliente.token });
  const cappuccino = produtos.find((p) => p.nome === 'Cappuccino da casa');
  const pedido = await api(request, 'POST', '/pedidos', {
    token: cliente.token, dados: { cafeteriaId: grao.id, itens: [{ produtoId: cappuccino.id, quantidade: 2 }] },
  });

  await entrarPelaTela(page, cliente.email);
  await page.getByRole('link', { name: 'Pedidos' }).click();
  const cartao = page.getByTestId('pedido').filter({ hasText: `Pedido #${pedido.id}` });
  await cartao.getByRole('button', { name: 'Cancelar pedido' }).click();
  await expect(cartao.getByText('Pedido cancelado')).toBeVisible();
  await expect(cartao.getByRole('button', { name: 'Cancelar pedido' })).toHaveCount(0);
});

test('RNF-005: telas principais sem rolagem horizontal', async ({ page, request }) => {
  const { email } = await criarCliente(request);
  await entrarPelaTela(page, email);
  await page.getByRole('button', { name: 'Pedir' }).first().click();
  for (const caminho of ['/', '/explorar', '/carrinho', '/pedidos']) {
    await page.goto(caminho);
    await page.waitForLoadState('networkidle');
    await semRolagemHorizontal(page);
  }
  await page.getByRole('button', { name: 'Sair' }).click();
  await page.getByRole('tab', { name: 'Criar conta' }).click();
  await semRolagemHorizontal(page);
});
