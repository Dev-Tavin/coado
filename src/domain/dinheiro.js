/**
 * Valores em reais entram e saem como número (ex.: 11.5), mas toda conta é
 * feita em centavos inteiros para evitar erros de ponto flutuante
 * (0.1 + 0.2 !== 0.3).
 */
export const paraCentavos = (reais) => Math.round(Number(reais) * 100);
export const paraReais = (centavos) => centavos / 100;

/** "R$ 3,50": espaço comum (Intl usa espaço não separável, o que quebra comparações). */
export function formatarReais(reais) {
  const centavos = paraCentavos(reais);
  const sinal = centavos < 0 ? '-' : '';
  const abs = Math.abs(centavos);
  const inteiro = Math.floor(abs / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const resto = String(abs % 100).padStart(2, '0');
  return `${sinal}R$ ${inteiro},${resto}`;
}
