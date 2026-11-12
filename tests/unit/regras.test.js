import { describe, it, expect } from 'vitest';
import { calcularGraosGanhos, calcularResgate, deveCreditarGraos } from '../../src/domain/fidelidade.js';
import { validarAvaliacao } from '../../src/domain/avaliacao.js';
import { calcularScore, contarUltimas24h, ordenarFeed, temSeloEmAlta } from '../../src/domain/feed.js';
import { baixarEstoque, estaEsgotado, validarEstoque, validarQuantidade } from '../../src/domain/estoque.js';
import { proximoStatus, validarCancelamento, validarTransicao } from '../../src/domain/status.js';
import { distanciaKm } from '../../src/domain/geo.js';

describe('RN-002 - Fidelidade em grãos', () => {
  it('CT-004: limita o desconto a 50% do subtotal', () => {
    expect(calcularResgate(250, 30)).toEqual({ graosUsados: 100, desconto: 10 });
  });

  it('usa quantos blocos o saldo e o limite permitirem', () => {
    expect(calcularResgate(250, 100)).toEqual({ graosUsados: 200, desconto: 20 });
    expect(calcularResgate(99, 100)).toEqual({ graosUsados: 0, desconto: 0 });
    expect(calcularResgate(500, 19.99)).toEqual({ graosUsados: 0, desconto: 0 }); // limite R$ 9,99
    expect(calcularResgate(500, 20)).toEqual({ graosUsados: 100, desconto: 10 });
  });

  it('ganha 1 grão por real inteiro pago em produtos', () => {
    expect(calcularGraosGanhos(30, 10)).toBe(20); // exemplo da RN-002
    expect(calcularGraosGanhos(34.99)).toBe(34);
    expect(calcularGraosGanhos(10, 10)).toBe(0);
  });

  it('credita só na passagem para "entregue"', () => {
    expect(deveCreditarGraos('saiu_para_entrega', 'entregue')).toBe(true);
    expect(deveCreditarGraos('recebido', 'em_preparo')).toBe(false);
    expect(deveCreditarGraos('entregue', 'entregue')).toBe(false);
  });
});

describe('RN-004 - Avaliação', () => {
  const entregueEm = new Date('2026-11-01T12:00:00Z');
  const pedido = { clienteId: 1, status: 'entregue', entregueEm };
  const em = (dias) => new Date(entregueEm.getTime() + dias * 86_400_000);

  it('aceita até 7 dias após a entrega', () => {
    expect(validarAvaliacao({ pedido, clienteId: 1, nota: 5, agora: em(7) })).toEqual([]);
  });

  it('CT-007: recusa com 8 dias e com nota 6', () => {
    expect(validarAvaliacao({ pedido, clienteId: 1, nota: 4, agora: em(8) })[0].mensagem).toMatch(/prazo/);
    expect(validarAvaliacao({ pedido, clienteId: 1, nota: 6, agora: em(1) })).toEqual([
      { campo: 'nota', mensagem: 'Escolha uma nota inteira de 1 a 5.' },
    ]);
  });

  it.each([0, 6, 3.5, null])('recusa nota %s', (nota) => {
    expect(validarAvaliacao({ pedido, clienteId: 1, nota, agora: em(1) })).toHaveLength(1);
  });

  it('recusa outro cliente, pedido não entregue e segunda avaliação', () => {
    expect(validarAvaliacao({ pedido, clienteId: 2, nota: 5, agora: em(1) })[0].mensagem).toMatch(/Só quem fez/);
    expect(validarAvaliacao({ pedido: { ...pedido, status: 'em_preparo' }, clienteId: 1, nota: 5 })[0].mensagem)
      .toMatch(/depois de entregue/);
    expect(validarAvaliacao({ pedido, clienteId: 1, nota: 5, jaAvaliado: true, agora: em(1) })[0].mensagem)
      .toMatch(/já foi avaliado/);
  });
});

describe('RN-005 - Selo "Em alta"', () => {
  it('CT-008: score 50 recebe o selo, 49 não', () => {
    expect(calcularScore({ curtidas: 20, comentarios: 5, pedidos: 4 })).toBe(50);
    expect(temSeloEmAlta({ curtidas: 20, comentarios: 5, pedidos: 4 })).toBe(true);
    expect(calcularScore({ curtidas: 19, comentarios: 5, pedidos: 4 })).toBe(49);
    expect(temSeloEmAlta({ curtidas: 19, comentarios: 5, pedidos: 4 })).toBe(false);
  });

  it('considera só as últimas 24 h', () => {
    const agora = new Date('2026-11-10T12:00:00Z');
    const horasAtras = (h) => ({ criadoEm: new Date(agora.getTime() - h * 3_600_000) });
    expect(contarUltimas24h([horasAtras(1), horasAtras(23.9), horasAtras(24), horasAtras(30)], agora)).toBe(2);
  });

  it('ordena do mais recente ao mais antigo sem alterar o original', () => {
    const posts = [
      { id: 1, criadoEm: '2026-11-01T10:00:00Z' },
      { id: 2, criadoEm: '2026-11-03T10:00:00Z' },
      { id: 3, criadoEm: '2026-11-02T10:00:00Z' },
    ];
    expect(ordenarFeed(posts).map((p) => p.id)).toEqual([2, 3, 1]);
    expect(posts[0].id).toBe(1);
  });
});

describe('RN-006 - Estoque', () => {
  it('quantidade no carrinho não passa do estoque', () => {
    expect(validarQuantidade(5, 5)).toBeNull();
    expect(validarQuantidade(6, 5, 'Coado V60').mensagem).toBe(
      'Só há 5 unidade(s) de Coado V60 em estoque. Diminua a quantidade.',
    );
    expect(validarQuantidade(0, 5).campo).toBe('quantidade');
    expect(validarQuantidade(1.5, 5).campo).toBe('quantidade');
  });

  it('estoque 0 = esgotado', () => {
    expect(estaEsgotado(0)).toBe(true);
    expect(estaEsgotado(1)).toBe(false);
    expect(validarQuantidade(1, 0, 'Bolo').mensagem).toBe('Bolo está esgotado.');
  });

  it('baixa o estoque ao confirmar e recusa se faltar', () => {
    expect(baixarEstoque(5, 2)).toBe(3);
    expect(() => baixarEstoque(1, 2)).toThrow(/Estoque insuficiente/);
  });

  it('valida o estoque informado pela cafeteria', () => {
    expect(validarEstoque(0)).toBeNull();
    expect(validarEstoque(-1).campo).toBe('estoque');
    expect(validarEstoque(2.5).campo).toBe('estoque');
  });
});

describe('RN-007 - Status do pedido', () => {
  it('avança um passo por vez na ordem', () => {
    expect(validarTransicao('recebido', 'em_preparo')).toBeNull();
    expect(validarTransicao('em_preparo', 'saiu_para_entrega')).toBeNull();
    expect(validarTransicao('saiu_para_entrega', 'entregue')).toBeNull();
    expect(proximoStatus('entregue')).toBeNull();
  });

  it('CT-009: "entregue" → "em preparo" é recusado; cancelar "em preparo" é recusado', () => {
    expect(validarTransicao('entregue', 'em_preparo')).toMatch(/não pode mudar/);
    expect(validarCancelamento('em_preparo')).toMatch(/só pode ser cancelado/);
  });

  it('não pula etapas, não aceita status inexistente nem muda cancelado', () => {
    expect(validarTransicao('recebido', 'entregue')).toMatch(/o próximo é "Em preparo"/);
    expect(validarTransicao('recebido', 'voando')).toMatch(/não existe/);
    expect(validarTransicao('cancelado', 'em_preparo')).toMatch(/cancelado/);
  });

  it('cancela enquanto "recebido"', () => {
    expect(validarCancelamento('recebido')).toBeNull();
  });
});

describe('Distância (Haversine)', () => {
  it('calcula km com 1 casa', () => {
    const centro = { latitude: -26.3044, longitude: -48.8487 };
    expect(distanciaKm(centro, centro)).toBe(0);
    // 0,1 grau de latitude ≈ 11,1 km
    expect(distanciaKm(centro, { latitude: -26.2044, longitude: -48.8487 })).toBe(11.1);
  });
});
