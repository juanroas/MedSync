import { expect, test } from "@playwright/test";
import { baseApiURL, loginByApi, loginByUi, sharedPassword, users } from "./fixtures";

test.describe("seed multiempresa para homologacao", () => {
  test.skip(!sharedPassword, "defina MEDSYNC_E2E_PASSWORD para executar login E2E");

  test("empresas demo acessam seus proprios portais por tenant", async ({ request }) => {
    const scenarios = [
      {
        email: users.companyAdmin,
        clinicName: "MedSync Medical",
        companyName: "Empresa Demo",
        planName: "Plano B2B Demo",
      },
      {
        email: users.company2Admin,
        clinicName: "Empresa Alfa - Homologacao",
        companyName: "Empresa Alfa",
        planName: "Plano Alfa Cuidado Digital",
      },
      {
        email: users.company3Admin,
        clinicName: "Empresa Beta - Homologacao",
        companyName: "Empresa Beta",
        planName: "Plano Beta Assistencial",
      },
    ];

    for (const scenario of scenarios) {
      const login = await loginByApi(request, scenario.email);
      expect(login.user.clinicName).toBe(scenario.clinicName);

      const response = await request.get(`${baseApiURL}/company-portal`);
      expect(response.status()).toBe(200);

      const portal = await response.json();
      expect(portal.company.tradeName).toBe(scenario.companyName);
      expect(portal.contract.planName).toBe(scenario.planName);
      expect(portal.eligibility.beneficiaryCount).toBe(5);
      expect(portal.eligibility.eligibleCount).toBe(5);
    }
  });

  test("empresa alfa visualiza portal B2B sem dados da empresa beta", async ({ page }) => {
    await loginByUi(page, users.company2Admin);

    await expect(page.getByRole("heading", { name: /portal empresa/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /^Empresa Alfa$/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /^Plano Alfa Cuidado Digital$/i })).toBeVisible();
    await expect(page.getByText(/empresa beta/i)).toHaveCount(0);
    await expect(page.getByText(/plano beta assistencial/i)).toHaveCount(0);
  });
});
