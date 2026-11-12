// RN-006: estoque.

export function estaEsgotado(estoque) {
  return estoque <= 0;
}

/** Erro ({ campo, mensagem }) se a quantidade for inválida ou passar do estoque; null se ok. */
export function validarQuantidade(quantidade, estoque, nomeProduto = 'o produto') {
  if (!Number.isInteger(quantidade) || quantidade < 1) {
    return { campo: 'quantidade', mensagem: 'A quantidade deve ser um número inteiro maior que zero.' };
  }
  if (estaEsgotado(estoque)) {
    return { campo: 'quantidade', mensagem: `${nomeProduto} está esgotado.` };
  }
  if (quantidade > estoque) {
    return {
      campo: 'quantidade',
      mensagem: `Só há ${estoque} unidade(s) de ${nomeProduto} em estoque. Diminua a quantidade.`,
    };
  }
  return null;
}

/** Estoque depois de confirmar o pedido. */
export function baixarEstoque(estoque, quantidade) {
  if (validarQuantidade(quantidade, estoque)) {
    throw new Error(`Estoque insuficiente: ${estoque} disponível, ${quantidade} pedido(s).`);
  }
  return estoque - quantidade;
}

/** Estoque informado pela cafeteria: inteiro ≥ 0. */
export function validarEstoque(estoque) {
  if (!Number.isInteger(estoque) || estoque < 0) {
    return { campo: 'estoque', mensagem: 'O estoque deve ser um número inteiro igual ou maior que zero.' };
  }
  return null;
}
