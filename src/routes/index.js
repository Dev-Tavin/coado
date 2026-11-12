import { Router } from 'express';
import { BAIRROS } from '../config/bairros.js';
import { ErroDeRegra } from '../domain/erros.js';

/** Rotas finas: leem a requisição, chamam o serviço e devolvem JSON. Nenhuma regra aqui. */
export function criarRotas(s) {
  const r = Router();
  const id = (req) => Number(req.params.id);

  // RNF-004: rotas protegidas exigem token JWT válido → senão 401.
  function exigirLogin(req, _res, next) {
    const [tipo, token] = (req.headers.authorization ?? '').split(' ');
    const usuario = tipo === 'Bearer' && token ? s.auth.verificarToken(token) : null;
    if (!usuario) return next(new ErroDeRegra('token', 'Faça login para continuar.', 401));
    req.usuario = usuario;
    next();
  }
  const eu = (req) => req.usuario.id;
  const perfil = (req) => req.usuario.perfil;

  r.get('/saude', (_req, res) => res.json({ ok: true }));
  r.get('/bairros', (_req, res) => res.json(Object.keys(BAIRROS)));

  // RF-001
  r.post('/auth/cadastro', async (req, res) => res.status(201).json(await s.auth.cadastrar(req.body ?? {})));
  r.post('/auth/login', async (req, res) => res.json(await s.auth.entrar(req.body ?? {})));
  r.get('/auth/me', exigirLogin, async (req, res) => res.json(await s.auth.perfil(eu(req))));

  // RF-004 / RF-005
  r.get('/feed', exigirLogin, async (req, res) => res.json(await s.feed.feed(eu(req), perfil(req))));
  r.post('/posts/:id/curtir', exigirLogin, async (req, res) => res.json(await s.feed.alternarCurtida(eu(req), id(req))));
  r.post('/posts/:id/comentarios', exigirLogin, async (req, res) =>
    res.status(201).json(await s.feed.comentar(eu(req), id(req), req.body?.texto)));

  // RF-006 / RF-002
  r.get('/cafeterias', exigirLogin, async (req, res) => res.json(await s.cafeterias.explorar(eu(req))));
  r.get('/cafeterias/:id', exigirLogin, async (req, res) => {
    const cafeteria = await s.cafeterias.detalhar(id(req), eu(req));
    res.json({ ...cafeteria, posts: await s.feed.postsDaCafeteria(cafeteria.id, eu(req)) });
  });
  r.post('/cafeterias/:id/seguir', exigirLogin, async (req, res) =>
    res.json(await s.cafeterias.seguir(eu(req), perfil(req), id(req))));
  r.delete('/cafeterias/:id/seguir', exigirLogin, async (req, res) =>
    res.json(await s.cafeterias.deixarDeSeguir(eu(req), id(req))));

  // Painel da cafeteria: RF-002 / RF-003 / RN-006
  r.get('/painel', exigirLogin, async (req, res) => res.json(await s.cafeterias.painel(eu(req))));
  r.put('/painel/perfil', exigirLogin, async (req, res) =>
    res.json(await s.cafeterias.atualizarPerfil(eu(req), req.body ?? {})));
  r.post('/produtos', exigirLogin, async (req, res) =>
    res.status(201).json(await s.cafeterias.publicarProduto(eu(req), req.body ?? {})));
  r.patch('/produtos/:id', exigirLogin, async (req, res) =>
    res.json(await s.cafeterias.atualizarEstoque(eu(req), id(req), req.body?.estoque)));

  // RF-008 a RF-012
  r.post('/pedidos/simular', exigirLogin, async (req, res) => res.json(await s.pedidos.calcular(eu(req), req.body ?? {})));
  r.post('/pedidos', exigirLogin, async (req, res) => res.status(201).json(await s.pedidos.finalizar(eu(req), req.body ?? {})));
  r.get('/pedidos', exigirLogin, async (req, res) => res.json(await s.pedidos.listar(eu(req), perfil(req))));
  r.get('/pedidos/:id', exigirLogin, async (req, res) => res.json(await s.pedidos.detalhar(id(req), eu(req), perfil(req))));
  r.patch('/pedidos/:id/status', exigirLogin, async (req, res) =>
    res.json(await s.pedidos.avancarStatus(eu(req), perfil(req), id(req), req.body?.status)));
  r.post('/pedidos/:id/cancelar', exigirLogin, async (req, res) =>
    res.json(await s.pedidos.cancelar(eu(req), perfil(req), id(req))));
  r.post('/pedidos/:id/avaliacao', exigirLogin, async (req, res) =>
    res.status(201).json(await s.pedidos.avaliar(eu(req), id(req), req.body ?? {})));

  return r;
}
