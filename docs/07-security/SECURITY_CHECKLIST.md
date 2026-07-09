# Checklist de Seguranca - MedSync

- [ ] Sessao em cookie HttpOnly, Secure e SameSite adequado ao ambiente.
- [ ] Nenhum token sensivel salvo em localStorage.
- [ ] JWT curto para perfis sensiveis.
- [ ] Refresh token rotativo planejado antes de producao.
- [ ] Revogacao de sessao e tela "Minhas sessoes" planejadas antes de producao.
- [ ] MFA obrigatorio para medico, admin, auditor e financeiro antes de producao.
- [ ] Login com rate limit e bloqueio progressivo.
- [ ] Falhas de login auditadas.
- [ ] CSP, Referrer-Policy, X-Content-Type-Options, Permissions-Policy e HSTS configurados.
- [ ] LiveKit token emitido somente pelo backend.
- [ ] TTL curto em token LiveKit.
- [ ] Sala LiveKit sem dados pessoais no nome.
- [ ] Gravacao, egress e transcricao desabilitados por padrao.
- [ ] Logs sem senha, token, CPF completo, prontuario ou URL sensivel.
- [ ] Webhook de pagamento validado por assinatura.
- [ ] Dependencias revisadas periodicamente.
