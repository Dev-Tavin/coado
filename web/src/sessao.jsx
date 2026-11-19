import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { chamarApi, ErroApi } from './api.js';

const Contexto = createContext(null);
const CHAVE_TOKEN = 'coado:token';
const chaveCarrinho = (usuarioId) => `coado:carrinho:${usuarioId}`;
const CARRINHO_VAZIO = { cafeteriaId: null, cafeteriaNome: null, itens: [] };

function ler(chave, padrao) {
  try {
    const valor = localStorage.getItem(chave);
    return valor ? JSON.parse(valor) : padrao;
  } catch {
    return padrao;
  }
}
function gravar(chave, valor) {
  try {
    if (valor === null) localStorage.removeItem(chave);
    else localStorage.setItem(chave, JSON.stringify(valor));
  } catch {
    /* navegação privada sem storage: o carrinho só vive na memória */
  }
}

export function ProvedorSessao({ children }) {
  const [token, setToken] = useState(() => ler(CHAVE_TOKEN, null));
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(Boolean(token));
  const [carrinho, setCarrinhoEstado] = useState(CARRINHO_VAZIO);

  const sair = useCallback(() => {
    gravar(CHAVE_TOKEN, null);
    setToken(null);
    setUsuario(null);
    setCarrinhoEstado(CARRINHO_VAZIO);
  }, []);

  const api = useCallback(async (caminho, opcoes = {}) => {
    try {
      return await chamarApi(caminho, { ...opcoes, token });
    } catch (erro) {
      if (erro instanceof ErroApi && erro.status === 401 && token) sair();
      throw erro;
    }
  }, [token, sair]);

  const atualizarUsuario = useCallback(async () => {
    if (!token) return;
    try {
      setUsuario(await chamarApi('/auth/me', { token }));
    } catch {
      sair();
    } finally {
      setCarregando(false);
    }
  }, [token, sair]);

  useEffect(() => { atualizarUsuario(); }, [atualizarUsuario]);

  // RNF-002: carrinho no LocalStorage, separado por usuário; sobrevive ao recarregar a página.
  useEffect(() => {
    if (usuario) setCarrinhoEstado(ler(chaveCarrinho(usuario.id), CARRINHO_VAZIO));
  }, [usuario?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const setCarrinho = useCallback((novo) => {
    setCarrinhoEstado((atual) => {
      const valor = typeof novo === 'function' ? novo(atual) : novo;
      if (usuario) gravar(chaveCarrinho(usuario.id), valor);
      return valor;
    });
  }, [usuario]);

  const entrar = useCallback(({ token: novoToken, usuario: novoUsuario }) => {
    gravar(CHAVE_TOKEN, novoToken);
    setToken(novoToken);
    setUsuario(novoUsuario);
    setCarregando(false);
  }, []);

  const valor = useMemo(() => ({
    token, usuario, carregando, entrar, sair, api, atualizarUsuario,
    carrinho, setCarrinho, esvaziarCarrinho: () => setCarrinho(CARRINHO_VAZIO),
  }), [token, usuario, carregando, entrar, sair, api, atualizarUsuario, carrinho, setCarrinho]);

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export const useSessao = () => useContext(Contexto);

export const quantidadeNoCarrinho = (carrinho) => carrinho.itens.reduce((soma, i) => soma + i.quantidade, 0);
