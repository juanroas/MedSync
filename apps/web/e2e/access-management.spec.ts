import { expect, test } from "@playwright/test";
import { loginByUi, sharedPassword, users } from "./fixtures";

test.describe("gestao de equipe e acessos", () => {
  test.skip(!sharedPassword, "defina MEDSYNC_E2E_PASSWORD para executar login E2E");

  test("medico ADM MedSync gerencia so a equipe MedSync", async ({ page }) => {
    await loginByUi(page, users.medicalAdmin);
    await page.getByRole("link", { name: /equipe medsync/i }).click();

    await expect(page.getByRole("heading", { name: /equipe e acessos/i })).toBeVisible();
    await expect(page.getByText(/não recebem acesso a prontuário/i)).toBeVisible();
    await page.getByRole("button", { name: /novo acesso/i }).click();
    const roleSelect = page.getByLabel("Perfil", { exact: true });
    await expect(roleSelect).toContainText(/suporte medsync/i);
    await expect(roleSelect).toContainText(/dpo medsync/i);
    await expect(roleSelect).toContainText(/médico adm medsync/i);
    await expect(roleSelect).not.toContainText(/adm da clínica/i);
  });

  test("suporte e DPO nao gerenciam acessos", async ({ page }) => {
    for (const email of [users.support, users.dpo]) {
      await loginByUi(page, email);
      await expect(page.getByRole("link", { name: /equipe/i })).toHaveCount(0);
    }
  });

  test("ADM da clinica cria apenas ADM da propria clinica", async ({ page }) => {
    await loginByUi(page, users.clinicAdmin);
    await page.getByRole("link", { name: /equipe e acessos/i }).click();

    await expect(page.getByRole("heading", { name: /equipe e acessos/i })).toBeVisible();
    await expect(page.locator("main")).not.toContainText(/suporte medsync/i);
    await expect(page.locator("main")).not.toContainText(/dpo medsync/i);
    await expect(page.locator("main")).not.toContainText(/clinica2\.admin/i);
    await page.getByRole("button", { name: /novo acesso/i }).click();
    const roleSelect = page.getByLabel("Perfil", { exact: true });
    await expect(roleSelect).toContainText(/adm da clínica/i);
    await expect(roleSelect).not.toContainText(/medsync/i);
  });
});
