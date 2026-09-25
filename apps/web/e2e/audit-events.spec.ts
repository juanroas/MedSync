import { expect, test } from "@playwright/test";
import { baseApiURL, loginByApi, loginByUi, sharedPassword, users } from "./fixtures";

test.describe("auditoria por perfil", () => {
  test.skip(!sharedPassword, "defina MEDSYNC_E2E_PASSWORD para executar login E2E");

  test("DPO ve tentativa negada de outro perfil sem dado clinico", async ({ page, request }) => {
    await loginByApi(request, users.support);

    const deniedResponse = await request.get(`${baseApiURL}/appointments`);
    expect(deniedResponse.status()).toBe(403);

    await loginByUi(page, users.dpo);
    await page.getByRole("navigation").getByRole("link", { name: /auditoria/i }).click();

    await expect(page.getByRole("heading", { name: /auditoria da plataforma/i })).toBeVisible();
    await expect(page.getByText(/eventos que exigem revisao/i)).toBeVisible();
    await expect(page.getByText("Appointment.List").first()).toBeVisible();
    await expect(page.getByText("Negado").first()).toBeVisible();
    await expect(page.getByText(/sem expor prontuario, diagnostico, cpf completo, token ou conteudo da chamada/i)).toBeVisible();
  });

  test("ADM da clinica ve a auditoria da propria clinica", async ({ page }) => {
    await loginByUi(page, users.clinicAdmin);
    await page.getByRole("navigation").getByRole("link", { name: /auditoria/i }).click();

    await expect(page.getByRole("heading", { name: /auditoria da clínica/i })).toBeVisible();
  });
});
