import { useState } from 'react';
import { Link } from 'react-router-dom';
import { adicionar } from './carrinho.js';
import { quando, reais } from './formato.js';
import { useSessao } from './sessao.jsx';

export function Foto({ url, rotulo }) {
  const [falhou, setFalhou] = useState(false);
  if (url && !falhou) return <img className="foto" src={url} alt={rotulo} loading="lazy" onError={() => setFalhou(true)} />;
  return <div className="foto foto-vazia" role="img" aria-label={rotulo}><span>☕</span><small>{rotulo}</small></div>;
}

export function Aviso({ tipo = 'erro', children }) {
  if (!children) return null;
  return <p className={`aviso aviso-${tipo}`} role={tipo === 'erro' ? 'alert' : 'status'}>{children}</p>;
}

export function Estrelas({ nota }) {
  return <span className="estrelas" aria-label={`Nota ${nota} de 5`}>{'★'.repeat(nota)}{'☆'.repeat(5 - nota)}</span>;
}

/** Botão "Pedir" (RF-007): adiciona ao carrinho direto do post. Esgotado → desabilitado (RN-006). */
export function BotaoPedir({ produto, cafeteria }) {
  const { carrinho, setCarrinho, esvaziarCarrinho } = useSessao();
  const [mensagem, setMensagem] = useState(null);
  const [conflito, setConflito] = useState(null);

  if (produto.esgotado) return <button type="button" className="botao" disabled>Esgotado</button>;

  function pedir() {
    const r = adicionar(carrinho, produto, cafeteria);
    setConflito(r.conflito ?? null);
    if (r.erro) return setMensagem({ tipo: 'erro', texto: r.erro });
    if (r.carrinho) {
      setCarrinho(r.carrinho);
      setMensagem({ tipo: 'ok', texto: `${produto.nome} no carrinho.` });
    }
  }

  function trocar() {
    esvaziarCarrinho();
    const r = adicionar({ cafeteriaId: null, cafeteriaNome: null, itens: [] }, produto, cafeteria);
    setCarrinho(r.carrinho);
    setConflito(null);
    setMensagem({ tipo: 'ok', texto: `Carrinho agora é da ${cafeteria.nome}.` });
  }

  return (
    <div className="pedir">
      <button type="button" className="botao botao-primario" onClick={pedir}>Pedir</button>
      {conflito && (
        <div className="aviso aviso-erro" role="alert">
          Seu carrinho tem itens da {conflito}. Cada pedido é de uma cafeteria só.{' '}
          <button type="button" className="link" onClick={trocar}>Esvaziar e pedir daqui</button>
        </div>
      )}
      {mensagem && !conflito && <Aviso tipo={mensagem.tipo}>{mensagem.texto}</Aviso>}
    </div>
  );
}

/** Post do feed: produto ou avaliação, com selo "Em alta", curtidas e comentários (RF-004, RF-005). */
export function CartaoPost({ post }) {
  const { api, usuario } = useSessao();
  const [curtidas, setCurtidas] = useState({ total: post.curtidas, minha: post.curtidoPorMim });
  const [comentarios, setComentarios] = useState(post.comentarios);
  const [texto, setTexto] = useState('');
  const [erro, setErro] = useState(null);
  const produto = post.produto;

  async function curtir() {
    const r = await api(`/posts/${post.id}/curtir`, { metodo: 'POST' });
    setCurtidas({ total: r.curtidas, minha: r.curtido });
  }

  async function comentar(e) {
    e.preventDefault();
    setErro(null);
    try {
      const novo = await api(`/posts/${post.id}/comentarios`, { metodo: 'POST', corpo: { texto } });
      setComentarios((lista) => [...lista, novo]);
      setTexto('');
    } catch (err) {
      setErro(err.message);
    }
  }

  return (
    <article className="cartao post" data-testid="post">
      <header className="post-topo">
        <div>
          <Link to={`/cafeterias/${post.cafeteria.id}`} className="post-loja">{post.cafeteria.nome}</Link>
          <small className="mudo">
            {post.tipo === 'avaliacao' ? `avaliação de ${post.autor?.nome}` : 'novo produto'} · {quando(post.criadoEm)}
          </small>
        </div>
        {post.emAlta && <span className="selo" title={`Score ${post.score} nas últimas 24 h`}>🔥 Em alta</span>}
      </header>

      <Foto url={post.fotoUrl ?? produto?.fotoUrl} rotulo={produto?.nome ?? 'Avaliação'} />

      <div className="post-corpo">
        {post.tipo === 'produto' && produto && (
          <div className="produto-linha">
            <div>
              <h3>{produto.nome}</h3>
              <p className="preco">{reais(produto.preco)}</p>
            </div>
            {usuario.perfil === 'cliente' && <BotaoPedir produto={produto} cafeteria={post.cafeteria} />}
          </div>
        )}
        {post.tipo === 'avaliacao' && (
          <p><Estrelas nota={post.avaliacao.nota} /> {produto && <span className="mudo">· {produto.nome}</span>}</p>
        )}
        {post.texto && <p>{post.texto}</p>}

        <div className="acoes">
          <button type="button" className={`link ${curtidas.minha ? 'curtido' : ''}`} onClick={curtir} aria-pressed={curtidas.minha}>
            {curtidas.minha ? '♥' : '♡'} {curtidas.total}
          </button>
          <span className="mudo">💬 {comentarios.length}</span>
        </div>

        {comentarios.length > 0 && (
          <ul className="comentarios">
            {comentarios.map((c) => (
              <li key={c.id}><strong>{c.autorNome}</strong> {c.texto}</li>
            ))}
          </ul>
        )}
        <form className="comentar" onSubmit={comentar}>
          <label className="oculto" htmlFor={`comentario-${post.id}`}>Comentário</label>
          <input id={`comentario-${post.id}`} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Comente…" maxLength={500} />
          <button type="submit" className="botao">Enviar</button>
        </form>
        <Aviso>{erro}</Aviso>
      </div>
    </article>
  );
}
