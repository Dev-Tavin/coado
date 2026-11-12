// RF-007/RF-008 (carrinho e checkout), RF-009 (grãos), RF-010 (status),
// RF-011 (avaliação) e RF-012 (histórico).
import { validarAvaliacao } from '../domain/avaliacao.js';
import { ErroDeRegra } from '../domain/erros.js';
import { baixarEstoque, validarQuantidade } from '../domain/estoque.js';
import { calcularGraosGanhos, calcularResgate, deveCreditarGraos } from '../domain/fidelidade.js';
import { distanciaKm } from '../domain/geo.js';
import { calcularFrete, calcularSubtotal, calcularTotal, validarPedido } from '../domain/pedido.js';
import {
  CANCELADO, proximoStatus, ROTULO_STATUS, validarCancelamento, validarTransicao,
} from '../domain/status.js';
import { horaLocal } from './relogio.js';

const COMENTARIO_MAXIMO = 500;

export function criarServicoPedidos(repo, { relogio }) {
  async function obterCliente(usuarioId) {
    const cliente = await repo.buscarUm('usuarios', { id: usuarioId });
    if (!cliente || cliente.perfil !== 'cliente') {
      throw new ErroDeRegra('perfil', 'Só clientes fazem pedidos. Entre com uma conta de cliente.', 403);
    }
    return cliente;
  }

  /** Junta itens repetidos do mesmo produto e valida o formato. */
  function normalizarItens(itens) {
    if (!Array.isArray(itens) || itens.length === 0) {
      throw new ErroDeRegra('itens', 'Adicione pelo menos um produto ao carrinho.');
    }
    const quantidades = new Map();
    for (const item of itens) {
      const produtoId = Number(item?.produtoId);
      const quantidade = Number(item?.quantidade);
      if (!Number.isInteger(produtoId)) throw new ErroDeRegra('itens', 'Item do carrinho inválido. Atualize a página.');
      quantidades.set(produtoId, (quantidades.get(produtoId) ?? 0) + quantidade);
    }
    return quantidades;
  }

  /** Calcula tudo sem gravar nada: usado ao vivo pelo checkout e antes de finalizar. */
  async function calcular(usuarioId, { cafeteriaId, itens, usarGraos = false }) {
    const cliente = await obterCliente(usuarioId);
    const loja = await repo.buscarUm('cafeterias', { id: Number(cafeteriaId) });
    if (!loja) throw new ErroDeRegra('cafeteria', 'Cafeteria não encontrada. Esvazie o carrinho e comece de novo.', 404);

    const quantidades = normalizarItens(itens);
    const produtos = await repo.listar('produtos', { id: [...quantidades.keys()] });
    if (produtos.length !== quantidades.size || produtos.some((p) => p.cafeteria_id !== loja.id)) {
      throw new ErroDeRegra('itens', 'Um dos produtos não existe mais ou não é desta cafeteria. Atualize o carrinho.');
    }

    const erros = [];
    const linhas = produtos.map((p) => {
      const quantidade = quantidades.get(p.id);
      const erro = validarQuantidade(quantidade, p.estoque, p.nome); // RN-006
      if (erro) erros.push({ ...erro, produtoId: p.id });
      return { produtoId: p.id, nome: p.nome, quantidade, precoUnitario: Number(p.preco), estoque: p.estoque };
    });

    const subtotal = calcularSubtotal(linhas);
    const distancia = distanciaKm(cliente, loja);
    const validacao = validarPedido({
      subtotal, distanciaKm: distancia, hora: horaLocal(relogio.agora()), abreAs: loja.abre_as, fechaAs: loja.fecha_as,
    });
    erros.push(...validacao.erros);

    const frete = calcularFrete(distancia, subtotal);
    const resgate = usarGraos ? calcularResgate(cliente.saldo_graos, subtotal) : { graosUsados: 0, desconto: 0 };
    return {
      cafeteria: { id: loja.id, nome: loja.nome },
      itens: linhas,
      subtotal,
      frete,
      desconto: resgate.desconto,
      graosUsados: resgate.graosUsados,
      graosDisponiveis: cliente.saldo_graos,
      total: calcularTotal({ subtotal, frete, desconto: resgate.desconto }),
      graosGanhos: calcularGraosGanhos(subtotal, resgate.desconto),
      distanciaKm: distancia,
      pagamento: 'na_entrega',
      valido: erros.length === 0,
      erros,
    };
  }

  async function finalizar(usuarioId, dados) {
    const calculo = await calcular(usuarioId, dados);
    if (!calculo.valido) {
      const [primeiro] = calculo.erros;
      throw new ErroDeRegra(primeiro.campo, primeiro.mensagem, 422, calculo.erros);
    }

    for (const item of calculo.itens) {
      await repo.atualizar('produtos', item.produtoId, { estoque: baixarEstoque(item.estoque, item.quantidade) });
    }
    if (calculo.graosUsados > 0) {
      await repo.atualizar('usuarios', usuarioId, { saldo_graos: calculo.graosDisponiveis - calculo.graosUsados });
    }

    const pedido = await repo.inserir('pedidos', {
      cliente_id: usuarioId,
      cafeteria_id: calculo.cafeteria.id,
      subtotal: calculo.subtotal,
      frete: calculo.frete,
      desconto: calculo.desconto,
      total: calculo.total,
      graos_usados: calculo.graosUsados,
      graos_ganhos: calculo.graosGanhos,
      distancia_km: calculo.distanciaKm,
      status: 'recebido',
      pagamento: 'na_entrega',
      criado_em: relogio.agora().toISOString(),
      entregue_em: null,
    });
    for (const item of calculo.itens) {
      await repo.inserir('itens_pedido', {
        pedido_id: pedido.id, produto_id: item.produtoId, quantidade: item.quantidade, preco_unitario: item.precoUnitario,
      });
    }
    return detalhar(pedido.id, usuarioId, 'cliente');
  }

  async function montar(pedido, usuarioId, perfil) {
    const [itens, loja, cliente, avaliacao] = await Promise.all([
      repo.listar('itens_pedido', { pedido_id: pedido.id }),
      repo.buscarUm('cafeterias', { id: pedido.cafeteria_id }),
      repo.buscarUm('usuarios', { id: pedido.cliente_id }),
      repo.buscarUm('avaliacoes', { pedido_id: pedido.id }),
    ]);
    const produtos = new Map((await repo.listar('produtos', { id: itens.map((i) => i.produto_id) })).map((p) => [p.id, p]));
    const podeAvaliar = perfil === 'cliente' && validarAvaliacao({
      pedido: { clienteId: pedido.cliente_id, status: pedido.status, entregueEm: pedido.entregue_em },
      clienteId: usuarioId,
      nota: 5,
      jaAvaliado: Boolean(avaliacao),
      agora: relogio.agora(),
    }).length === 0;

    return {
      id: pedido.id,
      status: pedido.status,
      statusRotulo: ROTULO_STATUS[pedido.status],
      proximoStatus: proximoStatus(pedido.status),
      podeCancelar: validarCancelamento(pedido.status) === null,
      cafeteria: { id: loja?.id, nome: loja?.nome },
      cliente: { id: cliente?.id, nome: cliente?.nome, bairro: cliente?.bairro },
      itens: itens.map((i) => ({
        produtoId: i.produto_id, nome: produtos.get(i.produto_id)?.nome ?? 'Produto removido',
        quantidade: i.quantidade, precoUnitario: Number(i.preco_unitario),
      })),
      subtotal: Number(pedido.subtotal),
      frete: Number(pedido.frete),
      desconto: Number(pedido.desconto),
      total: Number(pedido.total),
      graosUsados: pedido.graos_usados,
      graosGanhos: pedido.graos_ganhos,
      distanciaKm: Number(pedido.distancia_km),
      pagamento: pedido.pagamento,
      criadoEm: pedido.criado_em,
      entregueEm: pedido.entregue_em,
      avaliacao: avaliacao ? { nota: avaliacao.nota, comentario: avaliacao.comentario } : null,
      podeAvaliar,
    };
  }

  /** Busca o pedido e confere se pertence a quem pede (cliente dono ou cafeteria que recebeu). */
  async function obterDoUsuario(pedidoId, usuarioId, perfil) {
    const pedido = await repo.buscarUm('pedidos', { id: Number(pedidoId) });
    let dono = false;
    if (pedido && perfil === 'cliente') dono = pedido.cliente_id === usuarioId;
    if (pedido && perfil === 'cafeteria') {
      const loja = await repo.buscarUm('cafeterias', { usuario_id: usuarioId });
      dono = loja?.id === pedido.cafeteria_id;
    }
    if (!dono) throw new ErroDeRegra('pedido', 'Pedido não encontrado.', 404);
    return pedido;
  }

  async function detalhar(pedidoId, usuarioId, perfil) {
    return montar(await obterDoUsuario(pedidoId, usuarioId, perfil), usuarioId, perfil);
  }

  /** RF-012 (cliente) e lista de pedidos recebidos (cafeteria), do mais recente ao mais antigo. */
  async function listar(usuarioId, perfil) {
    let pedidos = [];
    if (perfil === 'cliente') pedidos = await repo.listar('pedidos', { cliente_id: usuarioId });
    else {
      const loja = await repo.buscarUm('cafeterias', { usuario_id: usuarioId });
      if (loja) pedidos = await repo.listar('pedidos', { cafeteria_id: loja.id });
    }
    pedidos.sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em));
    return Promise.all(pedidos.map((p) => montar(p, usuarioId, perfil)));
  }

  /** RF-010 + RN-007; ao chegar em "entregue", credita os grãos (RN-002). */
  async function avancarStatus(usuarioId, perfil, pedidoId, novoStatus) {
    if (perfil !== 'cafeteria') throw new ErroDeRegra('perfil', 'Só a cafeteria muda o status do pedido.', 403);
    const pedido = await obterDoUsuario(pedidoId, usuarioId, perfil);
    const erro = validarTransicao(pedido.status, novoStatus);
    if (erro) throw new ErroDeRegra('status', erro, 409);

    const campos = { status: novoStatus };
    if (novoStatus === 'entregue') campos.entregue_em = relogio.agora().toISOString();
    await repo.atualizar('pedidos', pedido.id, campos);

    if (deveCreditarGraos(pedido.status, novoStatus) && pedido.graos_ganhos > 0) {
      const cliente = await repo.buscarUm('usuarios', { id: pedido.cliente_id });
      await repo.atualizar('usuarios', cliente.id, { saldo_graos: cliente.saldo_graos + pedido.graos_ganhos });
    }
    return detalhar(pedido.id, usuarioId, perfil);
  }

  /** Cancela enquanto "recebido": devolve o estoque e os grãos usados. */
  async function cancelar(usuarioId, perfil, pedidoId) {
    const pedido = await obterDoUsuario(pedidoId, usuarioId, perfil);
    const erro = validarCancelamento(pedido.status);
    if (erro) throw new ErroDeRegra('status', erro, 409);

    await repo.atualizar('pedidos', pedido.id, { status: CANCELADO });
    for (const item of await repo.listar('itens_pedido', { pedido_id: pedido.id })) {
      const produto = await repo.buscarUm('produtos', { id: item.produto_id });
      if (produto) await repo.atualizar('produtos', produto.id, { estoque: produto.estoque + item.quantidade });
    }
    if (pedido.graos_usados > 0) {
      const cliente = await repo.buscarUm('usuarios', { id: pedido.cliente_id });
      await repo.atualizar('usuarios', cliente.id, { saldo_graos: cliente.saldo_graos + pedido.graos_usados });
    }
    return detalhar(pedido.id, usuarioId, perfil);
  }

  /** RF-011 + RN-004: a avaliação também vira um post no feed. */
  async function avaliar(usuarioId, pedidoId, { nota, comentario, fotoUrl }) {
    const pedido = await repo.buscarUm('pedidos', { id: Number(pedidoId) });
    if (!pedido) throw new ErroDeRegra('pedido', 'Pedido não encontrado.', 404);
    comentario = String(comentario ?? '').trim();
    if (comentario.length > COMENTARIO_MAXIMO) {
      throw new ErroDeRegra('comentario', `O comentário pode ter até ${COMENTARIO_MAXIMO} caracteres.`);
    }

    const erros = validarAvaliacao({
      pedido: { clienteId: pedido.cliente_id, status: pedido.status, entregueEm: pedido.entregue_em },
      clienteId: usuarioId,
      nota: Number(nota),
      jaAvaliado: Boolean(await repo.buscarUm('avaliacoes', { pedido_id: pedido.id })),
      agora: relogio.agora(),
    });
    if (erros.length) {
      const status = pedido.cliente_id !== usuarioId ? 403 : 422;
      throw new ErroDeRegra(erros[0].campo, erros[0].mensagem, status, erros);
    }

    const agora = relogio.agora().toISOString();
    const foto = String(fotoUrl ?? '').trim() || null;
    const avaliacao = await repo.inserir('avaliacoes', {
      pedido_id: pedido.id, nota: Number(nota), comentario: comentario || null, foto_url: foto, criado_em: agora,
    });
    const [primeiroItem] = await repo.listar('itens_pedido', { pedido_id: pedido.id });
    await repo.inserir('posts', {
      autor_id: usuarioId,
      cafeteria_id: pedido.cafeteria_id,
      produto_id: primeiroItem?.produto_id ?? null,
      avaliacao_id: avaliacao.id,
      tipo: 'avaliacao',
      texto: comentario || null,
      foto_url: foto,
      criado_em: agora,
    });
    return detalhar(pedido.id, usuarioId, 'cliente');
  }

  return { calcular, finalizar, listar, detalhar, avancarStatus, cancelar, avaliar };
}
