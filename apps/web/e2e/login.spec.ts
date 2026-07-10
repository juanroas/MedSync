import { test } from "@playwright/test";
import { loginByUi, sharedPassword, users } from "./fixtures";

const profiles = [
  ["admin plataforma", users.platformAdmin],
  ["empresa admin", users.companyAdmin],
  ["financeiro empresa", users.companyFinance],
  ["financeiro plataforma", users.platformFinance],
  ["suporte MedSync", users.support],
  ["auditor empresa", users.companyAuditor],
  ["auditor plataforma", users.platformAuditor],
  ["DPO", users.dpo],
  ["ADM medico do trabalho", users.occupationalHealthAdmin],
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
