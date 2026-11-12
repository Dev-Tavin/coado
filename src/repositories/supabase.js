/**
 * Repositório Supabase (PostgreSQL). Mesma interface do repositório em memória.
 * Ativado quando SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY estão definidas.
 * Crie as tabelas antes com supabase/schema.sql.
 */
import { createClient } from '@supabase/supabase-js';

function verificar({ data, error }) {
  if (error) throw new Error(`Supabase: ${error.message}`);
  return data;
}

function aplicarFiltro(consulta, filtro) {
  let q = consulta;
  for (const [campo, valor] of Object.entries(filtro)) {
    q = Array.isArray(valor) ? q.in(campo, valor) : q.eq(campo, valor);
  }
  return q;
}

const temListaVazia = (filtro) => Object.values(filtro).some((v) => Array.isArray(v) && v.length === 0);

export function criarRepositorioSupabase({ url, chave }) {
  const db = createClient(url, chave, { auth: { persistSession: false } });

  return {
    tipo: 'supabase',

    async inserir(tabela, dados) {
      return verificar(await db.from(tabela).insert(dados).select().single());
    },

    async listar(tabela, filtro = {}) {
      if (temListaVazia(filtro)) return [];
      return verificar(await aplicarFiltro(db.from(tabela).select('*'), filtro));
    },

    async buscarUm(tabela, filtro) {
      if (temListaVazia(filtro)) return null;
      const linhas = verificar(await aplicarFiltro(db.from(tabela).select('*'), filtro).limit(1));
      return linhas[0] ?? null;
    },

    async atualizar(tabela, id, campos) {
      return verificar(await db.from(tabela).update(campos).eq('id', id).select().maybeSingle());
    },

    async remover(tabela, filtro) {
      if (temListaVazia(filtro)) return 0;
      const linhas = verificar(await aplicarFiltro(db.from(tabela).delete(), filtro).select());
      return linhas.length;
    },
  };
}
