# Checklist de Producao - MedSync

O MedSync permanece em homologacao controlada ate concluir todos os itens criticos abaixo.

- [ ] Backups criptografados do PostgreSQL configurados.
- [ ] Teste de restauracao executado e evidenciado.
- [ ] Redis sem dados sensiveis persistentes.
- [ ] Variaveis reais somente em Railway/Vercel, nunca versionadas.
- [ ] Swagger desabilitado ou protegido em producao.
- [ ] Seed demo desabilitado em producao.
- [ ] Credenciais demo bloqueadas em producao.
- [ ] SAST no CI.
- [ ] Dependency scan no CI.
- [ ] Secret scan no CI.
- [ ] DAST em ambiente de homologacao.
- [ ] Pentest contratado/concluido.
- [ ] Plano de resposta a incidentes aprovado.
- [ ] Processo de comunicacao de incidente aprovado.
- [ ] Aprovacao juridica registrada.
- [ ] Aprovacao do diretor tecnico registrada.
- [ ] Aprovacao do encarregado de dados registrada.
- [ ] Contratos com subprocessadores revisados.
- [ ] Inventario de dados e matriz de base legal publicados internamente.
- [ ] Politica de retencao configurada por categoria.
- [ ] Monitoramento de disponibilidade, erros e auditoria configurado.
