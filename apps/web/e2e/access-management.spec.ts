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
    await page.getByRole("button", { name: /novo acesso/i }).click();
    await expect(page.getByLabel(/perfil/i)).toContainText(/suporte medsync/i);
    await expect(page.getByLabel(/perfil/i)).toContainText(/financeiro medsync/i);
    await expect(page.getByLabel(/perfil/i)).not.toContainText(/financeiro empresa/i);
    await expect(page.getByLabel(/perfil/i)).not.toContainText(/auditor empresa/i);
  });

  test("auditor empresa nao cria acesso operacional", async ({ page }) => {
    await loginByUi(page, users.companyAuditor);

    await expect(page.getByRole("link", { name: /equipe e acessos/i })).toHaveCount(0);
  });

  test("empresa admin cria apenas perfis empresariais", async ({ page }) => {
    await loginByUi(page, users.companyAdmin);
    await page.getByRole("link", { name: /equipe e acessos/i }).click();

    await expect(page.getByRole("heading", { name: /equipe e acessos/i })).toBeVisible();
    await expect(page.locator("main")).not.toContainText(/medico do trabalho/i);
    await expect(page.locator("main")).not.toContainText(/suporte/i);
    await expect(page.locator("main")).not.toContainText(/financeiro medsync/i);
    await expect(page.locator("main")).not.toContainText(/auditor medsync/i);
    await expect(page.locator("main")).not.toContainText(/dpo/i);
    await expect(page.locator("main")).not.toContainText(/admin plataforma/i);
    await expect(page.locator("main")).not.toContainText(/empresa alfa/i);
    await expect(page.locator("main")).not.toContainText(/empresa beta/i);
    await page.getByRole("button", { name: /novo acesso/i }).click();
    await expect(page.getByLabel(/perfil/i)).toContainText(/empresa\/parceiro admin/i);
    await expect(page.getByLabel(/perfil/i)).toContainText(/financeiro empresa/i);
    await expect(page.getByLabel(/perfil/i)).toContainText(/auditor empresa/i);
    await expect(page.getByLabel(/perfil/i)).not.toContainText(/financeiro medsync/i);
    await expect(page.getByLabel(/perfil/i)).not.toContainText(/suporte medsync/i);
    await expect(page.getByLabel(/perfil/i)).not.toContainText(/auditor medsync/i);
    await expect(page.getByLabel(/perfil/i)).not.toContainText(/dpo/i);
    await expect(page.getByLabel(/perfil/i)).not.toContainText(/medico do trabalho/i);
    await expect(page.getByLabel(/perfil/i)).not.toContainText(/admin plataforma/i);
  });
});
