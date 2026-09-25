import { test } from "@playwright/test";
import { loginByUi, sharedPassword, users } from "./fixtures";

// Os seis perfis do ADR-0003.
const profiles = [
  ["paciente", users.patient],
  ["medico", users.doctor],
  ["ADM da clinica", users.clinicAdmin],
  ["medico ADM MedSync", users.medicalAdmin],
  ["suporte MedSync", users.support],
  ["DPO MedSync", users.dpo],
] as const;

test.describe("login por perfil", () => {
  test.skip(!sharedPassword, "defina MEDSYNC_E2E_PASSWORD para executar login E2E");

  for (const [profile, email] of profiles) {
    test(`autentica ${profile}`, async ({ page }) => {
      await loginByUi(page, email);
    });
  }
});
