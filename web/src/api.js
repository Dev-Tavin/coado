export class ErroApi extends Error {
  constructor(status, corpo) {
    super(corpo?.erro ?? 'Não foi possível falar com o servidor. Confira sua conexão.');
    this.status = status;
    this.campo = corpo?.campo ?? null;
    this.erros = corpo?.erros ?? [];
  }
}

/** fetch para a API em /api, com JSON e token JWT. Lança ErroApi em respostas 4xx/5xx. */
export async function chamarApi(caminho, { metodo = 'GET', corpo, token } = {}) {
  let res;
  try {
    res = await fetch(`/api${caminho}`, {
      method: metodo,
      headers: {
        ...(corpo !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
    });
  } catch {
    throw new ErroApi(0, null);
  }
  const dados = await res.json().catch(() => null);
  if (!res.ok) throw new ErroApi(res.status, dados);
  return dados;
}
