import { expect, test } from "@playwright/test";
import { baseApiURL, loginByApi, loginByUi, sharedPassword, users } from "./fixtures";

test.describe("auditoria por perfil", () => {
  test.skip(!sharedPassword, "defina MEDSYNC_E2E_PASSWORD para executar login E2E");

  test("auditor empresa ve tentativa negada de perfil financeiro sem dado clinico", async ({ page, request }) => {
    await loginByApi(request, users.companyFinance);

    const deniedResponse = await request.get(`${baseApiURL}/company-beneficiaries`);
    expect(deniedResponse.status()).toBe(403);

    await loginByUi(page, users.companyAuditor);
    await page.getByRole("navigation").getByRole("link", { name: /auditoria/i }).click();

    await expect(page.getByRole("heading", { name: /auditoria operacional/i })).toBeVisible();
    await expect(page.getByText(/eventos que exigem revisao/i)).toBeVisible();
    await expect(page.getByText("CompanyEligibility.List").first()).toBeVisible();
    await expect(page.getByText("Negado").first()).toBeVisible();
    await expect(page.getByText(/perfil sem permissao para lista individual de elegibilidade/i).first()).toBeVisible();
    await expect(page.getByText(/sem expor prontuario, diagnostico, cpf completo, token ou conteudo da chamada/i)).toBeVisible();
  });
});
