# Objetivo

Centralizar documentacao de banco de dados e governanca de dados do MedSync.

# Escopo

Inclui templates para ERD, tabelas, indices, nomenclatura, migrations, seed, backup e restore.

# Estrutura

- [DATA_MODEL.md](DATA_MODEL.md)
- [ERD.md](ERD.md)
- [Tables.md](Tables.md)
- [Indexes.md](Indexes.md)
- [Naming-Convention.md](Naming-Convention.md)
- [Migration-Strategy.md](Migration-Strategy.md)
- [Seed-Strategy.md](Seed-Strategy.md)
- [Backup-Restore.md](Backup-Restore.md)

# Fluxo

1. Documentar apenas estruturas reais ou aprovadas.
2. Classificar dados sensiveis quando aplicavel.
3. Linkar specifications e LGPD.

# Boas práticas

- Nao inventar tabelas.
- Nao expor dados reais.
- Marcar lacunas como `TODO`.

# Checklist

- [ ] TODO: modelo validado com implementacao.
- [ ] TODO: dados sensiveis classificados.
- [ ] TODO: backup/restore documentado com evidencia quando existir.

# Referências

- [Specifications](../16-specifications/README.md)
- [LGPD](../07-security/LGPD_CHECKLIST.md)
- [DevOps](../13-devops/README.md)
