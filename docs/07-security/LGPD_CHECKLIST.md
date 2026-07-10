# Checklist LGPD - MedSync

Este documento apoia homologacao tecnica. A avaliacao juridica e do encarregado de dados e obrigatoria antes de uso real.

- [ ] Inventario de dados pessoais por tela, endpoint e tabela.
- [ ] Classificacao de dados sensiveis e clinicos.
- [ ] Matriz de base legal por finalidade.
- [ ] Termo de telemedicina versionado e com hash.
- [ ] Consentimento auditavel por consulta.
- [ ] CPF mascarado em respostas padrao.
- [ ] Minimizacao de dados em telas administrativas.
- [ ] Prontuario bloqueado para empresa/parceiro admin, suporte MedSync, financeiro, auditor e admin administrativo.
- [ ] Perfil ADM Medico do Trabalho revisado com juridico, DPO e diretor tecnico antes de acessar diagnostico, prontuario, observacao clinica ou documentos ocupacionais.
- [ ] Acesso clinico associado a CNPJ separado de RH, financeiro e administracao empresarial.
- [ ] CNPJ tecnico/operacional para pessoa fisica direta validado juridicamente e com base legal/finalidade documentada.
- [ ] Atualizacoes de dados sensiveis com autoria, motivo, data/hora e trilha de auditoria.
- [ ] Exportacao de dados do titular implementada e revisada.
- [ ] Processo para acesso, correcao, exclusao aplicavel, portabilidade e revogacao.
- [ ] Retencao configuravel por categoria.
- [ ] Exclusao anonimizacao/pseudonimizacao definida para cada categoria.
- [ ] Subprocessadores mapeados: Vercel, Railway, LiveKit, Mercado Pago e outros.
- [ ] Registro de incidentes e comunicacao definidos.
