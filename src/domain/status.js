// RN-007: status do pedido.
export const FLUXO_STATUS = ['recebido', 'em_preparo', 'saiu_para_entrega', 'entregue'];
export const CANCELADO = 'cancelado';

export const ROTULO_STATUS = {
  recebido: 'Recebido',
  em_preparo: 'Em preparo',
  saiu_para_entrega: 'Saiu para entrega',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
};

const rotulo = (s) => ROTULO_STATUS[s] ?? s;

/** Próximo status do fluxo, ou null se já terminou (entregue/cancelado). */
export function proximoStatus(atual) {
  const i = FLUXO_STATUS.indexOf(atual);
  return i >= 0 && i < FLUXO_STATUS.length - 1 ? FLUXO_STATUS[i + 1] : null;
}

/** O status só avança, um passo por vez, na ordem do fluxo. Devolve mensagem de erro ou null. */
export function validarTransicao(atual, novo) {
  if (!FLUXO_STATUS.includes(novo)) {
    return `Status "${novo}" não existe. Use: ${FLUXO_STATUS.map(rotulo).join(' → ')}.`;
  }
  if (atual === CANCELADO) return 'O pedido foi cancelado e não pode mudar de status.';
  const esperado = proximoStatus(atual);
  if (esperado === null) return `O pedido já está "${rotulo(atual)}" e não pode mudar de status.`;
  if (novo !== esperado) {
    return `O status só avança na ordem: de "${rotulo(atual)}" o próximo é "${rotulo(esperado)}".`;
  }
  return null;
}

/** Só pode cancelar enquanto está "recebido". Devolve mensagem de erro ou null. */
export function validarCancelamento(atual) {
  if (atual === 'recebido') return null;
  return `O pedido só pode ser cancelado enquanto está "Recebido" (status atual: "${rotulo(atual)}").`;
}
