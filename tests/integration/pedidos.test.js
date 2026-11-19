import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { comToken, montarAmbiente } from './ajuda.js';

let amb;
let tokenCliente;
let tokenLoja;
let graoDeOuro;

beforeEach(async () => {
  amb = await montarAmbiente();
  tokenCliente = await amb.token('cliente@coado.app');
  tokenLoja = await amb.token('graodeouro@coado.app');
  graoDeOuro = await amb.cafeteria('Grão de Ouro');
});

const pedir = (itens, extra = {}) =>
  comToken(request(amb.app).post('/pedidos'), tokenCliente).send({ cafeteriaId: graoDeOuro.id, itens, ...extra });

describe('POST /pedidos', () => {
  it('recusa pedido abaixo do mínimo (exemplo da seção 5.2)', async () => {
    const pao = await amb.produto('Pão de queijo (6 un.)'); // R$ 9,90
    const res = await pedir([{ produtoId: pao.id, quantidade: 1 }], { distanciaKm: 3 });
    expect(res.status).toBe(422);
    expect(res.body.erro).toMatch(/Pedido mínimo/);
    expect(res.body.erro).toBe('Pedido mínimo é R$ 15,00, adicione mais R$ 5,10');
    expect(res.body.campo).toBe('subtotal');
  });

  it('CT-010: pedido válido grava, baixa o estoque e começa como "recebido"', async () => {
    const cappuccino = await amb.produto('Cappuccino da casa');
    await amb.repo.atualizar('produtos', cappuccino.id, { estoque: 5 });

    const res = await pedir([{ produtoId: cappuccino.id, quantidade: 2 }]);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ status: 'recebido', subtotal: 25, frete: 4, total: 29, pagamento: 'na_entrega' });
    expect((await amb.repo.buscarUm('produtos', { id: cappuccino.id })).estoque).toBe(3);
    expect(await amb.repo.buscarUm('pedidos', { id: res.body.id })).not.toBeNull();
  });

  it('recusa quantidade acima do estoque e produto esgotado (RN-006)', async () => {
    const bolo = await amb.produto('Bolo de cenoura'); // estoque 0
    const v60 = await amb.produto('Coado V60 Etiópia'); // estoque 20
    const res = await pedir([{ produtoId: bolo.id, quantidade: 1 }, { produtoId: v60.id, quantidade: 21 }]);
    expect(res.status).toBe(422);
    const mensagens = res.body.erros.map((e) => e.mensagem);
    expect(mensagens).toContain('Só há 20 unidade(s) de Coado V60 Etiópia em estoque. Diminua a quantidade.');
    expect(mensagens).toContain('Bolo de cenoura está esgotado.');
    expect((await amb.repo.buscarUm('produtos', { id: v60.id })).estoque).toBe(20); // nada foi baixado
  });

  it('recusa cafeteria a mais de 8 km (Pirabeiraba a partir do Centro)', async () => {
    const pira = await amb.cafeteria('Café Colonial Pirabeiraba');
    const colonial = await amb.produto('Café colonial (para 1)');
    const res = await comToken(request(amb.app).post('/pedidos'), tokenCliente)
      .send({ cafeteriaId: pira.id, itens: [{ produtoId: colonial.id, quantidade: 1 }] });
    expect(res.status).toBe(422);
    expect(res.body.erros.map((e) => e.campo)).toContain('distancia');
  });

  it('recusa cafeteria fechada', async () => {
    amb.relogio.definir('2026-11-10T23:30:00Z'); // 20:30 em Joinville; Moka Glória fecha às 19:00
    const moka = await amb.cafeteria('Moka Glória');
    const mocha = await amb.produto('Mocha');
    const res = await comToken(request(amb.app).post('/pedidos'), tokenCliente)
      .send({ cafeteriaId: moka.id, itens: [{ produtoId: mocha.id, quantidade: 2 }] });
    expect(res.status).toBe(422);
    expect(res.body.erro).toBe('A cafeteria está fechada agora. Ela funciona das 07:00 às 19:00.');
  });

  it('recusa produto de outra cafeteria no mesmo pedido', async () => {
    const coldBrew = await amb.produto('Cold brew 300 ml'); // Torra Fina
    const res = await pedir([{ produtoId: coldBrew.id, quantidade: 2 }]);
    expect(res.status).toBe(422);
    expect(res.body.campo).toBe('itens');
  });

  it('cafeteria não pode fazer pedido', async () => {
    const res = await comToken(request(amb.app).post('/pedidos'), tokenLoja).send({ cafeteriaId: graoDeOuro.id, itens: [] });
    expect(res.status).toBe(403);
  });
});

describe('Grãos de fidelidade (RN-002)', () => {
  it('resgata, credita só na entrega e devolve ao cancelar', async () => {
    const v60 = await amb.produto('Coado V60 Etiópia');
    const itens = [{ produtoId: v60.id, quantidade: 2 }]; // R$ 28,00 → limite R$ 14,00 → 1 bloco

    const sim = await comToken(request(amb.app).post('/pedidos/simular'), tokenCliente)
      .send({ cafeteriaId: graoDeOuro.id, itens, usarGraos: true });
    expect(sim.body).toMatchObject({ subtotal: 28, desconto: 10, graosUsados: 100, total: 22, graosGanhos: 18, valido: true });

    const pedido = (await pedir(itens, { usarGraos: true })).body;
    const saldo = async () => (await comToken(request(amb.app).get('/auth/me'), tokenCliente)).body.saldoGraos;
    expect(await saldo()).toBe(150);

    for (const status of ['em_preparo', 'saiu_para_entrega']) {
      await comToken(request(amb.app).patch(`/pedidos/${pedido.id}/status`), tokenLoja).send({ status });
      expect(await saldo()).toBe(150); // ainda não entregue
    }
    await comToken(request(amb.app).patch(`/pedidos/${pedido.id}/status`), tokenLoja).send({ status: 'entregue' });
    expect(await saldo()).toBe(168);

    const outro = (await pedir(itens, { usarGraos: true })).body;
    expect(await saldo()).toBe(68);
    const cancelado = await comToken(request(amb.app).post(`/pedidos/${outro.id}/cancelar`), tokenCliente);
    expect(cancelado.body.status).toBe('cancelado');
    expect(await saldo()).toBe(168);
    expect((await amb.repo.buscarUm('produtos', { id: v60.id })).estoque).toBe(18); // 20 − 2 (o cancelado voltou)
  });
});

describe('Status do pedido (RN-007)', () => {
  it('só avança na ordem e não cancela depois de "recebido"', async () => {
    const v60 = await amb.produto('Coado V60 Etiópia');
    const { id } = (await pedir([{ produtoId: v60.id, quantidade: 2 }])).body;
    const mudar = (status) => comToken(request(amb.app).patch(`/pedidos/${id}/status`), tokenLoja).send({ status });

    expect((await mudar('entregue')).status).toBe(409); // pula etapas
    expect((await mudar('em_preparo')).body.status).toBe('em_preparo');

    const cancelar = await comToken(request(amb.app).post(`/pedidos/${id}/cancelar`), tokenCliente);
    expect(cancelar.status).toBe(409);
    expect(cancelar.body.erro).toMatch(/só pode ser cancelado enquanto está "Recebido"/);
  });

  it('cliente não muda status e outra cafeteria não vê o pedido', async () => {
    const v60 = await amb.produto('Coado V60 Etiópia');
    const { id } = (await pedir([{ produtoId: v60.id, quantidade: 2 }])).body;
    expect((await comToken(request(amb.app).patch(`/pedidos/${id}/status`), tokenCliente).send({ status: 'em_preparo' })).status).toBe(403);
    const tokenTorra = await amb.token('torrafina@coado.app');
    expect((await comToken(request(amb.app).get(`/pedidos/${id}`), tokenTorra)).status).toBe(404);
  });
});

describe('Avaliação (RN-004) e histórico (RF-012)', () => {
  it('avalia pedido entregue e a avaliação aparece no feed', async () => {
    const historico = (await comToken(request(amb.app).get('/pedidos'), tokenCliente)).body;
    const entregue = historico.find((p) => p.status === 'entregue');
    expect(entregue.podeAvaliar).toBe(true);

    const res = await comToken(request(amb.app).post(`/pedidos/${entregue.id}/avaliacao`), tokenCliente)
      .send({ nota: 4, comentario: 'Muito bom, chegou rápido.' });
    expect(res.status).toBe(201);
    expect(res.body.avaliacao).toEqual({ nota: 4, comentario: 'Muito bom, chegou rápido.' });

    const feed = (await comToken(request(amb.app).get('/feed'), tokenCliente)).body;
    expect(feed[0]).toMatchObject({ tipo: 'avaliacao', texto: 'Muito bom, chegou rápido.', avaliacao: { nota: 4 } });

    const denovo = await comToken(request(amb.app).post(`/pedidos/${entregue.id}/avaliacao`), tokenCliente).send({ nota: 5 });
    expect(denovo.status).toBe(422);
    expect(denovo.body.erro).toBe('Este pedido já foi avaliado.');
  });

  it('recusa depois de 7 dias e nota fora de 1 a 5', async () => {
    const [entregue] = (await comToken(request(amb.app).get('/pedidos'), tokenCliente)).body;
    expect((await comToken(request(amb.app).post(`/pedidos/${entregue.id}/avaliacao`), tokenCliente).send({ nota: 6 })).body.campo)
      .toBe('nota');
    amb.relogio.avancarDias(6); // entregue há 2 dias + 6 = 8 dias
    const res = await comToken(request(amb.app).post(`/pedidos/${entregue.id}/avaliacao`), tokenCliente).send({ nota: 5 });
    expect(res.status).toBe(422);
    expect(res.body.erro).toMatch(/prazo/);
  });

  it('outro cliente não avalia pedido alheio', async () => {
    const [entregue] = (await comToken(request(amb.app).get('/pedidos'), tokenCliente)).body;
    const tokenMarina = await amb.token('marina@coado.app');
    const res = await comToken(request(amb.app).post(`/pedidos/${entregue.id}/avaliacao`), tokenMarina).send({ nota: 5 });
    expect(res.status).toBe(403);
  });
});
