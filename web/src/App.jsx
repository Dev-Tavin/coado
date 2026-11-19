import { Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { quantidadeNoCarrinho, useSessao } from './sessao.jsx';
import { Entrar } from './paginas/Entrar.jsx';
import { Feed } from './paginas/Feed.jsx';
import { Explorar } from './paginas/Explorar.jsx';
import { PerfilCafeteria } from './paginas/PerfilCafeteria.jsx';
import { Carrinho } from './paginas/Carrinho.jsx';
import { Pedidos } from './paginas/Pedidos.jsx';
import { Painel } from './paginas/Painel.jsx';

function Protegida({ perfil, children }) {
  const { usuario, carregando } = useSessao();
  const local = useLocation();
  if (carregando) return <p className="carregando">Carregando…</p>;
  if (!usuario) return <Navigate to="/entrar" replace state={{ de: local.pathname }} />;
  if (perfil && usuario.perfil !== perfil) return <Navigate to="/" replace />;
  return children;
}

function Navegacao() {
  const { usuario, carrinho, sair } = useSessao();
  const qtd = quantidadeNoCarrinho(carrinho);
  const cliente = usuario.perfil === 'cliente';
  return (
    <>
      <header className="topo">
        <NavLink to="/" className="marca">☕ Coado</NavLink>
        <div className="topo-direita">
          {cliente && <span className="graos" title="Saldo de grãos de fidelidade">🫘 {usuario.saldoGraos} grãos</span>}
          <button type="button" className="link" onClick={sair}>Sair</button>
        </div>
      </header>
      <nav className="abas" aria-label="Navegação principal">
        <NavLink to="/" end>Feed</NavLink>
        {cliente && <NavLink to="/explorar">Explorar</NavLink>}
        {!cliente && <NavLink to="/painel">Painel</NavLink>}
        <NavLink to="/pedidos">Pedidos</NavLink>
        {cliente && (
          <NavLink to="/carrinho" aria-label={`Carrinho com ${qtd} item(ns)`}>
            Carrinho <span className="contador" data-testid="carrinho-qtd">{qtd}</span>
          </NavLink>
        )}
      </nav>
    </>
  );
}

export function App() {
  const { usuario } = useSessao();
  return (
    <div className="app">
      {usuario && <Navegacao />}
      <main className="conteudo">
        <Routes>
          <Route path="/entrar" element={usuario ? <Navigate to="/" replace /> : <Entrar />} />
          <Route path="/" element={<Protegida><Feed /></Protegida>} />
          <Route path="/explorar" element={<Protegida perfil="cliente"><Explorar /></Protegida>} />
          <Route path="/cafeterias/:id" element={<Protegida><PerfilCafeteria /></Protegida>} />
          <Route path="/carrinho" element={<Protegida perfil="cliente"><Carrinho /></Protegida>} />
          <Route path="/pedidos" element={<Protegida><Pedidos /></Protegida>} />
          <Route path="/painel" element={<Protegida perfil="cafeteria"><Painel /></Protegida>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
