import { expect, test } from "@playwright/test";
import { loginByUi, sharedPassword, users } from "./fixtures";

test.describe("agenda do medico", () => {
  test.skip(!sharedPassword, "defina MEDSYNC_E2E_PASSWORD para executar login E2E");

  test("abre no dia de hoje, alterna para semana e gerencia horarios de atendimento", async ({ page }) => {
    await loginByUi(page, users.doctor);
    await page.getByRole("link", { name: /^agenda$/i }).click();

    await expect(page.getByRole("heading", { name: /^agenda$/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Dia" })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByText("Horários de atendimento", { exact: true })).toBeVisible();

    await page.getByRole("tab", { name: "Semana" }).click();
    const columns = page.locator("section[aria-label]");
    await expect(columns).toHaveCount(7);
    await expect(columns.first()).toContainText("Segunda");

    await page.getByRole("button", { name: /próxima semana/i }).click();
    await page.getByRole("button", { name: /^hoje$/i }).click();

    // Novo horário aparece na grade da semana e pode ser removido.
    await page.getByRole("button", { name: /adicionar horário/i }).click();
    await page.getByLabel("Dia da semana").selectOption("Saturday");
    await page.getByLabel("Início").fill("07:00");
    await page.getByLabel("Fim").fill("07:30");
    await page.getByRole("button", { name: /salvar horário/i }).click();
    const saturday = page.locator("section[aria-label^='Sábado']");
    await expect(saturday).toContainText("07:00–07:30 atende");

    await page.getByRole("button", { name: /remover sábado 07:00/i }).click();
    const dialog = page.getByRole("dialog", { name: /remover horário de atendimento/i });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: /^remover horário$/i }).click();
    await expect(saturday).not.toContainText("07:00–07:30");
  });
});
