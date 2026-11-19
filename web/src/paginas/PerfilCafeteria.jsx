import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Aviso, BotaoPedir, CartaoPost, Foto } from '../componentes.jsx';
import { km, reais } from '../formato.js';
import { useSessao } from '../sessao.jsx';
import { BotaoSeguir } from './Explorar.jsx';

/** Perfil da cafeteria: foto, endereço, horário, aberto/fechado e grade de produtos (RF-002, RF-006). */
export function PerfilCafeteria() {
  const { id } = useParams();
  const { api, usuario } = useSessao();
  const [loja, setLoja] = useState(null);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    setLoja(null);
    api(`/cafeterias/${id}`).then(setLoja).catch((e) => setErro(e.message));
  }, [api, id]);

  if (erro) return <Aviso>{erro}</Aviso>;
  if (!loja) return <p className="carregando">Carregando…</p>;
  const cliente = usuario.perfil === 'cliente';
  return (
    <section>
      <div className="cartao perfil-loja">
        <Foto url={loja.fotoUrl} rotulo={loja.nome} />
        <div>
          <h1>{loja.nome}</h1>
          <p className="mudo">{loja.endereco} · {loja.bairro}{loja.distanciaKm !== null && ` · ${km(loja.distanciaKm)}`}</p>
          <p className={loja.aberta ? 'aberta' : 'fechada'}>
            {loja.aberta ? 'Aberta agora' : 'Fechada agora'} · {loja.abreAs}–{loja.fechaAs}
          </p>
          {cliente && !loja.entrega && <Aviso>Esta cafeteria fica a mais de 8 km e não entrega no seu bairro.</Aviso>}
          {cliente && <BotaoSeguir cafeteria={loja} />}
        </div>
      </div>

      <h2>Produtos</h2>
      <ul className="grade-produtos">
        {loja.produtos.map((p) => (
          <li key={p.id} className="cartao produto">
            <Foto url={p.fotoUrl} rotulo={p.nome} />
            <div className="produto-info">
              <strong>{p.nome}</strong>
              <span className="preco">{reais(p.preco)}</span>
              {cliente && <BotaoPedir produto={p} cafeteria={loja} />}
            </div>
          </li>
        ))}
      </ul>

      {loja.posts.length > 0 && (
        <>
          <h2>Posts</h2>
          <div className="feed">{loja.posts.map((p) => <CartaoPost key={p.id} post={p} />)}</div>
        </>
      )}
    </section>
  );
}
