import { expect, test } from "@playwright/test";
import { baseApiURL, loginByApi, loginByUi, sharedPassword, users } from "./fixtures";

const editableProfiles = [
  ["admin plataforma", users.platformAdmin],
  ["financeiro plataforma", users.platformFinance],
  ["suporte", users.support],
  ["auditor plataforma", users.platformAuditor],
  ["dpo", users.dpo],
  ["medico do trabalho", users.occupationalHealthAdmin],
  ["paciente cnpj tecnico", users.patient],
  ["paciente cnpj tecnico 2", users.patient2],
  ["paciente cnpj tecnico 3", users.patient3],
  ["empresa admin", users.companyAdmin],
  ["financeiro empresa", users.companyFinance],
  ["auditor empresa", users.companyAuditor],
  ["paciente empresa demo", users.demoPatient],
  ["paciente empresa demo 2", users.demoPatient2],
  ["empresa alfa admin", users.company2Admin],
  ["empresa alfa financeiro", users.company2Finance],
  ["empresa alfa auditor", users.company2Auditor],
  ["paciente empresa alfa", users.company2Patient],
  ["empresa beta admin", users.company3Admin],
  ["empresa beta financeiro", users.company3Finance],
  ["empresa beta auditor", users.company3Auditor],
  ["paciente empresa beta", users.company3Patient],
] as const;

test.describe("perfil pessoal", () => {
  test.skip(!sharedPassword, "defina MEDSYNC_E2E_PASSWORD para executar login E2E");

  test("tela meus dados permite edicao pessoal para admin plataforma", async ({ page }) => {
    await loginByUi(page, users.platformAdmin);
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
