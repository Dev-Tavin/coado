import { criarRepositorioMemoria } from './memoria.js';
import { criarRepositorioSupabase } from './supabase.js';

/**
 * Escolhe o repositório pelas variáveis de ambiente:
 *  - SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY → Supabase
 *  - COADO_DADOS=":memoria:"                   → só memória (some ao reiniciar)
 *  - padrão                                     → memória gravada em data/coado.json
 */
export function criarRepositorio(env = process.env) {
  if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
    return criarRepositorioSupabase({ url: env.SUPABASE_URL, chave: env.SUPABASE_SERVICE_ROLE_KEY });
  }
  const arquivo = env.COADO_DADOS ?? 'data/coado.json';
  return criarRepositorioMemoria({ arquivo: arquivo === ':memoria:' ? undefined : arquivo });
}
