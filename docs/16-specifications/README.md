# Objetivo

Centralizar especificacoes de dominio do MedSync.

# Escopo

Esta pasta contem templates para entidades e conceitos de dominio. Nao devem ser preenchidos com campos, APIs ou regras ficticias.

# Estrutura

- [Company.md](Company.md)
- [Clinic.md](Clinic.md)
- [Employee.md](Employee.md)
- [Doctor.md](Doctor.md)
- [Patient.md](Patient.md)
- [Appointment.md](Appointment.md)
- [MedicalRecord.md](MedicalRecord.md)
- [Prescription.md](Prescription.md)
- [Invoice.md](Invoice.md)
- [Notification.md](Notification.md)
- [Tenant.md](Tenant.md)
- [Role.md](Role.md)
- [Permission.md](Permission.md)

# Fluxo

1. Validar fonte da especificacao.
2. Preencher somente campos e regras aprovadas.
3. Linkar arquitetura, API, database e QA quando aplicavel.

# Boas práticas

- Usar `TODO` para lacunas.
- Nao inventar regras de negocio.
- Nao documentar tabelas ou endpoints inexistentes.

# Checklist

- [ ] TODO: fonte aprovada.
- [ ] TODO: permissoes revisadas.
- [ ] TODO: relacionamentos validados.
- [ ] TODO: eventos reais documentados.

# Referências

- [Reference](../reference/README.md)
- [Database](../12-database/README.md)
- [API](../11-api/README.md)
