// RN-005: selo "Em alta" e ordenação do feed.
export const PESO_CURTIDA = 1;
export const PESO_COMENTARIO = 2;
export const PESO_PEDIDO = 5;
export const SCORE_EM_ALTA = 50;
export const JANELA_MS = 24 * 60 * 60 * 1000;

export function calcularScore({ curtidas = 0, comentarios = 0, pedidos = 0 }) {
  return curtidas * PESO_CURTIDA + comentarios * PESO_COMENTARIO + pedidos * PESO_PEDIDO;
}

export function temSeloEmAlta(interacoes) {
  return calcularScore(interacoes) >= SCORE_EM_ALTA;
}

/** Conta só os eventos das últimas 24 h (cada evento tem `criadoEm`). */
export function contarUltimas24h(eventos, agora = new Date()) {
  const limite = new Date(agora).getTime() - JANELA_MS;
  return eventos.filter((e) => new Date(e.criadoEm).getTime() > limite).length;
}

/** Do mais recente ao mais antigo, sem alterar o array original. */
export function ordenarFeed(posts) {
  return [...posts].sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));
}
