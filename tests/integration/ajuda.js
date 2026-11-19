import request from 'supertest';
import { criarApp, criarServicos } from '../../src/app.js';
import { criarRepositorioMemoria } from '../../src/repositories/memoria.js';
import { semear, SENHA_DEMO } from '../../src/repositories/seed.js';

/** Relógio que o teste pode avançar. Padrão: 10/11/2026 10:00 em Joinville (13:00 UTC). */
export function relogioControlado(inicio = '2026-11-10T13:00:00Z') {
  let atual = new Date(inicio).getTime();
  return {
    agora: () => new Date(atual),
    avancarDias: (dias) => { atual += dias * 86_400_000; },
    definir: (iso) => { atual = new Date(iso).getTime(); },
  };
}

/** App + banco de teste isolado (memória), já com os dados de demonstração. */
export async function montarAmbiente() {
  const repo = criarRepositorioMemoria();
  const relogio = relogioControlado();
  const opcoes = { repo, segredo: 'segredo-de-teste', rodadasBcrypt: 4, relogio };
  const app = criarApp(opcoes);
  await semear(repo, criarServicos(repo, opcoes), relogio);

  async function token(email) {
    const res = await request(app).post('/auth/login').send({ email, senha: SENHA_DEMO });
    if (res.status !== 200) throw new Error(`login falhou para ${email}: ${res.text}`);
    return res.body.token;
  }
  const cafeteria = (nome) => repo.buscarUm('cafeterias', { nome });
  const produto = (nome) => repo.buscarUm('produtos', { nome });

  return { app, repo, relogio, token, cafeteria, produto };
}

export const comToken = (req, token) => req.set('Authorization', `Bearer ${token}`);
