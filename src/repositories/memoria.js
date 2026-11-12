/**
 * Repositório em memória, com gravação opcional em arquivo JSON.
 * Mesma interface do repositório Supabase: inserir, listar, buscarUm, atualizar, remover.
 * Usado nos testes (banco isolado e limpo a cada teste) e no desenvolvimento local.
 */
import fs from 'node:fs';
import path from 'node:path';

export const TABELAS = [
  'usuarios', 'cafeterias', 'produtos', 'posts', 'curtidas', 'comentarios',
  'seguidores', 'pedidos', 'itens_pedido', 'avaliacoes',
];
// Tabelas de ligação usam chave composta, sem coluna id (igual ao schema.sql).
const SEM_ID = new Set(['curtidas', 'seguidores']);

const clonar = (v) => structuredClone(v);

function casa(linha, filtro) {
  return Object.entries(filtro).every(([campo, valor]) =>
    Array.isArray(valor) ? valor.includes(linha[campo]) : linha[campo] === valor,
  );
}

export function criarRepositorioMemoria({ arquivo } = {}) {
  let estado = { seq: 0, tabelas: Object.fromEntries(TABELAS.map((t) => [t, []])) };

  if (arquivo && fs.existsSync(arquivo)) {
    estado = JSON.parse(fs.readFileSync(arquivo, 'utf8'));
  }

  function salvar() {
    if (!arquivo) return;
    fs.mkdirSync(path.dirname(arquivo), { recursive: true });
    const temporario = `${arquivo}.tmp`;
    fs.writeFileSync(temporario, JSON.stringify(estado, null, 2));
    fs.renameSync(temporario, arquivo); // troca atômica: não corrompe se cair no meio
  }

  function tabela(nome) {
    const t = estado.tabelas[nome];
    if (!t) throw new Error(`Tabela desconhecida: ${nome}`);
    return t;
  }

  return {
    tipo: 'memoria',

    async inserir(nome, dados) {
      const linha = clonar(dados);
      if (!SEM_ID.has(nome)) linha.id = ++estado.seq;
      tabela(nome).push(linha);
      salvar();
      return clonar(linha);
    },

    async listar(nome, filtro = {}) {
      return tabela(nome).filter((l) => casa(l, filtro)).map(clonar);
    },

    async buscarUm(nome, filtro) {
      const linha = tabela(nome).find((l) => casa(l, filtro));
      return linha ? clonar(linha) : null;
    },

    async atualizar(nome, id, campos) {
      const linha = tabela(nome).find((l) => l.id === id);
      if (!linha) return null;
      Object.assign(linha, clonar(campos));
      salvar();
      return clonar(linha);
    },

    async remover(nome, filtro) {
      const t = tabela(nome);
      const antes = t.length;
      estado.tabelas[nome] = t.filter((l) => !casa(l, filtro));
      salvar();
      return antes - estado.tabelas[nome].length;
    },
  };
}
