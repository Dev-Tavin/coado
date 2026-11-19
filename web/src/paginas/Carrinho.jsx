import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { alterarQuantidade } from '../carrinho.js';
import { Aviso } from '../componentes.jsx';
import { km, reais } from '../formato.js';
import { useSessao } from '../sessao.jsx';

/** RF-008 / RF-009: itens, subtotal, frete, grãos, desconto, total e mensagens de validação. */
export function Carrinho() {
  const { api, carrinho, setCarrinho, esvaziarCarrinho, atualizarUsuario } = useSessao();
  const navegar = useNavigate();
  const [usarGraos, setUsarGraos] = useState(false);
  const [resumo, setResumo] = useState(null);
  const [erro, setErro] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const corpo = {
    cafeteriaId: carrinho.cafeteriaId,
    itens: carrinho.itens.map((i) => ({ produtoId: i.produtoId, quantidade: i.quantidade })),
    usarGraos,
  };
  const chave = JSON.stringify(corpo);

  // O cálculo é sempre da API (mesmas regras do pedido final); a tela só exibe.
  useEffect(() => {
    if (carrinho.itens.length === 0) return setResumo(null);
    let ativo = true;
    setErro(null);
    api('/pedidos/simular', { metodo: 'POST', corpo })
      .then((r) => ativo && setResumo(r))
      .catch((e) => ativo && (setResumo(null), setErro(e.message)));
    return () => { ativo = false; };
  }, [chave]); // eslint-disable-line react-hooks/exhaustive-deps

  async function finalizar() {
    setEnviando(true);
    setErro(null);
    try {
      const pedido = await api('/pedidos', { metodo: 'POST', corpo });
      esvaziarCarrinho();
      await atualizarUsuario();
      navegar('/pedidos', { state: { novo: pedido.id } });
    } catch (e) {
      setErro(e.message);
    } finally {
      setEnviando(false);
    }
  }

  if (carrinho.itens.length === 0) {
    return (
      <div className="vazio cartao">
        <p>Seu carrinho está vazio.</p>
        <Link className="botao botao-primario" to="/">Ver o feed</Link>
      </div>
    );
  }

  const errosDoItem = (produtoId) => resumo?.erros.filter((e) => e.produtoId === produtoId) ?? [];
  const errosGerais = resumo?.erros.filter((e) => !e.produtoId) ?? [];

  return (
    <section className="checkout">
      <h1>Carrinho</h1>
      <p className="mudo">Pedido da <strong>{carrinho.cafeteriaNome}</strong></p>

      <ul className="cartao itens">
        {carrinho.itens.map((i) => (
          <li key={i.produtoId}>
            <div className="item-linha">
              <span>{i.nome}</span>
              <div className="quantidade">
                <button type="button" className="botao" aria-label={`Diminuir ${i.nome}`}
                  onClick={() => setCarrinho(alterarQuantidade(carrinho, i.produtoId, i.quantidade - 1))}>−</button>
                <span aria-label="Quantidade">{i.quantidade}</span>
                <button type="button" className="botao" aria-label={`Aumentar ${i.nome}`} disabled={i.quantidade >= i.estoque}
                  onClick={() => setCarrinho(alterarQuantidade(carrinho, i.produtoId, i.quantidade + 1))}>+</button>
              </div>
              <span className="valor">{reais(i.preco * i.quantidade)}</span>
            </div>
            {errosDoItem(i.produtoId).map((e) => <Aviso key={e.mensagem}>{e.mensagem}</Aviso>)}
          </li>
        ))}
      </ul>

      {resumo && (
        <div className="cartao resumo">
          <div className="linha"><span>Subtotal</span><span data-testid="subtotal">{reais(resumo.subtotal)}</span></div>
          {errosGerais.map((e) => <Aviso key={e.campo}>{e.mensagem}</Aviso>)}
          <div className="linha">
            <span>Frete ({km(resumo.distanciaKm)})</span>
            <span data-testid="frete">{resumo.frete === 0 ? 'Grátis' : reais(resumo.frete)}</span>
          </div>
          <label className="linha graos-opcao">
            <span>
              <input type="checkbox" checked={usarGraos} onChange={(e) => setUsarGraos(e.target.checked)} disabled={resumo.graosDisponiveis < 100} />
              {' '}Usar grãos ({resumo.graosDisponiveis} disponíveis · 100 grãos = R$ 10,00)
            </span>
          </label>
          {resumo.desconto > 0 && (
            <div className="linha desconto"><span>Desconto ({resumo.graosUsados} grãos)</span><span>−{reais(resumo.desconto)}</span></div>
          )}
          <div className="linha total"><span>Total</span><span data-testid="total">{reais(resumo.total)}</span></div>
          <p className="mudo pequeno">Pagamento na entrega. Este pedido rende {resumo.graosGanhos} grãos quando for entregue.</p>
        </div>
      )}

      <Aviso>{erro}</Aviso>
      <div className="botoes">
        <button type="button" className="botao" onClick={esvaziarCarrinho}>Esvaziar</button>
        <button type="button" className="botao botao-primario" onClick={finalizar} disabled={!resumo?.valido || enviando}>
          Finalizar pedido
        </button>
      </div>
    </section>
  );
}
