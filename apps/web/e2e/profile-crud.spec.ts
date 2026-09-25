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
    await expect(page.getByText(/cpf e registros clínicos não são alterados/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /atualizar cadastro/i })).toBeVisible();
  });

  test("medico ve o que falta para receitas e edita o proprio perfil", async ({ page }) => {
    await loginByUi(page, users.doctor);
    await page.getByRole("link", { name: /^meu perfil$/i }).click();

    await expect(page.getByRole("heading", { name: /^meu perfil$/i })).toBeVisible();
    await expect(page.getByText("Pronto para receitas")).toBeVisible();
    await expect(page.getByText(/certificado digital: integração em preparação/i)).toBeVisible();
    // CRM e especialidade são credenciamento: aparecem como texto, não como campo editável.
    await expect(page.getByLabel("CRM", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Credenciamento")).toBeVisible();

    const address = `Rua Teste ${Date.now().toString().slice(-4)}, São Paulo/SP`;
    await page.getByLabel(/endereço profissional/i).fill(address);
    await page.getByLabel(/rqe/i).fill("54321");
    await page.getByRole("button", { name: /^salvar$/i }).click();
    await expect(page.getByText("Perfil salvo.")).toBeVisible();
    await expect(page.getByText("Seus dados estão completos.")).toBeVisible();
    await page.reload();
    await expect(page.getByLabel(/endereço profissional/i)).toHaveValue(address);
    await expect(page.getByLabel(/rqe/i)).toHaveValue("54321");
  });

});
