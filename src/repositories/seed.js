/**
 * Dados de demonstração (rodam só quando o banco está vazio).
 * Senha de todas as contas: cafe123
 */
const HORA = 3_600_000;
export const SENHA_DEMO = 'cafe123';

const LOJAS = [
  {
    email: 'graodeouro@coado.app', nome: 'Ana Ribeiro',
    cafeteria: { nome: 'Grão de Ouro', endereco: 'Rua do Príncipe, 300', bairro: 'Centro', abreAs: '00:00', fechaAs: '24:00' },
    produtos: [
      { nome: 'Coado V60 Etiópia', descricao: 'Notas de jasmim e frutas vermelhas, passado na hora.', preco: 14, estoque: 20 },
      { nome: 'Cappuccino da casa', descricao: 'Espresso, leite vaporizado e canela.', preco: 12.5, estoque: 15 },
      { nome: 'Pão de queijo (6 un.)', descricao: 'Saído do forno, com queijo da canastra.', preco: 9.9, estoque: 30 },
      { nome: 'Bolo de cenoura', descricao: 'Com cobertura de chocolate meio amargo.', preco: 8.5, estoque: 0 },
    ],
  },
  {
    email: 'torrafina@coado.app', nome: 'Bruno Lima',
    cafeteria: { nome: 'Torra Fina', endereco: 'Rua Otto Boehm, 120', bairro: 'América', abreAs: '00:00', fechaAs: '24:00' },
    produtos: [
      { nome: 'Espresso tônica', descricao: 'Espresso sobre água tônica e laranja.', preco: 16, estoque: 10 },
      { nome: 'Cold brew 300 ml', descricao: 'Extração a frio por 18 horas.', preco: 15, estoque: 12 },
      { nome: 'Croissant de amêndoas', descricao: 'Folhado na manteiga, recheio de creme de amêndoas.', preco: 13, estoque: 8 },
    ],
  },
  {
    email: 'mokagloria@coado.app', nome: 'Carla Mendes',
    cafeteria: { nome: 'Moka Glória', endereco: 'Rua Marquês de Olinda, 45', bairro: 'Glória', abreAs: '07:00', fechaAs: '19:00' },
    produtos: [
      { nome: 'Mocha', descricao: 'Espresso, chocolate belga e leite.', preco: 14.5, estoque: 10 },
      { nome: 'Torta de limão', descricao: 'Massa amanteigada e merengue maçaricado.', preco: 11, estoque: 6 },
    ],
  },
  {
    email: 'cafepirabeiraba@coado.app', nome: 'Diego Kraus',
    cafeteria: { nome: 'Café Colonial Pirabeiraba', endereco: 'Estrada Dona Francisca, 8000', bairro: 'Pirabeiraba', abreAs: '07:00', fechaAs: '18:00' },
    produtos: [
      { nome: 'Café colonial (para 1)', descricao: 'Cuca, pão caseiro, geleias e café coado.', preco: 39.9, estoque: 5 },
    ],
  },
];

export async function bancoVazio(repo) {
  return !(await repo.buscarUm('usuarios', {}));
}

export async function semear(repo, servicos, relogio) {
  const agora = relogio.agora().getTime();
  const quando = (horasAtras) => new Date(agora - horasAtras * HORA).toISOString();

  const lojas = [];
  for (const [i, dados] of LOJAS.entries()) {
    const { usuario } = await servicos.auth.cadastrar({
      nome: dados.nome, email: dados.email, senha: SENHA_DEMO, perfil: 'cafeteria',
      bairro: dados.cafeteria.bairro, cafeteria: dados.cafeteria,
    });
    const produtos = [];
    for (const [j, p] of dados.produtos.entries()) {
      const { produto, postId } = await servicos.cafeterias.publicarProduto(usuario.id, p);
      await repo.atualizar('posts', postId, { criado_em: quando(2 + i * 5 + j * 7) });
      produtos.push(produto);
    }
    lojas.push({ usuario, cafeteriaId: usuario.cafeteriaId, produtos });
  }

  const { usuario: cliente } = await servicos.auth.cadastrar({
    nome: 'Cliente Demo', email: 'cliente@coado.app', senha: SENHA_DEMO, perfil: 'cliente', bairro: 'Centro',
  });
  const { usuario: marina } = await servicos.auth.cadastrar({
    nome: 'Marina Souza', email: 'marina@coado.app', senha: SENHA_DEMO, perfil: 'cliente', bairro: 'América',
  });
  await repo.atualizar('usuarios', cliente.id, { saldo_graos: 250 });

  for (const loja of lojas.slice(0, 2)) {
    await repo.inserir('seguidores', { cliente_id: cliente.id, cafeteria_id: loja.cafeteriaId });
    await repo.inserir('seguidores', { cliente_id: marina.id, cafeteria_id: loja.cafeteriaId });
  }

  // Histórico direto no banco (já entregue): 10 pedidos do V60 nas últimas 24 h → score 50 → "Em alta".
  const [graoDeOuro] = lojas;
  const v60 = graoDeOuro.produtos[0];
  async function pedidoEntregue(clienteId, horasAtras, quantidade = 2) {
    const subtotal = v60.preco * quantidade;
    const pedido = await repo.inserir('pedidos', {
      cliente_id: clienteId, cafeteria_id: graoDeOuro.cafeteriaId, subtotal, frete: 4, desconto: 0,
      total: subtotal + 4, graos_usados: 0, graos_ganhos: Math.floor(subtotal), distancia_km: 1.8,
      status: 'entregue', pagamento: 'na_entrega', criado_em: quando(horasAtras), entregue_em: quando(horasAtras - 1),
    });
    await repo.inserir('itens_pedido', { pedido_id: pedido.id, produto_id: v60.id, quantidade, preco_unitario: v60.preco });
    return pedido;
  }
  for (let h = 2; h <= 20; h += 2) await pedidoEntregue(marina.id, h);

  // Um pedido do Cliente Demo entregue há 2 dias, ainda sem avaliação (para demonstrar RF-011).
  await pedidoEntregue(cliente.id, 49, 1);

  // Uma avaliação antiga da Marina, que aparece no feed como post.
  const antigo = await pedidoEntregue(marina.id, 30, 1);
  const avaliacao = await repo.inserir('avaliacoes', {
    pedido_id: antigo.id, nota: 5, comentario: 'Melhor V60 de Joinville. Chegou quentinho!', foto_url: null, criado_em: quando(28),
  });
  await repo.inserir('posts', {
    autor_id: marina.id, cafeteria_id: graoDeOuro.cafeteriaId, produto_id: v60.id, avaliacao_id: avaliacao.id,
    tipo: 'avaliacao', texto: avaliacao.comentario, foto_url: null, criado_em: quando(28),
  });
  await servicos.feed.comentar(cliente.id, (await repo.buscarUm('posts', { produto_id: v60.id, tipo: 'produto' })).id,
    'Vou pedir hoje!');
}
