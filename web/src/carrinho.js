// Regras do carrinho no navegador. Reaproveita a RN-006 do domínio para não duplicar a regra.
import { validarQuantidade } from '../../src/domain/estoque.js';

/**
 * Adiciona 1 unidade do produto. Devolve { carrinho } em caso de sucesso,
 * { erro } se passar do estoque, ou { conflito } se o carrinho for de outra cafeteria.
 */
export function adicionar(carrinho, produto, cafeteria) {
  if (carrinho.itens.length > 0 && carrinho.cafeteriaId !== cafeteria.id) {
    return { conflito: carrinho.cafeteriaNome };
  }
  const existente = carrinho.itens.find((i) => i.produtoId === produto.id);
  const quantidade = (existente?.quantidade ?? 0) + 1;
  const erro = validarQuantidade(quantidade, produto.estoque, produto.nome);
  if (erro) return { erro: erro.mensagem };

  const item = { produtoId: produto.id, nome: produto.nome, preco: produto.preco, estoque: produto.estoque, quantidade };
  return {
    carrinho: {
      cafeteriaId: cafeteria.id,
      cafeteriaNome: cafeteria.nome,
      itens: existente
        ? carrinho.itens.map((i) => (i.produtoId === produto.id ? item : i))
        : [...carrinho.itens, item],
    },
  };
}

/** Muda a quantidade de um item; 0 remove. Respeita o estoque conhecido. */
export function alterarQuantidade(carrinho, produtoId, quantidade) {
  const itens = carrinho.itens
    .map((i) => (i.produtoId === produtoId ? { ...i, quantidade: Math.min(quantidade, i.estoque) } : i))
    .filter((i) => i.quantidade > 0);
  return itens.length ? { ...carrinho, itens } : { cafeteriaId: null, cafeteriaNome: null, itens: [] };
}
