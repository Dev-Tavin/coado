import express from 'express';
import { ErroDeRegra } from './domain/erros.js';
import { criarRepositorioMemoria } from './repositories/memoria.js';
import { criarRotas } from './routes/index.js';
import { criarServicoAuth } from './services/auth.js';
import { criarServicoCafeterias } from './services/cafeterias.js';
import { criarServicoFeed } from './services/feed.js';
import { criarServicoPedidos } from './services/pedidos.js';
import { relogioDoSistema } from './services/relogio.js';

export function criarServicos(repo, { segredo, rodadasBcrypt, relogio = relogioDoSistema }) {
  return {
    auth: criarServicoAuth(repo, { segredo, rodadasBcrypt, relogio }),
    cafeterias: criarServicoCafeterias(repo, { relogio }),
    feed: criarServicoFeed(repo, { relogio }),
    pedidos: criarServicoPedidos(repo, { relogio }),
  };
}

/**
 * Cria a API (sem o front-end). Recebe repositório e relógio por parâmetro,
 * para que os testes usem um banco isolado e um horário fixo.
 */
export function criarApp({
  repo = criarRepositorioMemoria(),
  segredo = process.env.JWT_SECRET ?? 'coado-dev-segredo-troque-em-producao',
  rodadasBcrypt = Number(process.env.BCRYPT_ROUNDS ?? 10),
  relogio = relogioDoSistema,
} = {}) {
  const app = express();
  app.use(express.json({ limit: '100kb' }));
  app.use(criarRotas(criarServicos(repo, { segredo, rodadasBcrypt, relogio })));

  app.use((_req, res) => res.status(404).json({ erro: 'Rota não encontrada.' }));

  // Erros de regra → 4xx com o campo e a mensagem (RNF-003). Outros → 500 sem detalhes internos.
  app.use((erro, _req, res, _next) => {
    if (erro instanceof ErroDeRegra) {
      return res.status(erro.status).json({ erro: erro.message, campo: erro.campo, erros: erro.erros });
    }
    if (erro.type === 'entity.parse.failed') {
      return res.status(400).json({ erro: 'O corpo da requisição não é um JSON válido.' });
    }
    console.error(erro);
    return res.status(500).json({ erro: 'Erro interno. Tente de novo em instantes.' });
  });

  app.locals.repo = repo;
  return app;
}

export const app = criarApp();
