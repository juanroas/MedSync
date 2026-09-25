import { expect, test } from "@playwright/test";
import { loginByUi, sharedPassword, users } from "./fixtures";

test.describe("pacientes do medico", () => {
  test.skip(!sharedPassword, "defina MEDSYNC_E2E_PASSWORD para executar login E2E");

  test("lista so pacientes com consulta, busca e abre o prontuario", async ({ page }) => {
    await loginByUi(page, users.doctor);
    await page.getByRole("link", { name: /^pacientes vinculados$/i }).click();

    await expect(page.getByRole("heading", { name: /pacientes vinculados/i })).toBeVisible();
    const row = page.locator("li").filter({ hasText: "Carlos Oliveira" });
    await expect(row).toBeVisible();
    // Pacientes da clínica sem consulta com esta médica não aparecem.
    await expect(page.getByText("Carla MedSync")).toHaveCount(0);

    await page.getByRole("tab", { name: /com consulta marcada/i }).click();
    await expect(row).toBeVisible();
    await page.getByLabel(/buscar paciente/i).fill("ninguem com esse nome");
    await expect(page.getByText(/nenhum paciente encontrado/i)).toBeVisible();
    await page.getByLabel(/buscar paciente/i).fill("carlos");

    await row.getByRole("link", { name: /abrir prontuário/i }).click();
    await expect(page).toHaveURL(/\/prontuario\//);
    await expect(page.getByRole("heading", { name: /prontuario do atendimento/i })).toBeVisible();
  });
});
