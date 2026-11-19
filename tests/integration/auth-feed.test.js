import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { comToken, montarAmbiente } from './ajuda.js';

let amb;
beforeEach(async () => {
  amb = await montarAmbiente();
});

describe('Cadastro e login (RF-001) + segurança (RNF-004)', () => {
  it('CT-011: senha gravada com hash bcrypt e rota sem token → 401', async () => {
    const res = await request(amb.app).post('/auth/cadastro').send({
      nome: 'Nova Cliente', email: 'Nova@Exemplo.com', senha: 'cafe123', perfil: 'cliente', bairro: 'Itaum',
    });
    expect(res.status).toBe(201);
    expect(res.body.usuario).toMatchObject({ email: 'nova@exemplo.com', perfil: 'cliente', saldoGraos: 0 });

    const gravado = await amb.repo.buscarUm('usuarios', { email: 'nova@exemplo.com' });
    expect(gravado.senha_hash).not.toBe('cafe123');
    expect(gravado.senha_hash).toMatch(/^\$2[aby]\$/);
    expect(await bcrypt.compare('cafe123', gravado.senha_hash)).toBe(true);

    const semToken = await request(amb.app).get('/pedidos');
    expect(semToken.status).toBe(401);
    expect(semToken.body.erro).toBe('Faça login para continuar.');
    expect((await comToken(request(amb.app).get('/pedidos'), 'token.falso.qualquer')).status).toBe(401);
  });

  it('cadastra cafeteria junto com o perfil da loja (RF-002)', async () => {
    const res = await request(amb.app).post('/auth/cadastro').send({
      nome: 'Eva', email: 'eva@cafe.com', senha: 'segura1', perfil: 'cafeteria', bairro: 'Saguaçu',
      cafeteria: { nome: 'Café da Eva', endereco: 'Rua A, 10', bairro: 'Saguaçu', abreAs: '08:00', fechaAs: '17:00' },
    });
    expect(res.status).toBe(201);
    expect(res.body.usuario.cafeteriaId).toEqual(expect.any(Number));
  });

  it.each([
    [{ email: 'x@y.com', senha: 'cafe123', perfil: 'cliente', bairro: 'Centro' }, 'nome'],
    [{ nome: 'A', email: 'sem-arroba', senha: 'cafe123', perfil: 'cliente', bairro: 'Centro' }, 'email'],
    [{ nome: 'A', email: 'a@b.com', senha: '123', perfil: 'cliente', bairro: 'Centro' }, 'senha'],
    [{ nome: 'A', email: 'a@b.com', senha: 'cafe123', perfil: 'admin', bairro: 'Centro' }, 'perfil'],
    [{ nome: 'A', email: 'a@b.com', senha: 'cafe123', perfil: 'cliente', bairro: 'Marte' }, 'bairro'],
    [{ nome: 'A', email: 'a@b.com', senha: 'cafe123', perfil: 'cafeteria', bairro: 'Centro',
      cafeteria: { nome: 'X', endereco: 'Y', bairro: 'Centro', abreAs: '18:00', fechaAs: '08:00' } }, 'horario'],
  ])('valida o cadastro e indica o campo (%#)', async (dados, campo) => {
    const res = await request(amb.app).post('/auth/cadastro').send(dados);
    expect(res.status).toBe(422);
    expect(res.body.campo).toBe(campo);
  });

  it('e-mail repetido → 409; senha errada → 401 com mensagem genérica', async () => {
    const repetido = await request(amb.app).post('/auth/cadastro').send({
      nome: 'Outro', email: 'cliente@coado.app', senha: 'cafe123', perfil: 'cliente', bairro: 'Centro',
    });
    expect(repetido.status).toBe(409);
    const errada = await request(amb.app).post('/auth/login').send({ email: 'cliente@coado.app', senha: 'errada1' });
    expect(errada.status).toBe(401);
    expect(errada.body.erro).toBe('E-mail ou senha incorretos. Confira e tente de novo.');
  });

  it('JSON malformado → 400', async () => {
    const res = await request(amb.app).post('/auth/login').set('Content-Type', 'application/json').send('{ruim');
    expect(res.status).toBe(400);
  });
});

describe('Feed, curtidas e comentários (RF-004, RF-005, RN-005)', () => {
  it('mostra só cafeterias seguidas, do mais recente ao mais antigo, com selo "Em alta"', async () => {
    const token = await amb.token('cliente@coado.app');
    const feed = (await comToken(request(amb.app).get('/feed'), token)).body;

    expect(new Set(feed.map((p) => p.cafeteria.nome))).toEqual(new Set(['Grão de Ouro', 'Torra Fina']));
    const datas = feed.map((p) => new Date(p.criadoEm).getTime());
    expect(datas).toEqual([...datas].sort((a, b) => b - a));

    const v60 = feed.find((p) => p.tipo === 'produto' && p.produto.nome === 'Coado V60 Etiópia');
    expect(v60.interacoes24h).toEqual({ curtidas: 0, comentarios: 1, pedidos: 10 });
    expect(v60).toMatchObject({ score: 52, emAlta: true });
    expect(feed.find((p) => p.produto?.nome === 'Bolo de cenoura').produto.esgotado).toBe(true);
  });

  it('selo some quando as interações saem da janela de 24 h', async () => {
    amb.relogio.avancarDias(1);
    const token = await amb.token('cliente@coado.app');
    const feed = (await comToken(request(amb.app).get('/feed'), token)).body;
    expect(feed.some((p) => p.emAlta)).toBe(false);
  });

  it('curtir alterna e comentar valida o texto', async () => {
    const token = await amb.token('cliente@coado.app');
    const [post] = (await comToken(request(amb.app).get('/feed'), token)).body;
    const curtir = () => comToken(request(amb.app).post(`/posts/${post.id}/curtir`), token);
    expect((await curtir()).body).toEqual({ curtido: true, curtidas: 1 });
    expect((await curtir()).body).toEqual({ curtido: false, curtidas: 0 });

    const vazio = await comToken(request(amb.app).post(`/posts/${post.id}/comentarios`), token).send({ texto: '   ' });
    expect(vazio.status).toBe(422);
    const ok = await comToken(request(amb.app).post(`/posts/${post.id}/comentarios`), token).send({ texto: 'Que delícia' });
    expect(ok.status).toBe(201);
    expect(ok.body.autorNome).toBe('Cliente Demo');
    expect((await comToken(request(amb.app).post('/posts/99999/curtir'), token)).status).toBe(404);
  });
});

describe('Explorar, seguir e painel da cafeteria (RF-002, RF-003, RF-006)', () => {
  it('Explorar lista só cafeterias até 8 km, da mais próxima à mais distante', async () => {
    const token = await amb.token('cliente@coado.app');
    const lojas = (await comToken(request(amb.app).get('/cafeterias'), token)).body;
    expect(lojas.map((l) => l.nome)).not.toContain('Café Colonial Pirabeiraba');
    expect(lojas.every((l) => l.distanciaKm <= 8)).toBe(true);
    const distancias = lojas.map((l) => l.distanciaKm);
    expect(distancias).toEqual([...distancias].sort((a, b) => a - b));
  });

  it('seguir faz os posts da cafeteria entrarem no feed; deixar de seguir tira', async () => {
    const token = await amb.token('cliente@coado.app');
    const moka = await amb.cafeteria('Moka Glória');
    const temMoka = async () =>
      (await comToken(request(amb.app).get('/feed'), token)).body.some((p) => p.cafeteria.nome === 'Moka Glória');

    expect(await temMoka()).toBe(false);
    await comToken(request(amb.app).post(`/cafeterias/${moka.id}/seguir`), token);
    expect(await temMoka()).toBe(true);
    await comToken(request(amb.app).delete(`/cafeterias/${moka.id}/seguir`), token);
    expect(await temMoka()).toBe(false);
  });

  it('cafeteria publica produto (vira post), edita estoque e perfil', async () => {
    const token = await amb.token('torrafina@coado.app');
    const publicar = (dados) => comToken(request(amb.app).post('/produtos'), token).send(dados);

    const invalido = await publicar({ nome: 'Latte', descricao: 'Leitoso', preco: 0, estoque: 3 });
    expect(invalido.body.campo).toBe('preco');
    const res = await publicar({ nome: 'Latte', descricao: 'Leitoso e cremoso', preco: '13.90', estoque: 3 });
    expect(res.status).toBe(201);
    expect(res.body.produto).toMatchObject({ nome: 'Latte', preco: 13.9, estoque: 3, esgotado: false });

    const feed = (await comToken(request(amb.app).get('/feed'), token)).body;
    expect(feed[0].produto.nome).toBe('Latte');

    const estoque = await comToken(request(amb.app).patch(`/produtos/${res.body.produto.id}`), token).send({ estoque: 0 });
    expect(estoque.body.esgotado).toBe(true);
    expect((await comToken(request(amb.app).patch(`/produtos/${res.body.produto.id}`), token).send({ estoque: -1 })).status)
      .toBe(422);

    const perfil = await comToken(request(amb.app).put('/painel/perfil'), token).send({
      nome: 'Torra Fina', endereco: 'Rua Otto Boehm, 121', bairro: 'América', abreAs: '06:30', fechaAs: '20:00',
    });
    expect(perfil.body).toMatchObject({ endereco: 'Rua Otto Boehm, 121', abreAs: '06:30' });
  });

  it('cliente não acessa o painel nem publica produto', async () => {
    const token = await amb.token('cliente@coado.app');
    expect((await comToken(request(amb.app).get('/painel'), token)).status).toBe(403);
    expect((await comToken(request(amb.app).post('/produtos'), token).send({})).status).toBe(403);
  });
});
