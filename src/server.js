import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { criarApp, criarServicos } from './app.js';
import { criarRepositorio } from './repositories/index.js';
import { bancoVazio, semear } from './repositories/seed.js';
import { relogioDoSistema } from './services/relogio.js';

const PORTA = Number(process.env.PORT ?? 3000);
const segredo = process.env.JWT_SECRET ?? 'coado-dev-segredo-troque-em-producao';
if (!process.env.JWT_SECRET) console.warn('Aviso: JWT_SECRET não definido; usando o segredo de desenvolvimento.');

const repo = criarRepositorio();
if (await bancoVazio(repo)) {
  console.log('Banco vazio: criando dados de demonstração (senha de todas as contas: cafe123)...');
  await semear(repo, criarServicos(repo, { segredo, rodadasBcrypt: 10, relogio: relogioDoSistema }), relogioDoSistema);
}

const servidor = express();
servidor.use('/api', criarApp({ repo, segredo }));

// Front-end compilado (npm run build). Em desenvolvimento use "npm run dev:web" (Vite).
const dist = path.resolve('web/dist');
if (fs.existsSync(dist)) {
  servidor.use(express.static(dist));
  servidor.get(/.*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

servidor.listen(PORTA, () => {
  console.log(`Coado rodando em http://localhost:${PORTA} (repositório: ${repo.tipo})`);
});
