import { expect, test } from "@playwright/test";
import { loginByUi, sharedPassword, users } from "./fixtures";

test.describe("CRUD cadastral por perfil", () => {
  test.skip(!sharedPassword, "defina MEDSYNC_E2E_PASSWORD para executar login E2E");

  test("paciente acessa edicao dos proprios dados permitidos", async ({ page }) => {
    await loginByUi(page, users.patient);
    await page.getByRole("link", { name: /^meu cadastro$/i }).click();

    await expect(page.getByRole("heading", { name: /dados cadastrais permitidos/i })).toBeVisible();
    await expect(page.getByLabel(/nome completo/i)).toBeVisible();
    await expect(page.getByLabel(/e-mail/i)).toBeVisible();
    await expect(page.getByLabel(/nascimento/i)).toBeVisible();
    await expect(page.getByLabel(/telefone/i)).toBeVisible();
    await expect(page.getByText(/cpf, elegibilidade, faturas e registros clinicos nao sao alterados/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /atualizar cadastro/i })).toBeVisible();
  });

  test("medico acessa edicao do proprio perfil profissional permitido", async ({ page }) => {
    await loginByUi(page, users.doctor);
    await page.getByRole("link", { name: /^meu perfil$/i }).click();

    await expect(page.getByRole("heading", { name: /dados profissionais permitidos/i })).toBeVisible();
    await expect(page.getByLabel("CRM", { exact: true })).toBeVisible();
    await expect(page.getByLabel(/uf do crm/i)).toBeVisible();
    await expect(page.getByLabel(/especialidade/i)).toBeVisible();
    await expect(page.getByText(/nao altera faturas, elegibilidade empresarial, prontuario ou registro clinico/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /atualizar perfil medico/i })).toBeVisible();
  });
});
