# Objetivo

Orientar agentes de banco de dados no MedSync.

# Escopo

Modelo de dados, migrations, retencao, segregacao, indices e governanca.

# Responsabilidades

Proteger dados pessoais e sensiveis, preservar integridade e documentar impactos de mudancas.

# Fluxo

1. Ler regras dos agentes.
2. Consultar modelo de dados e LGPD.
3. Avaliar impacto antes de migrations.
4. Registrar plano de rollback.

# Checklist

- Dados pessoais classificados.
- Multi-tenancy preservado.
- Retencao considerada.
- Migration documentada quando existir.
- Backup/rollback avaliado.

# Referencias

- [Regras](../AI_AGENT_RULES.md)
- [Banco](../../12-database/README.md)
- [LGPD](../../07-security/LGPD_CHECKLIST.md)
