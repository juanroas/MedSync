---
name: medsync-development-readiness
description: Use before starting MedSync implementation work to verify product, UX, architecture, design system, security, QA, DevOps, reference traceability, and benchmark-to-backlog readiness for local or homologation development.
---

# MedSync Development Readiness

## Instructions

1. Read `docs/DEVELOPMENT_READINESS.md`.
2. Confirm Sprint 1, Sprint 2, Sprint 3, and Sprint 3.5 documents exist.
3. Read `docs/agentes/EXECUTION_GUARDRAILS.md`.
4. If the task is based on external references, confirm `docs/01-product/REFERENCE_TRACEABILITY_MATRIX.md` and `docs/14-roadmap/REFERENCE_ALIGNED_IMPLEMENTATION_PLAN.md` are current.
5. Confirm unresolved items are marked `TODO`.
6. Confirm development is limited to local or homologation unless formal approvals exist.
7. Do not approve production use.
8. If readiness fails, list blockers before suggesting implementation.
9. If readiness passes and the user asks to continue/finalize, proceed to the next implementable, traceable slice.

## Required references

- `docs/01-product/SPRINT_1_REPORT.md`
- `docs/02-design/SPRINT_2_REPORT.md`
- `docs/03-architecture/SPRINT_3_REPORT.md`
- `docs/02-design/SPRINT_3_5_REPORT.md`
- `docs/agentes/EXECUTION_GUARDRAILS.md`
- `docs/01-product/REFERENCE_TRACEABILITY_MATRIX.md`
- `docs/14-roadmap/REFERENCE_ALIGNED_IMPLEMENTATION_PLAN.md`
- `docs/09-production/PRODUCTION_CHECKLIST.md`

## Output contract

- Return `Ready for development: yes/no`.
- List blockers.
- List allowed development scope.
- List documents to read before coding.
- List whether references are traced to implementation plan.
