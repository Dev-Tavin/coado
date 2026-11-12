// RN-001 (valor do pedido e frete) e RN-003 (validação do pedido).
import { formatarReais, paraCentavos, paraReais } from './dinheiro.js';

export const FRETE_BASE = 4;
export const KM_INCLUSOS = 2;
export const FRETE_POR_KM_EXTRA = 1.5;
export const SUBTOTAL_FRETE_GRATIS = 60;
export const PEDIDO_MINIMO = 15;
export const RAIO_MAXIMO_KM = 8;

/** RN-001: R$ 4,00 até 2 km; + R$ 1,50 por km adicional (arredondado para cima); grátis a partir de R$ 60,00. */
export function calcularFrete(distanciaKm, subtotal) {
  if (paraCentavos(subtotal) >= paraCentavos(SUBTOTAL_FRETE_GRATIS)) return 0;
  // Compara em centésimos de km: 5.3 - 2 = 3.3000000000000003 em ponto flutuante.
  const centesimosExtras = Math.round(distanciaKm * 100) - KM_INCLUSOS * 100;
  if (centesimosExtras <= 0) return FRETE_BASE;
  const kmExtras = Math.ceil(centesimosExtras / 100);
  return paraReais(paraCentavos(FRETE_BASE) + kmExtras * paraCentavos(FRETE_POR_KM_EXTRA));
}

/** Soma de preço × quantidade dos itens. */
export function calcularSubtotal(itens) {
  const centavos = itens.reduce(
    (soma, item) => soma + paraCentavos(item.precoUnitario) * item.quantidade,
    0,
  );
  return paraReais(centavos);
}

/** RN-001: total = subtotal + frete − desconto. */
export function calcularTotal({ subtotal, frete, desconto = 0 }) {
  return paraReais(paraCentavos(subtotal) + paraCentavos(frete) - paraCentavos(desconto));
}

/** "07:30" → 450 minutos. "24:00" é aceito como fim do dia. */
export function horaParaMinutos(hhmm) {
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm ?? '');
  if (!m) throw new Error(`Horário inválido: "${hhmm}". Use HH:MM.`);
  const minutos = Number(m[1]) * 60 + Number(m[2]);
  if (Number(m[2]) > 59 || minutos > 24 * 60) throw new Error(`Horário inválido: "${hhmm}".`);
  return minutos;
}

/** RN-003: abertura ≤ hora < fechamento. */
export function estaAberta(hora, abreAs, fechaAs) {
  const agora = horaParaMinutos(hora);
  return horaParaMinutos(abreAs) <= agora && agora < horaParaMinutos(fechaAs);
}

const formatarKm = (km) => `${Number(km).toFixed(1).replace('.', ',')} km`;

/**
 * RN-003: o pedido só é aceito com subtotal ≥ R$ 15,00, distância ≤ 8 km e
 * cafeteria aberta. Devolve todos os erros de uma vez, cada um com o campo.
 */
export function validarPedido({ subtotal, distanciaKm, hora, abreAs, fechaAs }) {
  const erros = [];

  const falta = paraCentavos(PEDIDO_MINIMO) - paraCentavos(subtotal);
  if (falta > 0) {
    erros.push({
      campo: 'subtotal',
      mensagem: `Pedido mínimo é ${formatarReais(PEDIDO_MINIMO)}, adicione mais ${formatarReais(paraReais(falta))}`,
    });
  }

  if (Math.round(distanciaKm * 100) > RAIO_MAXIMO_KM * 100) {
    erros.push({
      campo: 'distancia',
      mensagem: `A cafeteria está a ${formatarKm(distanciaKm)} e entrega até ${RAIO_MAXIMO_KM} km. Escolha uma cafeteria mais próxima.`,
    });
  }

  if (!estaAberta(hora, abreAs, fechaAs)) {
    erros.push({
      campo: 'horario',
      mensagem: `A cafeteria está fechada agora. Ela funciona das ${abreAs} às ${fechaAs}.`,
    });
  }

  return { valido: erros.length === 0, erros };
}
