// Gera prints das telas para o documento (Figuras 2 e 5).
// Uso: com o servidor rodando (npm start), execute: npm run capturas
// Opcional: COADO_URL=http://localhost:3000
import fs from 'node:fs';
import { chromium } from '@playwright/test';

const BASE = process.env.COADO_URL ?? 'http://localhost:3000';
const PASTA = 'docs/prints';
fs.mkdirSync(PASTA, { recursive: true });

const navegador = await chromium.launch();

async function sessao(email, largura, altura) {
  const contexto = await navegador.newContext({ viewport: { width: largura, height: altura }, locale: 'pt-BR', deviceScaleFactor: 2 });
  const pagina = await contexto.newPage();
  await pagina.goto(`${BASE}/entrar`);
  if (!email) return pagina;
  await pagina.getByLabel('E-mail').fill(email);
  await pagina.getByLabel('Senha').fill('cafe123');
  await pagina.getByRole('button', { name: 'Entrar', exact: true }).click();
  await pagina.getByRole('navigation', { name: 'Navegação principal' }).waitFor();
  return pagina;
}

async function print(pagina, nome, caminho) {
  if (caminho) await pagina.goto(`${BASE}${caminho}`);
  await pagina.waitForLoadState('networkidle');
  await pagina.screenshot({ path: `${PASTA}/${nome}.png`, fullPage: false });
  console.log(`  ${PASTA}/${nome}.png`);
}

for (const [sufixo, largura, altura] of [['celular', 360, 780], ['desktop', 1440, 900]]) {
  const anonimo = await sessao(null, largura, altura);
  await print(anonimo, `01-login-${sufixo}`);

  const cliente = await sessao('cliente@coado.app', largura, altura);
  await print(cliente, `02-feed-${sufixo}`, '/');
  await print(cliente, `03-explorar-${sufixo}`, '/explorar');
  await cliente.goto(`${BASE}/`);
  await cliente.getByTestId('post').filter({ hasText: 'Pão de queijo' }).getByRole('button', { name: 'Pedir' }).click();
  await print(cliente, `04-checkout-pedido-minimo-${sufixo}`, '/carrinho');
  await cliente.getByRole('button', { name: /Aumentar/ }).click();
  await cliente.getByTestId('total').waitFor();
  await print(cliente, `05-checkout-valido-${sufixo}`);
  await print(cliente, `06-pedidos-${sufixo}`, '/pedidos');
  await cliente.goto(`${BASE}/carrinho`);
  await cliente.getByRole('button', { name: 'Esvaziar' }).click();

  const loja = await sessao('graodeouro@coado.app', largura, altura);
  await print(loja, `07-painel-${sufixo}`, '/painel');
}

await navegador.close();
