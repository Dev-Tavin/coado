export const FUSO = 'America/Sao_Paulo';

export const relogioDoSistema = { agora: () => new Date() };

/** Relógio fixo, para testes. */
export const relogioFixo = (data) => ({ agora: () => new Date(data) });

/** "HH:MM" no fuso de Joinville, independente do fuso do servidor. */
export function horaLocal(data) {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: FUSO,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(data);
}
