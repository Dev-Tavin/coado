// Mesma formatação do domínio (src/domain/dinheiro.js), para as telas baterem com as mensagens da API.
export { formatarReais as reais } from '../../src/domain/dinheiro.js';

export const km = (valor) => `${Number(valor).toFixed(1).replace('.', ',')} km`;

export function quando(iso) {
  const data = new Date(iso);
  const minutos = Math.round((Date.now() - data.getTime()) / 60000);
  if (minutos < 1) return 'agora';
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.round(minutos / 60);
  if (horas < 24) return `há ${horas} h`;
  const dias = Math.round(horas / 24);
  if (dias < 7) return `há ${dias} ${dias === 1 ? 'dia' : 'dias'}`;
  return data.toLocaleDateString('pt-BR');
}
