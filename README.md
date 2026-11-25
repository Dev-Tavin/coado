# Coado — o feed das cafeterias

Marketplace de cafeterias com formato de rede social: cada post é um produto que pode ser
pedido ali mesmo. Projeto Integrado de **Testes de Software I** (Univille).

**Acadêmicos:** Gustavo Henrique, Nikollas Mueller e Luiz Guilherme.
**Repositório:** https://github.com/Dev-Tavin/coado

Stack: **Node.js + Express** (API), **React + Vite** (front-end), **Supabase** (opcional),
**Vitest**, **Supertest** e **Playwright** (testes).

## Rodar

```powershell
npm install
npm run build        # compila o front-end em web/dist
npm start            # http://localhost:3000
```

Na primeira execução o banco é preenchido com dados de demonstração. Senha de todas as contas: `cafe123`.

| Conta | Perfil | Para que serve |
|-------|--------|----------------|
| cliente@coado.app | Cliente (Centro) | segue 2 cafeterias, tem 250 grãos e 1 pedido entregue para avaliar |
| marina@coado.app | Cliente (América) | autora dos pedidos que deixam o Coado V60 "Em alta" |
| graodeouro@coado.app | Cafeteria (Centro, 24 h) | tem produto esgotado (Bolo de cenoura) |
| torrafina@coado.app | Cafeteria (América, 24 h) | |
| mokagloria@coado.app | Cafeteria (Glória, 07:00–19:00) | para testar "fechada" à noite |
| cafepirabeiraba@coado.app | Cafeteria (Pirabeiraba) | fica a mais de 8 km do Centro (fora do raio) |

Desenvolvimento com recarga automática: `npm run dev` (API na porta 3000) e, em outro
terminal, `npm run dev:web` (front em http://localhost:5173).

Para começar do zero, apague `data/coado.json`.

### Supabase (opcional)

1. Crie um projeto no Supabase e rode `supabase/schema.sql` no SQL Editor.
2. Defina `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` (veja `.env.example`).
3. `npm start`. O log mostra `repositório: supabase`.

Sem essas variáveis, o app usa o repositório em memória gravado em `data/coado.json`, com a
mesma interface. Os testes automatizados sempre usam um banco em memória isolado.

## Testes

```powershell
npm run test:unit          # Vitest + cobertura de src/domain/ (meta 80%, RNF-006)
npm run test:integration   # Vitest + Supertest na API
npx playwright install chromium   # só na primeira vez
npm run test:e2e           # Playwright em 360 px e 1440 px (RNF-005)
npm test                   # unitários + integração
```

Relatório HTML do Playwright: `npx playwright show-report`. Prints das telas para o
documento: com o servidor rodando, `npm run capturas` (gera `docs/prints/`).

## Estrutura

```
src/
  domain/         regras de negócio puras (RN-001 a RN-007), sem banco nem tela
    pedido.js       RN-001 frete e total, RN-003 validação do pedido
    fidelidade.js   RN-002   avaliacao.js  RN-004   feed.js  RN-005
    estoque.js      RN-006   status.js     RN-007   geo.js   distância (Haversine)
  services/       casos de uso: ligam o domínio aos repositórios
  repositories/   memória (testes/dev) e Supabase, mesma interface; seed.js
  routes/         rotas Express (finas)
  app.js          cria a API      server.js  API em /api + front-end
web/              front-end React + Vite (8 telas)
tests/unit        Vitest        tests/integration  Supertest        tests/e2e  Playwright
supabase/         schema.sql
docs/             resultados dos testes, evidências e prints
```

Os resultados dos testes, os bugs encontrados e as diferenças em relação ao documento estão
em [docs/RESULTADOS.md](docs/RESULTADOS.md).
