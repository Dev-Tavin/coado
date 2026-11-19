import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Aviso, Foto } from '../componentes.jsx';
import { km } from '../formato.js';
import { useSessao } from '../sessao.jsx';

export function BotaoSeguir({ cafeteria, aoMudar }) {
  const { api } = useSessao();
  const [seguindo, setSeguindo] = useState(cafeteria.seguindo);
  async function alternar() {
    const r = await api(`/cafeterias/${cafeteria.id}/seguir`, { metodo: seguindo ? 'DELETE' : 'POST' });
    setSeguindo(r.seguindo);
    aoMudar?.(r.seguindo);
  }
  return (
    <button type="button" className={`botao ${seguindo ? '' : 'botao-primario'}`} onClick={alternar} aria-pressed={seguindo}>
      {seguindo ? 'Seguindo' : 'Seguir'}
    </button>
  );
}

/** RF-006: cafeterias dentro do raio de 8 km. */
export function Explorar() {
  const { api, usuario } = useSessao();
  const [lojas, setLojas] = useState(null);
  const [erro, setErro] = useState(null);

  useEffect(() => { api('/cafeterias').then(setLojas).catch((e) => setErro(e.message)); }, [api]);

  if (erro) return <Aviso>{erro}</Aviso>;
  if (!lojas) return <p className="carregando">Procurando cafeterias…</p>;
  return (
    <section>
      <h1>Explorar</h1>
      <p className="mudo">Cafeterias que entregam no {usuario.bairro} (até 8 km).</p>
      {lojas.length === 0 && <p className="vazio cartao">Nenhuma cafeteria entrega no seu bairro ainda.</p>}
      <ul className="lista-lojas">
        {lojas.map((l) => (
          <li key={l.id} className="cartao loja">
            <Foto url={l.fotoUrl} rotulo={l.nome} />
            <div className="loja-info">
              <Link to={`/cafeterias/${l.id}`}><strong>{l.nome}</strong></Link>
              <small className="mudo">{l.bairro} · {km(l.distanciaKm)}</small>
              <small className={l.aberta ? 'aberta' : 'fechada'}>
                {l.aberta ? 'Aberta' : 'Fechada'} · {l.abreAs}–{l.fechaAs}
              </small>
            </div>
            <BotaoSeguir cafeteria={l} />
          </li>
        ))}
      </ul>
    </section>
  );
}
