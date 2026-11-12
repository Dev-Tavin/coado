// RF-004 (feed), RF-005 (curtir e comentar) e RN-005 (selo "Em alta").
import { ErroDeRegra } from '../domain/erros.js';
import { calcularScore, contarUltimas24h, JANELA_MS, ordenarFeed, SCORE_EM_ALTA } from '../domain/feed.js';
import { produtoPublico } from './cafeterias.js';

const unicos = (lista) => [...new Set(lista.filter((v) => v !== null && v !== undefined))];
const porId = (linhas) => new Map(linhas.map((l) => [l.id, l]));
const agrupar = (linhas, campo) => {
  const mapa = new Map();
  for (const l of linhas) mapa.set(l[campo], [...(mapa.get(l[campo]) ?? []), l]);
  return mapa;
};
const COMENTARIO_MAXIMO = 500;

export function criarServicoFeed(repo, { relogio }) {
  /** Pedidos (não cancelados) das últimas 24 h que contêm cada produto. */
  async function pedidosRecentesPorProduto(cafeteriaIds, produtoIds, agora) {
    const pedidos = (await repo.listar('pedidos', { cafeteria_id: cafeteriaIds }))
      .filter((p) => p.status !== 'cancelado')
      .filter((p) => agora.getTime() - new Date(p.criado_em).getTime() < JANELA_MS);
    const itens = await repo.listar('itens_pedido', { pedido_id: pedidos.map((p) => p.id), produto_id: produtoIds });
    const pedidosPorProduto = new Map();
    for (const item of itens) {
      const conjunto = pedidosPorProduto.get(item.produto_id) ?? new Set();
      conjunto.add(item.pedido_id);
      pedidosPorProduto.set(item.produto_id, conjunto);
    }
    return pedidosPorProduto;
  }

  async function montar(posts, usuarioId) {
    if (posts.length === 0) return [];
    const agora = relogio.agora();
    const postIds = posts.map((p) => p.id);
    const cafeteriaIds = unicos(posts.map((p) => p.cafeteria_id));
    const produtoIds = unicos(posts.map((p) => p.produto_id));

    const [curtidas, comentarios, lojas, produtos, avaliacoes] = await Promise.all([
      repo.listar('curtidas', { post_id: postIds }),
      repo.listar('comentarios', { post_id: postIds }),
      repo.listar('cafeterias', { id: cafeteriaIds }),
      repo.listar('produtos', { id: produtoIds }),
      repo.listar('avaliacoes', { id: unicos(posts.map((p) => p.avaliacao_id)) }),
    ]);
    const autores = porId(await repo.listar('usuarios', {
      id: unicos([...posts.map((p) => p.autor_id), ...comentarios.map((c) => c.usuario_id)]),
    }));
    const pedidosPorProduto = await pedidosRecentesPorProduto(cafeteriaIds, produtoIds, agora);
    const curtidasPorPost = agrupar(curtidas, 'post_id');
    const comentariosPorPost = agrupar(comentarios, 'post_id');
    const lojasPorId = porId(lojas);
    const produtosPorId = porId(produtos);
    const avaliacoesPorId = porId(avaliacoes);

    const itens = posts.map((post) => {
      const curtidasDoPost = curtidasPorPost.get(post.id) ?? [];
      const comentariosDoPost = (comentariosPorPost.get(post.id) ?? [])
        .sort((a, b) => new Date(a.criado_em) - new Date(b.criado_em));
      const paraEvento = (l) => ({ criadoEm: l.criado_em });
      const interacoes = {
        curtidas: contarUltimas24h(curtidasDoPost.map(paraEvento), agora),
        comentarios: contarUltimas24h(comentariosDoPost.map(paraEvento), agora),
        pedidos: post.tipo === 'produto' ? (pedidosPorProduto.get(post.produto_id)?.size ?? 0) : 0,
      };
      const score = calcularScore(interacoes);
      const produto = produtosPorId.get(post.produto_id);
      const avaliacao = avaliacoesPorId.get(post.avaliacao_id);
      const loja = lojasPorId.get(post.cafeteria_id);
      const autor = autores.get(post.autor_id);
      return {
        id: post.id,
        tipo: post.tipo,
        texto: post.texto,
        fotoUrl: post.foto_url,
        criadoEm: post.criado_em,
        cafeteria: loja ? { id: loja.id, nome: loja.nome } : null,
        autor: autor ? { id: autor.id, nome: autor.nome } : null,
        produto: produto ? produtoPublico(produto) : null,
        avaliacao: avaliacao ? { nota: avaliacao.nota } : null,
        curtidas: curtidasDoPost.length,
        curtidoPorMim: curtidasDoPost.some((c) => c.usuario_id === usuarioId),
        comentarios: comentariosDoPost.map((c) => ({
          id: c.id, texto: c.texto, criadoEm: c.criado_em, autorNome: autores.get(c.usuario_id)?.nome ?? '—',
        })),
        interacoes24h: interacoes,
        score,
        emAlta: score >= SCORE_EM_ALTA,
      };
    });
    return ordenarFeed(itens);
  }

  /** Cliente: posts das cafeterias que segue. Cafeteria: os próprios posts. */
  async function feed(usuarioId, perfil) {
    let cafeteriaIds;
    if (perfil === 'cliente') {
      cafeteriaIds = (await repo.listar('seguidores', { cliente_id: usuarioId })).map((s) => s.cafeteria_id);
    } else {
      const loja = await repo.buscarUm('cafeterias', { usuario_id: usuarioId });
      cafeteriaIds = loja ? [loja.id] : [];
    }
    return montar(await repo.listar('posts', { cafeteria_id: cafeteriaIds }), usuarioId);
  }

  async function postsDaCafeteria(cafeteriaId, usuarioId) {
    return montar(await repo.listar('posts', { cafeteria_id: cafeteriaId }), usuarioId);
  }

  async function obterPost(postId) {
    const post = await repo.buscarUm('posts', { id: postId });
    if (!post) throw new ErroDeRegra('post', 'Post não encontrado. Ele pode ter sido removido.', 404);
    return post;
  }

  /** Curtir de novo desfaz a curtida. */
  async function alternarCurtida(usuarioId, postId) {
    await obterPost(postId);
    const ligacao = { post_id: postId, usuario_id: usuarioId };
    const existente = await repo.buscarUm('curtidas', ligacao);
    if (existente) await repo.remover('curtidas', ligacao);
    else await repo.inserir('curtidas', { ...ligacao, criado_em: relogio.agora().toISOString() });
    const total = (await repo.listar('curtidas', { post_id: postId })).length;
    return { curtido: !existente, curtidas: total };
  }

  async function comentar(usuarioId, postId, texto) {
    await obterPost(postId);
    texto = String(texto ?? '').trim();
    if (!texto) throw new ErroDeRegra('comentario', 'Escreva algo antes de comentar.');
    if (texto.length > COMENTARIO_MAXIMO) {
      throw new ErroDeRegra('comentario', `O comentário pode ter até ${COMENTARIO_MAXIMO} caracteres.`);
    }
    const autor = await repo.buscarUm('usuarios', { id: usuarioId });
    const c = await repo.inserir('comentarios', {
      post_id: postId, usuario_id: usuarioId, texto, criado_em: relogio.agora().toISOString(),
    });
    return { id: c.id, texto: c.texto, criadoEm: c.criado_em, autorNome: autor?.nome ?? '—' };
  }

  return { feed, postsDaCafeteria, alternarCurtida, comentar };
}
