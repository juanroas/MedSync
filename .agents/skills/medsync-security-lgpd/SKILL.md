---
name: medsync-security-lgpd
description: Use for MedSync security, privacy, LGPD, CFM/telemedicine references, sensitive data handling, access control, audit events, and documentation review before homologation or production.
---

# MedSync Security and LGPD

## Instructions

1. Read `docs/07-security/README.md`.
2. Read `docs/reference/LGPD.md`, `docs/reference/CFM.md`, and `docs/reference/Healthcare.md` for regulatory references.
3. Do not declare compliance or production readiness.
4. Treat legal/medical/regulatory conclusions as requiring formal review.
5. Never include real personal data, credentials, tokens, CPF completo, clinical notes, or secrets in docs.
6. Preserve the rule that employers cannot access individual clinical data.

## Required references

- `docs/07-security/SECURITY_CHECKLIST.md`
- `docs/07-security/LGPD_CHECKLIST.md`
- `docs/reference/LGPD.md`
- `docs/reference/CFM.md`
- `docs/reference/Healthcare.md`

## Output contract

- State risk level and affected data categories.
- Separate documented facts from `TODO` legal validation.
- List required approvals.
- Confirm no sensitive data was added.
