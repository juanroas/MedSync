# Objetivo

Centralizar documentacao de DevOps, operacao, observabilidade e runbooks do MedSync.

# Escopo

Inclui templates para Docker, CI/CD, infraestrutura, logging, monitoring, observability e runbooks.

# Estrutura

- [RUNBOOKS.md](RUNBOOKS.md)
- [Runbooks.md](Runbooks.md)
- [Docker.md](Docker.md)
- [Docker-Compose.md](Docker-Compose.md)
- [GitHub-Actions.md](GitHub-Actions.md)
- [COST_SIMULATION.md](COST_SIMULATION.md)
- [Terraform.md](Terraform.md)
- [Azure.md](Azure.md)
- [Kubernetes.md](Kubernetes.md)
- [Logging.md](Logging.md)
- [Monitoring.md](Monitoring.md)
- [Observability.md](Observability.md)

# Fluxo

1. Documentar apenas ambientes e processos reais ou aprovados.
2. Registrar evidencias operacionais quando existirem.
3. Revalidar simulacoes de custo antes de qualquer proposta.
4. Linkar plano de producao e riscos.

# Boas práticas

- Nao versionar segredos.
- Nao inventar infraestrutura.
- Marcar lacunas como `TODO`.

# Checklist

- [ ] TODO: pipelines reais documentados.
- [ ] TODO: rollback considerado.
- [ ] TODO: monitoramento e logs revisados.

# Referências

- [Producao](../09-production/README.md)
- [Seguranca](../07-security/README.md)
- [Cost Simulation](COST_SIMULATION.md)
- [Deployment workflow](../agentes/workflows/deployment.md)
