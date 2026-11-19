import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Aviso, CartaoPost } from '../componentes.jsx';
import { useSessao } from '../sessao.jsx';

/** RF-004: posts das cafeterias seguidas, do mais recente ao mais antigo. */
export function Feed() {
  const { api, usuario } = useSessao();
  const [posts, setPosts] = useState(null);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    api('/feed').then(setPosts).catch((e) => setErro(e.message));
  }, [api]);

  if (erro) return <Aviso>{erro}</Aviso>;
  if (!posts) return <p className="carregando">Carregando o feed…</p>;
  if (posts.length === 0) {
    return (
      <div className="vazio cartao">
        <p>Seu feed está vazio.</p>
        {usuario.perfil === 'cliente'
          ? <Link className="botao botao-primario" to="/explorar">Descobrir cafeterias</Link>
          : <Link className="botao botao-primario" to="/painel">Publicar o primeiro produto</Link>}
      </div>
    );
  }
  return (
    <div className="feed">
      {posts.map((p) => <CartaoPost key={p.id} post={p} />)}
    </div>
  );
}
