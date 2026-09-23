---
name: medsync-architecture-blueprint
description: Use for MedSync architecture documentation, module boundaries, multi-tenancy, data model concepts, API guidelines, events, ADR preparation, and pre-development technical planning.
---

# MedSync Architecture Blueprint

## Instructions

1. Read `docs/03-architecture/README.md`.
2. Read product and security docs when architectural decisions affect B2B or clinical data.
3. If a feature comes from external references, confirm it exists in `docs/01-product/REFERENCE_TRACEABILITY_MATRIX.md`.
4. Do not create code, migrations, endpoints, infrastructure, or services.
5. Use ADRs for durable decisions.
6. Mark code-dependent validation as `TODO`.
7. Preserve module boundaries: Business must not access individual clinical data.

## Required references

- `docs/03-architecture/ARCHITECTURE_OVERVIEW.md`
- `docs/03-architecture/MODULE_BOUNDARIES.md`
- `docs/03-architecture/MULTI_TENANCY.md`
- `docs/03-architecture/API_GUIDELINES.md`
- `docs/10-decisions/README.md`

## Output contract

- Identify affected modules.
- List assumptions and decisions separately.
- Recommend ADRs when needed.
- Confirm implementation was not changed.
