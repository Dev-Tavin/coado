import { expect } from '@playwright/test';

export const SENHA = 'cafe123';
let contador = 0;

async function api(request, metodo, caminho, { token, dados } = {}) {
  const res = await request.fetch(`/api${caminho}`, {
    method: metodo,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    data: dados,
  });
  if (!res.ok()) throw new Error(`${metodo} ${caminho} → ${res.status()}: ${await res.text()}`);
  return res.json();
}

/** Cria um cliente novo (isolado dos outros testes) que segue as cafeterias informadas. */
export async function criarCliente(request, { bairro = 'Centro', seguir = ['Grão de Ouro', 'Torra Fina'] } = {}) {
  const email = `e2e${Date.now()}${contador++}@teste.com`;
  const { token, usuario } = await api(request, 'POST', '/auth/cadastro', {
    dados: { nome: `Cliente E2E ${contador}`, email, senha: SENHA, perfil: 'cliente', bairro },
  });
  const lojas = await api(request, 'GET', '/cafeterias', { token });
  for (const nome of seguir) {
    const loja = lojas.find((l) => l.nome === nome);
    await api(request, 'POST', `/cafeterias/${loja.id}/seguir`, { token });
  }
  return { email, token, usuario, lojas };
}

export async function tokenDe(request, email) {
  return (await api(request, 'POST', '/auth/login', { dados: { email, senha: SENHA } })).token;
}

export { api };

/** Login pela tela, como o usuário faria. */
export async function entrarPelaTela(page, email, senha = SENHA) {
  await page.goto('/entrar');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill(senha);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('navigation', { name: 'Navegação principal' })).toBeVisible();
}

/** RNF-005: nenhuma rolagem horizontal na largura atual. */
export async function semRolagemHorizontal(page) {
  const { rolagem, largura } = await page.evaluate(() => ({
    rolagem: document.documentElement.scrollWidth,
    largura: document.documentElement.clientWidth,
  }));
  expect(rolagem, `página mais larga (${rolagem}px) que a tela (${largura}px)`).toBeLessThanOrEqual(largura);
}
