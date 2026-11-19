import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Aviso, Estrelas } from '../componentes.jsx';
import { quando, reais } from '../formato.js';
import { useSessao } from '../sessao.jsx';

const ETAPAS = [
  ['recebido', 'Recebido'],
  ['em_preparo', 'Em preparo'],
  ['saiu_para_entrega', 'Saiu para entrega'],
  ['entregue', 'Entregue'],
];
const ROTULO = Object.fromEntries(ETAPAS);

/** RF-010: linha do tempo recebido → em preparo → saiu para entrega → entregue. */
export function LinhaDoTempo({ status }) {
  if (status === 'cancelado') return <p className="fechada">Pedido cancelado</p>;
  const atual = ETAPAS.findIndex(([s]) => s === status);
  return (
    <ol className="linha-tempo" aria-label="Andamento do pedido">
      {ETAPAS.map(([s, rotulo], i) => (
        <li key={s} className={i <= atual ? 'feito' : ''} aria-current={i === atual ? 'step' : undefined}>{rotulo}</li>
      ))}
    </ol>
  );
}

/** RF-011: nota de 1 a 5, comentário e foto opcional. */
function FormularioAvaliacao({ pedido, aoAvaliar }) {
  const { api } = useSessao();
  const [nota, setNota] = useState(0);
  const [comentario, setComentario] = useState('');
  const [fotoUrl, setFotoUrl] = useState('');
  const [erro, setErro] = useState(null);

  async function enviar(e) {
    e.preventDefault();
    try {
      aoAvaliar(await api(`/pedidos/${pedido.id}/avaliacao`, { metodo: 'POST', corpo: { nota, comentario, fotoUrl } }));
    } catch (err) {
      setErro(err.message);
    }
  }

  return (
    <form className="avaliar" onSubmit={enviar}>
      <fieldset>
        <legend>Avalie este pedido</legend>
        <div className="estrelas-escolha">
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} title={`${n} de 5`}>
              <input type="radio" name={`nota-${pedido.id}`} value={n} checked={nota === n} onChange={() => setNota(n)} />
              <span aria-hidden="true">{n <= nota ? '★' : '☆'}</span>
              <span className="oculto">{n} estrela(s)</span>
            </label>
          ))}
        </div>
      </fieldset>
      <label>Comentário<textarea value={comentario} onChange={(e) => setComentario(e.target.value)} maxLength={500} rows={2} /></label>
      <label>Foto (link, opcional)<input type="url" value={fotoUrl} onChange={(e) => setFotoUrl(e.target.value)} placeholder="https://…" /></label>
      <Aviso>{erro}</Aviso>
      <button type="submit" className="botao botao-primario">Publicar avaliação</button>
    </form>
  );
}

export function CartaoPedido({ pedido, perfil, aoMudar }) {
  const { api, atualizarUsuario } = useSessao();
  const [erro, setErro] = useState(null);

  async function executar(caminho, corpo, metodo = 'POST') {
    setErro(null);
    try {
      aoMudar(await api(caminho, { metodo, corpo }));
      if (perfil === 'cliente') atualizarUsuario();
    } catch (e) {
      setErro(e.message);
    }
  }

  return (
    <article className="cartao pedido" data-testid="pedido">
      <header className="linha">
        <strong>Pedido #{pedido.id} · {perfil === 'cliente' ? pedido.cafeteria.nome : `${pedido.cliente.nome} (${pedido.cliente.bairro})`}</strong>
        <small className="mudo">{quando(pedido.criadoEm)}</small>
      </header>
      <LinhaDoTempo status={pedido.status} />
      <ul className="itens-pedido">
        {pedido.itens.map((i) => <li key={i.produtoId}>{i.quantidade}× {i.nome}</li>)}
      </ul>
      <p className="pequeno">
        Subtotal {reais(pedido.subtotal)} · Frete {reais(pedido.frete)}
        {pedido.desconto > 0 && ` · Desconto ${reais(pedido.desconto)}`} · <strong>Total {reais(pedido.total)}</strong> · na entrega
      </p>

      {pedido.avaliacao && <p>Sua avaliação: <Estrelas nota={pedido.avaliacao.nota} /> {pedido.avaliacao.comentario}</p>}
      <Aviso>{erro}</Aviso>

      <div className="botoes">
        {perfil === 'cafeteria' && pedido.proximoStatus && pedido.status !== 'cancelado' && (
          <button type="button" className="botao botao-primario"
            onClick={() => executar(`/pedidos/${pedido.id}/status`, { status: pedido.proximoStatus }, 'PATCH')}>
            Avançar para “{ROTULO[pedido.proximoStatus]}”
          </button>
        )}
        {pedido.podeCancelar && (
          <button type="button" className="botao" onClick={() => executar(`/pedidos/${pedido.id}/cancelar`)}>Cancelar pedido</button>
        )}
      </div>
      {perfil === 'cliente' && pedido.podeAvaliar && <FormularioAvaliacao pedido={pedido} aoAvaliar={aoMudar} />}
    </article>
  );
}

/** RF-010 (acompanhar) e RF-012 (histórico). Atualiza sozinho a cada 10 s. */
export function Pedidos() {
  const { api, usuario } = useSessao();
  const local = useLocation();
  const [pedidos, setPedidos] = useState(null);
  const [erro, setErro] = useState(null);

  const carregar = useCallback(() => api('/pedidos').then(setPedidos).catch((e) => setErro(e.message)), [api]);
  useEffect(() => {
    carregar();
    const intervalo = setInterval(carregar, 10_000);
    return () => clearInterval(intervalo);
  }, [carregar]);

  const substituir = (novo) => setPedidos((lista) => lista.map((p) => (p.id === novo.id ? novo : p)));

  if (erro) return <Aviso>{erro}</Aviso>;
  if (!pedidos) return <p className="carregando">Carregando pedidos…</p>;
  return (
    <section>
      <h1>{usuario.perfil === 'cliente' ? 'Meus pedidos' : 'Pedidos recebidos'}</h1>
      {local.state?.novo && <Aviso tipo="ok">Pedido #{local.state.novo} enviado! Acompanhe o status aqui.</Aviso>}
      {pedidos.length === 0 && <p className="vazio cartao">Nenhum pedido ainda.</p>}
      {pedidos.map((p) => <CartaoPedido key={p.id} pedido={p} perfil={usuario.perfil} aoMudar={substituir} />)}
    </section>
  );
}
