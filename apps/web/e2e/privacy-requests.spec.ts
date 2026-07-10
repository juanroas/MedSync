import { expect, test } from "@playwright/test";
import { baseApiURL, loginByApi, loginByUi, sharedPassword, users } from "./fixtures";

test.describe("privacidade e direitos do titular", () => {
  test.skip(!sharedPassword, "defina MEDSYNC_E2E_PASSWORD para executar login E2E");

  test("paciente registra solicitacao e DPO atualiza status minimizado", async ({ page, request }) => {
    await loginByApi(request, users.companyFinance);
    const forbidden = await request.get(`${baseApiURL}/privacy/requests`);
    expect(forbidden.status()).toBe(403);

    const description = `Solicito acesso aos meus dados cadastrais em homologacao ${Date.now()}.`;

    await loginByUi(page, users.patient);
    await page.getByRole("link", { name: /privacidade/i }).click();

    await expect(page.getByRole("heading", { name: /solicitacoes de privacidade/i })).toBeVisible();
    await expect(page.getByText(/nao registre cpf completo/i)).toBeVisible();
    await page.getByLabel(/tipo/i).selectOption("Access");
    await page.getByLabel(/descricao/i).fill(description);
    await page.getByRole("button", { name: /registrar solicitacao/i }).click();
    await expect(page.getByText(/solicitacao registrada com trilha de auditoria/i)).toBeVisible();
    await expect(page.getByText(description)).toBeVisible();

    await loginByUi(page, users.dpo);
    await page.getByRole("link", { name: /privacidade/i }).click();

    await expect(page.getByRole("heading", { name: /direitos do titular/i })).toBeVisible();
    await expect(page.getByText(description)).toBeVisible();

    const item = page.locator("article").filter({ hasText: description }).first();
    await item.getByRole("combobox").selectOption("InReview");
    await item.getByPlaceholder(/nota operacional minimizada/i).fill("Analise DPO iniciada em ambiente de homologacao.");
    await item.getByRole("button", { name: /atualizar/i }).click();

    await expect(page.getByText(/status de privacidade atualizado com auditoria/i)).toBeVisible();
    await expect(item.locator("span").filter({ hasText: /^Em analise$/ }).first()).toBeVisible();

    await loginByUi(page, users.companyFinance);
    await expect(page.getByRole("link", { name: /privacidade/i })).toHaveCount(0);
  });
});
