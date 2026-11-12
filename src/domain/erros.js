/**
 * Erro de regra de negócio. Sempre informa o campo com problema e a ação
 * corretiva (RNF-003). A API converte em HTTP 422.
 */
export class ErroDeRegra extends Error {
  constructor(campo, mensagem, status = 422) {
    super(mensagem);
    this.name = 'ErroDeRegra';
    this.campo = campo;
    this.status = status;
  }
}
