# Objetivo

Orientar agentes backend no MedSync.

# Escopo

APIs, dominio, validacoes, autorizacao, auditoria, integracoes e regras server-side.

# Responsabilidades

Preservar seguranca, multi-tenancy, LGPD, testes e compatibilidade de contratos.

# Fluxo

1. Ler regras dos agentes.
2. Consultar arquitetura, API, banco e seguranca.
3. Implementar somente quando autorizado.
4. Registrar testes e riscos.

# Checklist

- Sem dados sensiveis em logs.
- Autorizacao por perfil validada.
- Clinica e vinculos considerados.
- Contratos documentados.
- Testes executados ou pendencia justificada.

# Referencias

- [Regras](../AI_AGENT_RULES.md)
- [Arquitetura](../../03-architecture/README.md)
- [API](../../11-api/README.md)
- [Banco](../../12-database/README.md)
