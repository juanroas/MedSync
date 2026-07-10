import { expect, test } from "@playwright/test";
import { loginByUi, sharedPassword, users } from "./fixtures";

test.describe("home care do paciente", () => {
  test.skip(!sharedPassword, "defina MEDSYNC_E2E_PASSWORD para executar login E2E");

  test("mostra acesso ao cuidado como primeira experiencia do paciente", async ({ page }) => {
    await loginByUi(page, users.patient);

    await expect(page.getByRole("heading", { name: /acesse seu cuidado digital/i })).toBeVisible();
    await expect(page.getByText(/proximo atendimento/i)).toBeVisible();
    await expect(page.getByRole("heading", { name: /minhas consultas/i })).toBeVisible();
    await expect(page.getByText(/sua jornada e separada da empresa/i)).toBeVisible();
    await expect(page.getByRole("heading", { name: /central de operacao/i })).toHaveCount(0);
  });
});
