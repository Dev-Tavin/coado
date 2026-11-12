// RF-001 (cadastro e login com dois perfis) e RNF-004 (bcrypt + JWT).
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { BAIRROS } from '../config/bairros.js';
import { ErroDeRegra } from '../domain/erros.js';
import { validarDadosCafeteria } from './cafeterias.js';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const SENHA_MINIMA = 6;

export function usuarioPublico(u, cafeteria = null) {
  return {
    id: u.id,
    nome: u.nome,
    email: u.email,
    perfil: u.perfil,
    saldoGraos: u.saldo_graos,
    bairro: u.bairro,
    cafeteriaId: cafeteria?.id ?? null,
  };
}

export function criarServicoAuth(repo, { segredo, rodadasBcrypt = 10, relogio }) {
  const gerarToken = (u) => jwt.sign({ sub: u.id, perfil: u.perfil }, segredo, { expiresIn: '7d' });

  async function cadastrar({ nome, email, senha, perfil, bairro, cafeteria }) {
    nome = String(nome ?? '').trim();
    email = String(email ?? '').trim().toLowerCase();
    senha = String(senha ?? '');

    if (!nome) throw new ErroDeRegra('nome', 'Informe seu nome.');
    if (!EMAIL.test(email)) throw new ErroDeRegra('email', 'Informe um e-mail válido, como nome@exemplo.com.');
    if (senha.length < SENHA_MINIMA) {
      throw new ErroDeRegra('senha', `A senha deve ter pelo menos ${SENHA_MINIMA} caracteres.`);
    }
    if (!['cliente', 'cafeteria'].includes(perfil)) {
      throw new ErroDeRegra('perfil', 'Escolha o perfil: Cliente ou Cafeteria.');
    }
    if (!BAIRROS[bairro]) throw new ErroDeRegra('bairro', 'Escolha um bairro da lista.');
    const dadosCafeteria = perfil === 'cafeteria' ? validarDadosCafeteria(cafeteria ?? {}) : null;
    if (await repo.buscarUm('usuarios', { email })) {
      throw new ErroDeRegra('email', 'Este e-mail já tem conta. Entre com ele ou use outro.', 409);
    }

    const usuario = await repo.inserir('usuarios', {
      nome,
      email,
      senha_hash: await bcrypt.hash(senha, rodadasBcrypt),
      perfil,
      saldo_graos: 0,
      bairro,
      ...BAIRROS[bairro],
      criado_em: relogio.agora().toISOString(),
    });

    let loja = null;
    if (dadosCafeteria) {
      loja = await repo.inserir('cafeterias', { usuario_id: usuario.id, ...dadosCafeteria });
    }
    return { token: gerarToken(usuario), usuario: usuarioPublico(usuario, loja) };
  }

  async function entrar({ email, senha }) {
    email = String(email ?? '').trim().toLowerCase();
    const usuario = email ? await repo.buscarUm('usuarios', { email }) : null;
    // Mesma mensagem para e-mail inexistente e senha errada: não revela quais e-mails têm conta.
    if (!usuario || !(await bcrypt.compare(String(senha ?? ''), usuario.senha_hash))) {
      throw new ErroDeRegra('senha', 'E-mail ou senha incorretos. Confira e tente de novo.', 401);
    }
    const loja = await repo.buscarUm('cafeterias', { usuario_id: usuario.id });
    return { token: gerarToken(usuario), usuario: usuarioPublico(usuario, loja) };
  }

  function verificarToken(token) {
    try {
      const dados = jwt.verify(token, segredo);
      return { id: dados.sub, perfil: dados.perfil };
    } catch {
      return null;
    }
  }

  async function perfil(usuarioId) {
    const usuario = await repo.buscarUm('usuarios', { id: usuarioId });
    if (!usuario) throw new ErroDeRegra('usuario', 'Conta não encontrada. Entre de novo.', 401);
    const loja = await repo.buscarUm('cafeterias', { usuario_id: usuario.id });
    return usuarioPublico(usuario, loja);
  }

  return { cadastrar, entrar, verificarToken, perfil };
}
