import { expect, test } from "@playwright/test";
import { loginByUi, sharedPassword, users } from "./fixtures";

test.describe("gestao de equipe e acessos", () => {
  test.skip(!sharedPassword, "defina MEDSYNC_E2E_PASSWORD para executar login E2E");

  test("admin plataforma acessa equipe e acessos sem permissao clinica indevida", async ({ page }) => {
    await loginByUi(page, users.platformAdmin);
    await page.getByRole("link", { name: /equipe e acessos/i }).click();

    await expect(page.getByRole("heading", { name: /equipe e acessos/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /novo acesso/i })).toBeVisible();
    await expect(page.getByText(/menor privilegio/i)).toBeVisible();
    await expect(page.getByText(/nao recebem acesso a prontuario/i)).toBeVisible();
    await expect(page.getByText(/diagnostico, observacao clinica ou conteudo de chamada/i)).toBeVisible();
  });

  test("auditor empresa nao cria acesso operacional", async ({ page }) => {
    await loginByUi(page, users.companyAuditor);

    await expect(page.getByRole("link", { name: /equipe e acessos/i })).toHaveCount(0);
  });
});
