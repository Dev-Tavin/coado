// RN-004: avaliação de pedido.
export const PRAZO_AVALIACAO_DIAS = 7;
const DIA_MS = 24 * 60 * 60 * 1000;

/**
 * Só avalia quem fez o pedido, com status "entregue", em até 7 dias após a
 * entrega; nota inteira de 1 a 5; uma avaliação por pedido.
 * Devolve a lista de erros ({ campo, mensagem }); vazia = pode avaliar.
 */
export function validarAvaliacao({ pedido, clienteId, nota, jaAvaliado = false, agora = new Date() }) {
  const erros = [];

  if (pedido.clienteId !== clienteId) {
    erros.push({ campo: 'pedido', mensagem: 'Só quem fez o pedido pode avaliá-lo.' });
  }
  if (pedido.status !== 'entregue') {
    erros.push({ campo: 'pedido', mensagem: 'O pedido só pode ser avaliado depois de entregue.' });
  } else {
    const decorrido = new Date(agora).getTime() - new Date(pedido.entregueEm).getTime();
    if (decorrido > PRAZO_AVALIACAO_DIAS * DIA_MS) {
      erros.push({
        campo: 'pedido',
        mensagem: `O prazo para avaliar é de ${PRAZO_AVALIACAO_DIAS} dias após a entrega e já terminou.`,
      });
    }
  }
  if (jaAvaliado) {
    erros.push({ campo: 'pedido', mensagem: 'Este pedido já foi avaliado.' });
  }
  if (!Number.isInteger(nota) || nota < 1 || nota > 5) {
    erros.push({ campo: 'nota', mensagem: 'Escolha uma nota inteira de 1 a 5.' });
  }
  return erros;
}
