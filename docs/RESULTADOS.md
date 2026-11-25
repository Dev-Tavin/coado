# Coado — resultados dos testes e complementos do documento técnico

**Acadêmicos:** Gustavo Henrique, Nikollas Mueller e Luiz Guilherme.
**1.2 Repositório oficial no GitHub:** https://github.com/Dev-Tavin/coado

Material para completar as seções 5 a 8 do documento `Coado_Projeto_Integrado.pdf`.
Números da execução de 19/11/2026. As saídas completas estão em `docs/evidencias/` e os
prints das telas em `docs/prints/`.

## Requisitos implementados

Todos os 12 RFs foram implementados, inclusive os de prioridade Média e Baixa.

| RF | Onde está | Testado em |
|----|-----------|------------|
| RF-001 Cadastro e login (Cliente/Cafeteria) | `services/auth.js`, tela Entrar | integração `auth-feed.test.js` |
| RF-002 Perfil da cafeteria | `services/cafeterias.js`, Painel | integração |
| RF-003 Publicar produto como post | `publicarProduto`, Painel | integração, E2E CT-014 |
| RF-004 Feed + selo "Em alta" | `services/feed.js`, Feed | unit RN-005, integração, E2E CT-012 |
| RF-005 Curtir e comentar | `services/feed.js`, cartão do post | integração |
| RF-006 Seguir e Explorar (8 km) | `services/cafeterias.js`, Explorar | integração, E2E |
| RF-007 Carrinho direto do post | botão "Pedir", `web/src/carrinho.js` | E2E CT-012, CT-013 |
| RF-008 Frete, desconto, total e finalizar | `services/pedidos.js`, Carrinho | unit RN-001/003, integração CT-010, E2E |
| RF-009 Grãos de fidelidade | `domain/fidelidade.js` | unit CT-004, integração |
| RF-010 Status do pedido | `avancarStatus`, Painel e Pedidos | unit CT-009, integração, E2E |
| RF-011 Avaliação no feed | `avaliar`, Pedidos | unit CT-007, integração, E2E |
| RF-012 Histórico de pedidos | `GET /pedidos`, Pedidos | integração |

## 5. Comandos e resultados por nível

| Nível | Ferramenta | Comando | Resultado |
|-------|-----------|---------|-----------|
| Unitário | Vitest 5.1 + coverage-v8 | `npm run test:unit` | **38 passed**; cobertura `src/domain/`: **96,2%** instruções, 95,8% linhas, 92,5% ramos, 96,9% funções |
| Integração | Vitest + Supertest 7 | `npm run test:integration` | **30 passed** |
| Sistema (E2E) | Playwright 1.65 (Chromium) | `npm run test:e2e` | **16 passed** (8 cenários × 2 larguras: 360 px e 1440 px) |
| Aceitação | Roteiro manual | Aula 05 | **Aprovado** pela equipe parceira; 5 de 5 passos concluídos sem ajuda |

Evidências para as Figuras 3, 4 e 5: `docs/evidencias/01-unitarios-vitest.txt`,
`02-integracao-supertest.txt` e `03-e2e-playwright.txt`. Para prints do terminal, basta rodar
os comandos acima. O relatório visual do Playwright abre com `npx playwright show-report`.

Figura 2 (telas): `docs/prints/` tem 7 telas em celular e desktop (login, feed, explorar,
checkout com erro, checkout válido, pedidos, painel). Elas foram geradas a partir do app real,
não do Figma. Se vocês tiverem os protótipos do Figma, usem os dois: o protótipo e a tela
implementada.

## 5.4 Testes de aceitação cruzada (Aula 05)

Sessão realizada em 25/11/2026, às 19h43, num notebook, com o sistema rodando localmente.
A equipe parceira seguiu o roteiro sozinha e respondeu na ficha `Homologacao_Coado.html`.

- **Equipe homologadora:** equipe dos acadêmicos Lucas Meireles e Guilherme Alves.
- **Acadêmicos homologadores:** Lucas Meireles e Guilherme Alves.
- **Parecer final de homologação:** (X) **Aprovado**. A justificativa não foi preenchida na ficha.

| Passo | Concluiu | Ajuda | Problemas |
|-------|----------|-------|-----------|
| 1. Criar conta e seguir cafeteria | Sim | Não | Nenhum |
| 2. Pedir do feed e finalizar | Sim | Não | Nenhum |
| 3. Pedido abaixo de R$ 15,00 | Sim | Não | Nenhum. Mensagem: "Pedido mínimo é R$ 15,00, adicione mais R$ 1,00" |
| 4. Cafeteria: produto e status | Sim | Não | Nenhum |
| 5. Avaliar e conferir no feed | Sim | Não | Nenhum |

- **Facilidade de uso:** 5 de 5. Nenhuma mensagem de erro difícil de entender.
- **Mais gostaram:** o limite de pedido mínimo, criar um produto novo e rolar o feed.
- **Mais atrapalhou:** se o cliente não segue ninguém, o feed fica vazio. Registrado como
  sugestão de melhoria, não como defeito, porque o comportamento segue o RF-004.
- **Usariam o Coado:** sim; "site é simples e bem bonito, fácil de usar e responsivo".
- **Problemas registrados:** nenhum.

## 6.1 Plano de casos de teste: coluna Status

| ID | Status | Onde está o teste | Resultado obtido |
|----|--------|-------------------|------------------|
| CT-001 | **Passou** | `tests/unit/pedido.test.js` | `calcularFrete(2, 30)` = 4 |
| CT-002 | **Passou** | `tests/unit/pedido.test.js` | `calcularFrete(5.3, 30)` = 10 |
| CT-003 | **Passou** | `tests/unit/pedido.test.js` | 11,5 e 0 |
| CT-004 | **Passou** | `tests/unit/regras.test.js` | `{ graosUsados: 100, desconto: 10 }` |
| CT-005 | **Passou** | `tests/unit/pedido.test.js` | recusado, "Pedido mínimo é R$ 15,00, adicione mais R$ 3,50" |
| CT-006 | **Passou** | `tests/unit/pedido.test.js` | 8,0 km aceito; 8,1 km recusado |
| CT-007 | **Passou** | `tests/unit/regras.test.js` | 8 dias e nota 6 recusados |
| CT-008 | **Passou** | `tests/unit/regras.test.js` | score 50 com selo; 49 sem selo |
| CT-009 | **Passou** | `tests/unit/regras.test.js` | as duas transições recusadas |
| CT-010 | **Passou** | `tests/integration/pedidos.test.js` | 201, pedido salvo como "recebido", estoque 5 → 3 |
| CT-011 | **Passou** | `tests/integration/auth-feed.test.js` | senha gravada como hash `$2b$…`; `GET /pedidos` sem token → 401 |
| CT-012 | **Passou** | `tests/e2e/carrinho.spec.js` | pedido criado com status "Recebido" (nas duas larguras) |
| CT-013 | **Passou** | `tests/e2e/carrinho.spec.js` | contador do carrinho = 1 após recarregar |
| CT-014 | **Passou** | `tests/e2e/carrinho.spec.js` | mensagem "Pedido mínimo é R$ 15,00, adicione mais R$ 5,00" e botão "Finalizar pedido" desabilitado |

Além dos 14 casos do plano, a bateria tem testes extras. Se quiserem, eles podem entrar como
CT-015 em diante:
- **Integração:** cafeteria fechada; produto de outra cafeteria; quantidade acima do estoque;
  ciclo completo dos grãos (resgate, crédito só na entrega e estorno ao cancelar); avaliação
  depois de 7 dias; avaliação de pedido alheio (403); selo que some após 24 h; seguir e deixar
  de seguir; publicar produto e editar estoque.
- **E2E:** produto esgotado; Explorar sem a cafeteria a mais de 8 km; fluxo da cafeteria até
  "entregue" com avaliação no feed; cancelamento; sem rolagem horizontal nas telas principais.

### 6.2 Resultado obtido dos casos detalhados

- **CT-002:** a função retornou 10 (R$ 4,00 + 4 km × R$ 1,50), conforme esperado. Ferramenta: Vitest 5.1.
- **CT-014:** a mensagem "Pedido mínimo é R$ 15,00, adicione mais R$ 5,00" apareceu logo abaixo
  do subtotal e o botão "Finalizar pedido" ficou desabilitado, em 360 px e em 1440 px.
  Ferramenta: Playwright 1.65. Print: `docs/prints/04-checkout-pedido-minimo-celular.png`.
  Esse print usa um produto de R$ 9,90, então mostra "adicione mais R$ 5,10".

## 7. Bugs encontrados no desenvolvimento

**DEFEITO: [BUG-001] Estrelas da avaliação pequenas demais para tocar** · Severidade: **Baixa**
- **Encontrado em:** print do teste E2E do fluxo de avaliação (Playwright), em 1440 px e 360 px.
- **Passos para reproduzir:** 1. Entrar como cliente com um pedido entregue; 2. Abrir Pedidos; 3. Olhar o formulário "Avalie este pedido".
- **Comportamento obtido:** as 5 estrelas apareciam com cerca de 14 px, porque a regra CSS
  `.avaliar label` (0,9rem) sobrescrevia o tamanho definido para as estrelas.
- **Comportamento esperado:** alvo de toque confortável no celular (cerca de 44 px).
- **Status da correção:** [x] Resolvido no commit #6158381 (v0.5). Seletor mais específico em
  `web/src/estilo.css`, com 2rem e padding.
- **Evidência:** print antes da correção (tirar de novo revertendo a regra, se quiserem) e
  `docs/prints/06-pedidos-*.png` depois.

**DEFEITO: [BUG-002] Cafeteria 24 horas não conseguiria salvar o perfil** · Severidade: **Média**
- **Encontrado em:** revisão de código da tela Painel, antes da execução dos testes.
- **Passos para reproduzir:** 1. Entrar como `graodeouro@coado.app` (horário 00:00–24:00);
  2. Painel → Perfil da cafeteria; 3. Salvar.
- **Comportamento obtido:** o campo HTML `type="time"` não aceita "24:00". Ele ficava vazio e
  o salvamento era recusado com "Informe o horário no formato HH:MM".
- **Comportamento esperado:** aceitar "24:00" como fechamento à meia-noite, como a RN-003
  permite.
- **Status da correção:** [x] Resolvido no commit #6158381 (v0.5). Os campos de horário passaram a
  ser texto no formato HH:MM, validado pela API.

Observação para o relatório: na primeira execução do Playwright, 4 de 16 testes falharam.
Nas 4 falhas o defeito estava no **script de teste**, não no sistema: um seletor ambíguo e uma
asserção sobre o painel, que lista só pedidos em andamento. A investigação dessas falhas foi
o que revelou o BUG-001.

## 8.1 Indicadores

| Indicador | Valor |
|-----------|-------|
| Casos de teste planejados | 14 |
| Casos executados | 14 (+ testes extras: 84 testes automatizados no total = 38 unitários + 30 integração + 16 E2E) |
| Passaram na primeira execução | 14 de 14 casos do plano. Na bateria inteira: unitários 38/38, integração 30/30, E2E 12/16 (falhas do script de teste, ver seção 7) |
| Bugs abertos (testes internos + homologação) | 2 internos; 0 na homologação |
| Bugs corrigidos | 2 de 2 |
| Cobertura de código em `src/domain/` | 96,2% das instruções, 95,8% das linhas (meta 80%: atingida) |

**Parecer da equipe (o mesmo dos slides e do documento): pronto para lançamento.** Os critérios
da seção 8.2 foram atingidos: todos os casos de prioridade Alta passam, não há bug Crítico ou Alto
em aberto e a cobertura é ≥ 80%. A equipe parceira também aprovou o sistema na homologação. Para
produção, ainda recomenda-se testar com um projeto Supabase real.

## Diferenças em relação ao documento (ajustar no texto)

1. **Banco dos testes de integração:** a seção 5 fala em "banco de teste no Supabase". Os
   testes usam um repositório **em memória**, com a mesma interface do repositório Supabase,
   recriado a cada teste. Assim os testes rodam sem internet nem credenciais e não interferem
   uns nos outros. O adaptador Supabase está em `src/repositories/supabase.js` e o schema em
   `supabase/schema.sql`, mas **não foi executado contra um Supabase real**, porque não tive
   acesso a um projeto. Configurem as chaves e façam um teste manual antes da apresentação.
2. **Distância:** o exemplo da 5.2 envia `distanciaKm` no corpo do pedido. A API ignora esse
   campo e calcula a distância no servidor (fórmula de Haversine), a partir do bairro do cliente
   e da localização da cafeteria. Isso impede que o cliente informe uma distância falsa para
   pagar menos frete. O teste do exemplo continua passando.
3. **Colunas extras no modelo de dados (4.3):** `usuarios.bairro/latitude/longitude`,
   `posts.cafeteria_id/avaliacao_id`, `pedidos.graos_usados/graos_ganhos/pagamento`. Estão
   marcadas com `(+)` no `schema.sql`.
4. **Localização:** o cliente escolhe o bairro de Joinville no cadastro, em vez de GPS.
   A lista está em `src/config/bairros.js`.
5. **Fotos:** são links (URL), sem upload para o Supabase Storage. Sem foto, a tela mostra um
   placeholder.
6. **Um pedido por cafeteria:** o carrinho aceita produtos de uma cafeteria por vez. Ao pedir de
   outra, a tela avisa e oferece esvaziar o carrinho.
7. **Códigos HTTP:** regra de negócio violada → 422; transição de status inválida → 409;
   sem token → 401; ação de outro perfil → 403.
8. **Tela "Acompanhar pedido":** fica junto do histórico, na tela Pedidos, e se atualiza
   sozinha a cada 10 segundos.
