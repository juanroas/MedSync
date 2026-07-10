import { expect, test } from "@playwright/test";
import { loginByUi, sharedPassword, users } from "./fixtures";

test.describe("financeiro B2B", () => {
  test.skip(!sharedPassword, "defina MEDSYNC_E2E_PASSWORD para executar login E2E");

  test("financeiro empresa ve faturas minimizadas sem dados clinicos", async ({ page }) => {
    await loginByUi(page, users.companyFinance);

    await expect(page.getByRole("heading", { name: /financeiro empresa/i })).toBeVisible();
    await expect(page.getByText(/faturas do cnpj/i)).toBeVisible();
    await expect(page.getByText(/competencia/i).first()).toBeVisible();
    await expect(page.getByText(/mensalidade/i)).toBeVisible();
    await expect(page.getByText(/sem prontuario, diagnostico ou sala/i)).toBeVisible();
    await expect(page.getByText("Sem dado clinico", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: /elegibilidade/i })).toHaveCount(0);
  });
});
