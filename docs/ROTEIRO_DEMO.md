# Roteiro da demonstração ao vivo (≈ 6 minutos)

Corresponde ao slide 9 do deck, "Demonstração ao vivo".

## Antes de começar (fazer 15 minutos antes, no computador da apresentação)

1. **Zerar os dados.** Isto é obrigatório: o selo "Em alta" depende de pedidos das últimas
   24 h, que são criados quando o banco nasce. Um `data/coado.json` antigo não terá mais o selo.
   ```powershell
   cd C:\Users\Gustavin\Documents\Testes\coado
   Remove-Item data\coado.json -ErrorAction SilentlyContinue
   npm run build
   npm start
   ```
   Espere aparecer `Coado rodando em http://localhost:3000`. Deixe esse terminal aberto.
2. **Abrir duas janelas do navegador, lado a lado:**
   - Janela normal: http://localhost:3000, entrar com `cliente@coado.app` / `cafe123`.
   - Janela anônima (Ctrl+Shift+N): http://localhost:3000, entrar com `graodeouro@coado.app` / `cafe123`.
3. **Abrir um segundo terminal** na pasta `coado` para a parte dos testes. Rode uma vez
   `npm test` para garantir que está tudo verde e que o Windows não vai pedir permissão no meio.
4. Zoom do navegador em 125% ou 150%, para a banca enxergar.
5. Quem fala: **Gustavo Henrique** conduz a parte do cliente (passos 1, 2 e 4),
   **Nikollas Mueller** a da cafeteria (passo 3) e **Luiz Guilherme** os testes no terminal (passo 5).

## Passo a passo

### 1. Cliente: o feed (≈ 1 min)
- **Mostrar** o primeiro post, *Coado V60 Etiópia*, com o selo **🔥 Em alta**.
- **Falar:** "O selo é a RN-005: curtidas × 1 + comentários × 2 + pedidos × 5 nas últimas 24 h.
  Esse post tem 10 pedidos e 1 comentário, score 52, então recebe o selo."
- **Rolar** até o *Bolo de cenoura*: o botão está **Esgotado** e desabilitado (RN-006, estoque 0).
- **Clicar em Explorar:** a *Café Colonial Pirabeiraba* não aparece. "Ela fica a mais de 8 km do
  Centro, então está fora do raio de entrega (RN-003). A distância é calculada no servidor."

### 2. Cliente: carrinho e checkout (≈ 1,5 min)
- Voltar ao **Feed** e clicar **Pedir** no *Coado V60* (R$ 14,00). O contador do carrinho vai para 1.
- **Abrir o Carrinho.** A mensagem diz "Pedido mínimo é R$ 15,00, adicione mais R$ 1,00" e
  "Finalizar pedido" está desabilitado. "RN-003 e RNF-003: a mensagem diz o que falta e o que fazer."
- Apertar **F5** (recarregar): o carrinho continua lá. "RNF-002: o carrinho fica no LocalStorage."
- Clicar **+** (2 unidades): subtotal **R$ 28,00**, frete **R$ 4,00** (até 2 km), total **R$ 32,00**.
- Marcar **Usar grãos**: desconto **R$ 10,00** e total **R$ 22,00**. "RN-002: a cliente tem 250
  grãos, mas o desconto é limitado a 50% do subtotal (R$ 14,00), então ela usa só 1 bloco de 100."
- Clicar **Finalizar pedido**. A tela de Pedidos mostra o pedido em **Recebido** e o saldo cai para **150 grãos**.

### 3. Cafeteria: painel (≈ 1 min)
- Ir para a **janela anônima** (Grão de Ouro) → **Painel**. Talvez seja preciso recarregar a página.
- O pedido novo aparece em "Pedidos em andamento". Clicar **Avançar para “Em preparo”**, depois
  **“Saiu para entrega”** e depois **“Entregue”**. Ao final, o pedido sai da lista de andamento.
- **Falar:** "RN-007: o status só avança, um passo por vez. Pela API, pular uma etapa ou cancelar um
  pedido em preparo é recusado; isso está nos testes."

### 4. Cliente: acompanhar e avaliar (≈ 1 min)
- Voltar à **janela da cliente** → **Pedidos**. A tela se atualiza sozinha a cada 10 s (ou aperte F5):
  o pedido está **Entregue**.
- O saldo foi para **168 grãos**. "Os 18 grãos (R$ 28 − R$ 10 de desconto) só foram creditados na entrega."
- No formulário **Avalie este pedido**: 5 estrelas, comentário "Chegou quentinho!", **Publicar avaliação**.
- Clicar **Feed**: a avaliação é o primeiro post. "RF-011: a avaliação de quem comprou vira conteúdo no feed."

### 5. Terminal: os testes (≈ 1,5 min)
No segundo terminal:
```powershell
npm run test:unit          # 38 testes + tabela de cobertura (96% em src/domain/)
npm run test:integration   # 30 testes da API com Supertest
npm run test:e2e           # 16 testes no navegador, ~25 s
```
- **Falar** durante o E2E: "O Playwright sobe um servidor próprio, com banco limpo, e roda cada fluxo
  em 360 px e em 1440 px. Isso cobre a RNF-005."
- Se sobrar tempo: `npx playwright show-report` abre o relatório visual.

## Plano B (se algo der errado ao vivo)

| Problema | O que fazer |
|----------|-------------|
| Selo "Em alta" não aparece | O banco é antigo: pare o servidor (Ctrl+C), apague `data\coado.json` e rode `npm start` de novo |
| Porta 3000 ocupada | `$env:PORT='3001'; npm start` e use http://localhost:3001 |
| `npm` bloqueado no PowerShell | `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, ou use o Prompt de Comando |
| E2E reclama do navegador | `npx playwright install chromium` (precisa de internet; faça antes) |
| Pedido não aparece no painel | Recarregue a página do painel (F5) |
| Nada funciona | Mostre os prints em `docs/prints/` e as saídas em `docs/evidencias/` |

## Perguntas prováveis da banca

- **Por que as regras ficam em `src/domain/`?** Para testar cada regra sozinha, sem tela e sem banco,
  em milissegundos. É a separação de responsabilidades pedida na seção 4.
- **Como cada teste de integração tem um banco limpo?** O repositório em memória tem a mesma interface
  do Supabase. Cada teste cria o seu com os dados de demonstração (`tests/integration/ajuda.js`).
- **Como testaram "cafeteria fechada" e "prazo de 7 dias" sem esperar?** O relógio é injetado no app.
  Nos testes ele é controlado: fica fixo às 10:00 e pode ser avançado em dias.
- **Por que a distância não vem do cliente?** Se viesse, o cliente poderia mentir para pagar menos
  frete. O servidor calcula a partir do bairro, com a fórmula de Haversine.
- **O Supabase funciona?** O adaptador e o `schema.sql` estão prontos, mas não foram testados com
  um projeto real. Os testes usam o banco em memória.
- **E se dois clientes comprarem a última unidade ao mesmo tempo?** É uma limitação conhecida do MVP:
  não há transação no banco. Com Supabase, isso seria resolvido com uma transação ou uma função no
  PostgreSQL.
- **Por que não houve homologação cruzada?** Respondam com o motivo real. Depois digam que os três
  níveis automatizados foram feitos, que o roteiro de aceitação está pronto e que, por isso, o
  parecer é "pronto com ressalvas", e não "pronto para lançamento".
- **Por que 4 testes E2E falharam na primeira vez?** O erro estava no script de teste (um seletor
  ambíguo e uma expectativa errada). Investigar essas falhas revelou o BUG-001.
