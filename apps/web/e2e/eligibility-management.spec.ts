import { expect, test } from "@playwright/test";
import { loginByUi, sharedPassword, users } from "./fixtures";

test.describe("elegibilidade administrativa B2B", () => {
  test.skip(!sharedPassword, "defina MEDSYNC_E2E_PASSWORD para executar login E2E");

  test("empresa admin gerencia elegibilidade sem dados clinicos", async ({ page }) => {
    await loginByUi(page, users.companyAdmin);
    await page.getByRole("link", { name: /elegibilidade/i }).click();

    await expect(page.getByRole("heading", { name: /^elegibilidade$/i })).toBeVisible();
    await expect(page.getByText(/apto a usar o beneficio contratado/i)).toBeVisible();
    await expect(page.getByText(/nao aparecem para a empresa/i)).toBeVisible();
    await expect(page.getByText(/diagnostico, prontuario, observacao clinica/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /salvar elegibilidade/i }).first()).toBeVisible();
    await expect(page.getByText(/conteudo de chamada/i)).toBeVisible();
  });

  test("financeiro empresa nao acessa lista individual de elegibilidade", async ({ page }) => {
    await loginByUi(page, users.companyFinance);

    await expect(page.getByRole("link", { name: /elegibilidade/i })).toHaveCount(0);
  });
});
