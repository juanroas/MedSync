import { expect, test } from "@playwright/test";
import { loginByUi, sharedPassword, users } from "./fixtures";

test.describe("portal empresa B2B", () => {
  test.skip(!sharedPassword, "defina MEDSYNC_E2E_PASSWORD para executar login E2E");

  test("mostra contrato, elegibilidade, faturas e uso agregado permitido", async ({ page }) => {
    await loginByUi(page, users.companyAdmin);

    await expect(page.getByRole("heading", { name: /portal empresa/i })).toBeVisible();
    await expect(page.getByText(/empresa demo/i)).toBeVisible();
    await expect(page.getByText("Contrato e plano", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: /elegibilidade/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /faturas/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /uso agregado/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /dados clinicos individuais nao sao exibidos/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /acesse seu cuidado digital/i })).toHaveCount(0);
    await expect(page.getByText(/prontuario do paciente/i)).toHaveCount(0);
    await expect(page.getByText(/observacao clinica/i)).toHaveCount(0);
    await expect(page.getByText(/conteudo da chamada/i)).toHaveCount(0);
  });
});
