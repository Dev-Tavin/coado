import { describe, it, expect } from 'vitest';
import {
  calcularFrete,
  calcularSubtotal,
  calcularTotal,
  estaAberta,
  horaParaMinutos,
  validarPedido,
} from '../../src/domain/pedido.js';
import { formatarReais } from '../../src/domain/dinheiro.js';

describe('RN-001 - Frete', () => {
  it('CT-001: cobra R$ 4,00 até 2 km', () => {
    expect(calcularFrete(2, 30)).toBe(4);
    expect(calcularFrete(0.5, 30)).toBe(4);
  });

  it('CT-002: soma R$ 1,50 por km extra, arredondando para cima', () => {
    expect(calcularFrete(5.3, 30)).toBe(10); // 4 km extras
    expect(calcularFrete(2.1, 30)).toBe(5.5); // 0,1 km já conta 1 km extra
    expect(calcularFrete(3, 30)).toBe(5.5);
  });

  it('CT-003: isenta o frete a partir de R$ 60,00', () => {
    expect(calcularFrete(7, 59.99)).toBe(11.5);
    expect(calcularFrete(7, 60)).toBe(0);
  });

  it('não sofre com ponto flutuante (0,1 + 0,2)', () => {
    expect(calcularFrete(7, 0.1 + 0.2 + 59.7)).toBe(0);
  });
});

describe('RN-001 - Subtotal e total', () => {
  it('soma preço × quantidade em centavos', () => {
    expect(calcularSubtotal([{ precoUnitario: 0.1, quantidade: 3 }])).toBe(0.3);
    expect(calcularSubtotal([
      { precoUnitario: 12.9, quantidade: 2 },
      { precoUnitario: 8.5, quantidade: 1 },
    ])).toBe(34.3);
  });

  it('total = subtotal + frete − desconto', () => {
    expect(calcularTotal({ subtotal: 30, frete: 10, desconto: 10 })).toBe(30);
    expect(calcularTotal({ subtotal: 34.3, frete: 5.5 })).toBe(39.8);
  });
});

describe('RN-003 - Validação do pedido', () => {
  const base = { subtotal: 30, distanciaKm: 3, hora: '10:00', abreAs: '07:00', fechaAs: '18:00' };

  it('aceita quando as três condições valem', () => {
    expect(validarPedido(base)).toEqual({ valido: true, erros: [] });
  });

  it('CT-005: recusa subtotal abaixo de R$ 15,00 e diz quanto falta', () => {
    const r = validarPedido({ ...base, subtotal: 11.5 });
    expect(r.valido).toBe(false);
    expect(r.erros).toEqual([
      { campo: 'subtotal', mensagem: 'Pedido mínimo é R$ 15,00, adicione mais R$ 3,50' },
    ]);
  });

  it('aceita exatamente R$ 15,00', () => {
    expect(validarPedido({ ...base, subtotal: 15 }).valido).toBe(true);
  });

  it('CT-006: aceita 8,0 km e recusa 8,1 km', () => {
    expect(validarPedido({ ...base, distanciaKm: 8.0 }).valido).toBe(true);
    const r = validarPedido({ ...base, distanciaKm: 8.1 });
    expect(r.erros[0].campo).toBe('distancia');
    expect(r.erros[0].mensagem).toContain('8,1 km');
  });

  it('horário: abertura ≤ hora < fechamento', () => {
    expect(estaAberta('07:00', '07:00', '18:00')).toBe(true);
    expect(estaAberta('17:59', '07:00', '18:00')).toBe(true);
    expect(estaAberta('18:00', '07:00', '18:00')).toBe(false);
    expect(estaAberta('06:59', '07:00', '18:00')).toBe(false);
    expect(estaAberta('23:59', '00:00', '24:00')).toBe(true);
  });

  it('devolve todos os erros de uma vez', () => {
    const r = validarPedido({ subtotal: 5, distanciaKm: 12, hora: '20:00', abreAs: '07:00', fechaAs: '18:00' });
    expect(r.erros.map((e) => e.campo)).toEqual(['subtotal', 'distancia', 'horario']);
    expect(r.erros[2].mensagem).toBe('A cafeteria está fechada agora. Ela funciona das 07:00 às 18:00.');
  });

  it('rejeita horário mal formatado', () => {
    expect(() => horaParaMinutos('7h')).toThrow(/Horário inválido/);
    expect(() => horaParaMinutos('10:75')).toThrow(/Horário inválido/);
    expect(() => horaParaMinutos('25:00')).toThrow(/Horário inválido/);
  });
});

describe('Formatação de dinheiro', () => {
  it('usa vírgula, milhar com ponto e espaço comum', () => {
    expect(formatarReais(3.5)).toBe('R$ 3,50');
    expect(formatarReais(1500)).toBe('R$ 1.500,00');
    expect(formatarReais(-2)).toBe('-R$ 2,00');
  });
});

describe('RNF-001 - Performance', () => {
  it('calcula frete, desconto e total em menos de 200 ms', () => {
    const inicio = performance.now();
    const itens = Array.from({ length: 50 }, (_, i) => ({ precoUnitario: 9.9 + i, quantidade: 2 }));
    const subtotal = calcularSubtotal(itens);
    const frete = calcularFrete(7.4, subtotal);
    validarPedido({ subtotal, distanciaKm: 7.4, hora: '10:00', abreAs: '07:00', fechaAs: '18:00' });
    calcularTotal({ subtotal, frete, desconto: 10 });
    expect(performance.now() - inicio).toBeLessThan(200);
  });
});
