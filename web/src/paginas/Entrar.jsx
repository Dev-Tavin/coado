import { useEffect, useState } from 'react';
import { chamarApi } from '../api.js';
import { Aviso } from '../componentes.jsx';
import { useSessao } from '../sessao.jsx';

const VAZIO = {
  nome: '', email: '', senha: '', perfil: 'cliente', bairro: 'Centro',
  loja: { nome: '', endereco: '', abreAs: '07:00', fechaAs: '19:00' },
};

/** RF-001: login e cadastro com dois perfis. */
export function Entrar() {
  const { entrar } = useSessao();
  const [modo, setModo] = useState('entrar');
  const [dados, setDados] = useState(VAZIO);
  const [bairros, setBairros] = useState([]);
  const [erro, setErro] = useState(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => { chamarApi('/bairros').then(setBairros).catch(() => setBairros(['Centro'])); }, []);

  const campo = (nome) => ({ value: dados[nome], onChange: (e) => setDados({ ...dados, [nome]: e.target.value }) });
  const campoLoja = (nome) => ({
    value: dados.loja[nome], onChange: (e) => setDados({ ...dados, loja: { ...dados.loja, [nome]: e.target.value } }),
  });

  async function enviar(e) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const resposta = modo === 'entrar'
        ? await chamarApi('/auth/login', { metodo: 'POST', corpo: { email: dados.email, senha: dados.senha } })
        : await chamarApi('/auth/cadastro', {
          metodo: 'POST',
          corpo: {
            nome: dados.nome, email: dados.email, senha: dados.senha, perfil: dados.perfil, bairro: dados.bairro,
            cafeteria: dados.perfil === 'cafeteria' ? { ...dados.loja, bairro: dados.bairro } : undefined,
          },
        });
      entrar(resposta);
    } catch (err) {
      setErro(err.message);
    } finally {
      setEnviando(false);
    }
  }

  const cadastro = modo === 'cadastrar';
  return (
    <section className="entrar">
      <h1 className="marca-grande">☕ Coado</h1>
      <p className="mudo">O feed das cafeterias: viu, gostou, pediu.</p>

      <div className="alternar" role="tablist">
        <button type="button" role="tab" aria-selected={!cadastro} onClick={() => setModo('entrar')}>Entrar</button>
        <button type="button" role="tab" aria-selected={cadastro} onClick={() => setModo('cadastrar')}>Criar conta</button>
      </div>

      <form className="cartao formulario" onSubmit={enviar}>
        {cadastro && (
          <>
            <fieldset className="perfis">
              <legend>Você é</legend>
              <label><input type="radio" name="perfil" value="cliente" checked={dados.perfil === 'cliente'} onChange={campo('perfil').onChange} /> Cliente</label>
              <label><input type="radio" name="perfil" value="cafeteria" checked={dados.perfil === 'cafeteria'} onChange={campo('perfil').onChange} /> Cafeteria</label>
            </fieldset>
            <label>Seu nome<input {...campo('nome')} autoComplete="name" /></label>
          </>
        )}
        <label>E-mail<input type="email" {...campo('email')} autoComplete="email" /></label>
        <label>Senha<input type="password" {...campo('senha')} autoComplete={cadastro ? 'new-password' : 'current-password'} /></label>
        {cadastro && (
          <>
            <label>Bairro
              <select {...campo('bairro')}>{bairros.map((b) => <option key={b}>{b}</option>)}</select>
            </label>
            {dados.perfil === 'cafeteria' && (
              <>
                <label>Nome da cafeteria<input {...campoLoja('nome')} /></label>
                <label>Endereço<input {...campoLoja('endereco')} placeholder="Rua e número" /></label>
                <div className="lado-a-lado">
                  <label>Abre às<input inputMode="numeric" placeholder="HH:MM" pattern="\d{2}:\d{2}" maxLength={5} {...campoLoja('abreAs')} /></label>
                  <label>Fecha às<input inputMode="numeric" placeholder="HH:MM" pattern="\d{2}:\d{2}" maxLength={5} {...campoLoja('fechaAs')} /></label>
                </div>
              </>
            )}
          </>
        )}
        <Aviso>{erro}</Aviso>
        <button type="submit" className="botao botao-primario" disabled={enviando}>
          {cadastro ? 'Criar conta' : 'Entrar'}
        </button>
      </form>
      <p className="mudo pequeno">Contas de demonstração: cliente@coado.app ou graodeouro@coado.app, senha cafe123.</p>
    </section>
  );
}
