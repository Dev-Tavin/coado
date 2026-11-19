import { useCallback, useEffect, useState } from 'react';
import { Aviso } from '../componentes.jsx';
import { reais } from '../formato.js';
import { useSessao } from '../sessao.jsx';
import { CartaoPedido } from './Pedidos.jsx';

const PRODUTO_VAZIO = { nome: '', descricao: '', preco: '', estoque: '', fotoUrl: '' };

/** Painel da cafeteria: novo post de produto (RF-003), estoque (RN-006), perfil (RF-002) e pedidos (RF-010). */
export function Painel() {
  const { api } = useSessao();
  const [painel, setPainel] = useState(null);
  const [pedidos, setPedidos] = useState([]);
  const [novo, setNovo] = useState(PRODUTO_VAZIO);
  const [perfil, setPerfil] = useState(null);
  const [mensagem, setMensagem] = useState({});

  const carregar = useCallback(async () => {
    const dados = await api('/painel');
    setPainel(dados);
    setPerfil((atual) => atual ?? {
      nome: dados.cafeteria.nome, endereco: dados.cafeteria.endereco, bairro: dados.cafeteria.bairro,
      abreAs: dados.cafeteria.abreAs, fechaAs: dados.cafeteria.fechaAs, fotoUrl: dados.cafeteria.fotoUrl ?? '',
    });
    setPedidos(await api('/pedidos'));
  }, [api]);

  useEffect(() => { carregar().catch((e) => setMensagem({ geral: e.message })); }, [carregar]);

  async function publicar(e) {
    e.preventDefault();
    try {
      await api('/produtos', { metodo: 'POST', corpo: { ...novo, preco: Number(String(novo.preco).replace(',', '.')), estoque: Number(novo.estoque) } });
      setNovo(PRODUTO_VAZIO);
      setMensagem({ produto: { tipo: 'ok', texto: 'Produto publicado no feed.' } });
      carregar();
    } catch (err) {
      setMensagem({ produto: { tipo: 'erro', texto: err.message } });
    }
  }

  async function salvarEstoque(produtoId, estoque) {
    try {
      await api(`/produtos/${produtoId}`, { metodo: 'PATCH', corpo: { estoque: Number(estoque) } });
      setMensagem({ estoque: { tipo: 'ok', texto: 'Estoque atualizado.' } });
      carregar();
    } catch (err) {
      setMensagem({ estoque: { tipo: 'erro', texto: err.message } });
    }
  }

  async function salvarPerfil(e) {
    e.preventDefault();
    try {
      await api('/painel/perfil', { metodo: 'PUT', corpo: perfil });
      setMensagem({ perfil: { tipo: 'ok', texto: 'Perfil salvo.' } });
      carregar();
    } catch (err) {
      setMensagem({ perfil: { tipo: 'erro', texto: err.message } });
    }
  }

  if (mensagem.geral) return <Aviso>{mensagem.geral}</Aviso>;
  if (!painel) return <p className="carregando">Carregando painel…</p>;
  const ativos = pedidos.filter((p) => !['entregue', 'cancelado'].includes(p.status));
  const campo = (obj, set, nome) => ({ value: obj[nome], onChange: (e) => set({ ...obj, [nome]: e.target.value }) });
  const msg = (chave) => mensagem[chave] && <Aviso tipo={mensagem[chave].tipo}>{mensagem[chave].texto}</Aviso>;

  return (
    <section className="painel">
      <h1>{painel.cafeteria.nome}</h1>
      <p className={painel.cafeteria.aberta ? 'aberta' : 'fechada'}>
        {painel.cafeteria.aberta ? 'Aberta agora' : 'Fechada agora'} · {painel.cafeteria.abreAs}–{painel.cafeteria.fechaAs}
      </p>

      <h2>Pedidos em andamento ({ativos.length})</h2>
      {ativos.length === 0 && <p className="mudo">Nenhum pedido em andamento.</p>}
      {ativos.map((p) => (
        <CartaoPedido key={p.id} pedido={p} perfil="cafeteria"
          aoMudar={(novoPedido) => setPedidos((l) => l.map((x) => (x.id === novoPedido.id ? novoPedido : x)))} />
      ))}

      <h2>Novo post de produto</h2>
      <form className="cartao formulario" onSubmit={publicar}>
        <label>Nome do produto<input {...campo(novo, setNovo, 'nome')} /></label>
        <label>Descrição<textarea rows={2} {...campo(novo, setNovo, 'descricao')} /></label>
        <div className="lado-a-lado">
          <label>Preço (R$)<input inputMode="decimal" {...campo(novo, setNovo, 'preco')} placeholder="12,90" /></label>
          <label>Estoque<input type="number" min="0" step="1" {...campo(novo, setNovo, 'estoque')} /></label>
        </div>
        <label>Foto (link, opcional)<input type="url" {...campo(novo, setNovo, 'fotoUrl')} placeholder="https://…" /></label>
        {msg('produto')}
        <button type="submit" className="botao botao-primario">Publicar</button>
      </form>

      <h2>Produtos e estoque</h2>
      {msg('estoque')}
      <ul className="cartao estoque">
        {painel.produtos.map((p) => (
          <li key={p.id} className="linha">
            <span>{p.nome} · {reais(p.preco)} {p.esgotado && <strong className="fechada">Esgotado</strong>}</span>
            <form className="estoque-form" onSubmit={(e) => { e.preventDefault(); salvarEstoque(p.id, e.target.estoque.value); }}>
              <label className="oculto" htmlFor={`estoque-${p.id}`}>Estoque de {p.nome}</label>
              <input id={`estoque-${p.id}`} name="estoque" type="number" min="0" step="1" defaultValue={p.estoque} key={p.estoque} />
              <button type="submit" className="botao">Salvar</button>
            </form>
          </li>
        ))}
      </ul>

      <h2>Perfil da cafeteria</h2>
      <form className="cartao formulario" onSubmit={salvarPerfil}>
        <label>Nome<input {...campo(perfil, setPerfil, 'nome')} /></label>
        <label>Endereço<input {...campo(perfil, setPerfil, 'endereco')} /></label>
        <div className="lado-a-lado">
          <label>Abre às<input inputMode="numeric" placeholder="HH:MM" pattern="\d{2}:\d{2}" maxLength={5} {...campo(perfil, setPerfil, 'abreAs')} /></label>
          <label>Fecha às<input inputMode="numeric" placeholder="HH:MM" pattern="\d{2}:\d{2}" maxLength={5} {...campo(perfil, setPerfil, 'fechaAs')} /></label>
        </div>
        <label>Foto (link, opcional)<input type="url" {...campo(perfil, setPerfil, 'fotoUrl')} /></label>
        {msg('perfil')}
        <button type="submit" className="botao botao-primario">Salvar perfil</button>
      </form>
    </section>
  );
}
