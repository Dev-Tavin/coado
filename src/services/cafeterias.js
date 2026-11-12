// RF-002 (perfil da cafeteria), RF-003 (publicar produto) e RF-006 (seguir / explorar).
import { BAIRROS } from '../config/bairros.js';
import { ErroDeRegra } from '../domain/erros.js';
import { validarEstoque } from '../domain/estoque.js';
import { distanciaKm } from '../domain/geo.js';
import { estaAberta, horaParaMinutos, RAIO_MAXIMO_KM } from '../domain/pedido.js';
import { horaLocal } from './relogio.js';

const HORA = /^\d{2}:\d{2}$/;

/** Valida e normaliza nome, endereço, bairro, horário e foto da cafeteria. */
export function validarDadosCafeteria({ nome, endereco, bairro, abreAs, fechaAs, fotoUrl }) {
  nome = String(nome ?? '').trim();
  endereco = String(endereco ?? '').trim();
  if (!nome) throw new ErroDeRegra('nomeCafeteria', 'Informe o nome da cafeteria.');
  if (!endereco) throw new ErroDeRegra('endereco', 'Informe o endereço da cafeteria (rua e número).');
  if (!BAIRROS[bairro]) throw new ErroDeRegra('bairro', 'Escolha o bairro da cafeteria na lista.');
  const horarioValido = (h) => HORA.test(h ?? '') && (() => { try { horaParaMinutos(h); return true; } catch { return false; } })();
  if (!horarioValido(abreAs) || !horarioValido(fechaAs)) {
    throw new ErroDeRegra('horario', 'Informe o horário no formato HH:MM, por exemplo 07:00 e 18:00.');
  }
  if (horaParaMinutos(abreAs) >= horaParaMinutos(fechaAs)) {
    throw new ErroDeRegra('horario', 'O horário de fechamento deve ser depois do de abertura.');
  }
  return {
    nome, endereco, bairro, ...BAIRROS[bairro], abre_as: abreAs, fecha_as: fechaAs,
    foto_url: String(fotoUrl ?? '').trim() || null,
  };
}

export function produtoPublico(p) {
  return {
    id: p.id,
    cafeteriaId: p.cafeteria_id,
    nome: p.nome,
    descricao: p.descricao,
    preco: Number(p.preco),
    estoque: p.estoque,
    esgotado: p.estoque <= 0,
    fotoUrl: p.foto_url,
  };
}

export function criarServicoCafeterias(repo, { relogio }) {
  async function minhaCafeteria(usuarioId) {
    const loja = await repo.buscarUm('cafeterias', { usuario_id: usuarioId });
    if (!loja) throw new ErroDeRegra('perfil', 'Esta ação é só para contas de cafeteria.', 403);
    return loja;
  }

  function cafeteriaPublica(loja, { cliente, seguidas = new Set() } = {}) {
    const distancia = cliente ? distanciaKm(cliente, loja) : null;
    return {
      id: loja.id,
      nome: loja.nome,
      endereco: loja.endereco,
      bairro: loja.bairro,
      abreAs: loja.abre_as,
      fechaAs: loja.fecha_as,
      fotoUrl: loja.foto_url,
      aberta: estaAberta(horaLocal(relogio.agora()), loja.abre_as, loja.fecha_as),
      distanciaKm: distancia,
      entrega: distancia === null ? null : distancia <= RAIO_MAXIMO_KM,
      seguindo: seguidas.has(loja.id),
    };
  }

  async function contexto(usuarioId) {
    const usuario = await repo.buscarUm('usuarios', { id: usuarioId });
    const seguidas = new Set(
      (await repo.listar('seguidores', { cliente_id: usuarioId })).map((s) => s.cafeteria_id),
    );
    return { cliente: usuario, seguidas };
  }

  /** RF-006 Explorar: cafeterias dentro do raio de 8 km, da mais próxima para a mais distante. */
  async function explorar(usuarioId) {
    const ctx = await contexto(usuarioId);
    return (await repo.listar('cafeterias'))
      .map((loja) => cafeteriaPublica(loja, ctx))
      .filter((c) => c.entrega)
      .sort((a, b) => a.distanciaKm - b.distanciaKm);
  }

  async function detalhar(cafeteriaId, usuarioId) {
    const loja = await repo.buscarUm('cafeterias', { id: cafeteriaId });
    if (!loja) throw new ErroDeRegra('cafeteria', 'Cafeteria não encontrada.', 404);
    const produtos = await repo.listar('produtos', { cafeteria_id: loja.id });
    return { ...cafeteriaPublica(loja, await contexto(usuarioId)), produtos: produtos.map(produtoPublico) };
  }

  async function atualizarPerfil(usuarioId, dados) {
    const loja = await minhaCafeteria(usuarioId);
    const atualizada = await repo.atualizar('cafeterias', loja.id, validarDadosCafeteria(dados));
    return cafeteriaPublica(atualizada);
  }

  async function seguir(usuarioId, perfil, cafeteriaId) {
    if (perfil !== 'cliente') throw new ErroDeRegra('perfil', 'Só clientes seguem cafeterias.', 403);
    if (!(await repo.buscarUm('cafeterias', { id: cafeteriaId }))) {
      throw new ErroDeRegra('cafeteria', 'Cafeteria não encontrada.', 404);
    }
    const ligacao = { cliente_id: usuarioId, cafeteria_id: cafeteriaId };
    if (!(await repo.buscarUm('seguidores', ligacao))) await repo.inserir('seguidores', ligacao);
    return { seguindo: true };
  }

  async function deixarDeSeguir(usuarioId, cafeteriaId) {
    await repo.remover('seguidores', { cliente_id: usuarioId, cafeteria_id: cafeteriaId });
    return { seguindo: false };
  }

  /** RF-003: produto + post no feed. */
  async function publicarProduto(usuarioId, { nome, descricao, preco, estoque, fotoUrl }) {
    const loja = await minhaCafeteria(usuarioId);
    nome = String(nome ?? '').trim();
    descricao = String(descricao ?? '').trim();
    preco = Number(preco);
    estoque = Number(estoque);
    if (!nome) throw new ErroDeRegra('nome', 'Informe o nome do produto.');
    if (!descricao) throw new ErroDeRegra('descricao', 'Escreva uma descrição para o post.');
    if (!Number.isFinite(preco) || preco <= 0 || preco > 1000) {
      throw new ErroDeRegra('preco', 'Informe um preço maior que zero e até R$ 1.000,00.');
    }
    const erroEstoque = validarEstoque(estoque);
    if (erroEstoque) throw new ErroDeRegra(erroEstoque.campo, erroEstoque.mensagem);

    const foto = String(fotoUrl ?? '').trim() || null;
    const produto = await repo.inserir('produtos', {
      cafeteria_id: loja.id, nome, descricao, preco: Math.round(preco * 100) / 100, estoque, foto_url: foto,
    });
    const post = await repo.inserir('posts', {
      autor_id: usuarioId, cafeteria_id: loja.id, produto_id: produto.id, avaliacao_id: null,
      tipo: 'produto', texto: descricao, foto_url: foto, criado_em: relogio.agora().toISOString(),
    });
    return { produto: produtoPublico(produto), postId: post.id };
  }

  async function atualizarEstoque(usuarioId, produtoId, estoque) {
    const loja = await minhaCafeteria(usuarioId);
    const produto = await repo.buscarUm('produtos', { id: produtoId, cafeteria_id: loja.id });
    if (!produto) throw new ErroDeRegra('produto', 'Produto não encontrado na sua cafeteria.', 404);
    const erro = validarEstoque(Number(estoque));
    if (erro) throw new ErroDeRegra(erro.campo, erro.mensagem);
    return produtoPublico(await repo.atualizar('produtos', produto.id, { estoque: Number(estoque) }));
  }

  async function painel(usuarioId) {
    const loja = await minhaCafeteria(usuarioId);
    const produtos = await repo.listar('produtos', { cafeteria_id: loja.id });
    return { cafeteria: cafeteriaPublica(loja), produtos: produtos.map(produtoPublico) };
  }

  return {
    explorar, detalhar, atualizarPerfil, seguir, deixarDeSeguir,
    publicarProduto, atualizarEstoque, painel, minhaCafeteria,
  };
}
