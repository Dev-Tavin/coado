// RN-002: fidelidade em grãos.
import { paraCentavos, paraReais } from './dinheiro.js';

export const GRAOS_POR_BLOCO = 100;
export const DESCONTO_POR_BLOCO = 10;
export const LIMITE_DESCONTO = 0.5;

/** 1 grão por R$ 1,00 inteiro pago em produtos (subtotal − desconto, sem frete). */
export function calcularGraosGanhos(subtotal, desconto = 0) {
  const pagoEmProdutos = paraCentavos(subtotal) - paraCentavos(desconto);
  return Math.max(0, Math.floor(pagoEmProdutos / 100));
}

/**
 * Resgate em blocos de 100 grãos = R$ 10,00, limitado a 50% do subtotal.
 * Ex.: 250 grãos e R$ 30,00 → limite R$ 15,00 → 1 bloco → { graosUsados: 100, desconto: 10 }.
 */
export function calcularResgate(saldoGraos, subtotal) {
  const blocosPorSaldo = Math.floor(Math.max(0, saldoGraos) / GRAOS_POR_BLOCO);
  const limiteCentavos = Math.floor(paraCentavos(subtotal) * LIMITE_DESCONTO);
  const blocosPorLimite = Math.floor(limiteCentavos / paraCentavos(DESCONTO_POR_BLOCO));
  const blocos = Math.min(blocosPorSaldo, blocosPorLimite);
  return {
    graosUsados: blocos * GRAOS_POR_BLOCO,
    desconto: paraReais(blocos * paraCentavos(DESCONTO_POR_BLOCO)),
  };
}

/** Os grãos só são creditados quando o pedido chega a "entregue". */
export function deveCreditarGraos(statusAnterior, statusNovo) {
  return statusNovo === 'entregue' && statusAnterior !== 'entregue';
}
