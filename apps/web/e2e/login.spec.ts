import { test } from "@playwright/test";
import { loginByUi, sharedPassword, users } from "./fixtures";

const profiles = [
  ["admin clinica", users.clinicAdmin],
  ["recepcao", users.receptionist],
  ["financeiro", users.finance],
  ["auditor privacidade", users.privacyAuditor],
  ["paciente", users.patient],
  ["medico", users.doctor],
] as const;

test.describe("login por perfil", () => {
  test.skip(!sharedPassword, "defina MEDSYNC_E2E_PASSWORD para executar login E2E");

  for (const [profile, email] of profiles) {
    test(`autentica ${profile}`, async ({ page }) => {
      await loginByUi(page, email);
    });
  }
});
