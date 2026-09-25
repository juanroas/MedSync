import { expect, test } from "@playwright/test";
import { baseApiURL, loginByApi, loginByUi, sharedPassword, users } from "./fixtures";

const editableProfiles = [
  ["medico ADM MedSync", users.medicalAdmin],
  ["suporte", users.support],
  ["dpo", users.dpo],
  ["ADM clinica demo", users.clinicAdmin],
  ["ADM clinica alfa", users.clinic2Admin],
  ["ADM clinica beta", users.clinic3Admin],
  ["paciente", users.patient],
  ["paciente 2", users.patient2],
  ["paciente 3", users.patient3],
  ["paciente demo", users.demoPatient],
  ["paciente demo 2", users.demoPatient2],
  ["paciente clinica alfa", users.clinic2Patient],
  ["paciente clinica beta", users.clinic3Patient],
] as const;

test.describe("perfil pessoal", () => {
  test.skip(!sharedPassword, "defina MEDSYNC_E2E_PASSWORD para executar login E2E");

  test("tela meus dados permite edicao pessoal para medico ADM", async ({ page }) => {
    await loginByUi(page, users.medicalAdmin);
    await page.getByRole("link", { name: /meus dados/i }).click();

    await expect(page.getByRole("heading", { name: /meus dados/i })).toBeVisible();
    await expect(page.getByLabel(/nome completo/i)).toBeVisible();
    await expect(page.getByLabel(/e-mail/i)).toBeVisible();
    await expect(page.getByLabel(/telefone/i)).toBeVisible();
    await expect(page.getByText(/papel\/permissao/i)).toBeVisible();
    await expect(page.getByText(/dados clinicos/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /salvar meus dados/i })).toBeVisible();
  });

  for (const [label, email] of editableProfiles) {
    test(`api permite salvar perfil pessoal: ${label}`, async ({ request }) => {
      await loginByApi(request, email);
      const current = await request.get(`${baseApiURL}/profile`);
      expect(current.status(), `GET /profile ${email}`).toBe(200);
      const profile = await current.json();

      const updated = await request.put(`${baseApiURL}/profile`, {
        data: {
          name: profile.name,
          email: profile.email,
          phone: profile.phone ?? "(11) 99999-0000",
        },
      });

      expect(updated.status(), `PUT /profile ${email}`).toBe(200);
      const body = await updated.json();
      expect(body.email).toBe(profile.email);
      expect(body.lockedFields).toContain("Papel/permissao");
      expect(body.lockedFields).toContain("Dados clinicos");
    });
  }
});
