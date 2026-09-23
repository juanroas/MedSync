import { expect, test } from "@playwright/test";

test.describe("cadastro de clinica", () => {
  test("usa linguagem de clinica, cliente principal do MedSync (ADR-0002)", async ({ page }) => {
    await page.goto("/cadastro");

    await expect(page.getByRole("heading", { name: /cadastrar cl[íi]nica/i })).toBeVisible();
    await expect(page.getByLabel(/razao social/i)).toBeVisible();
    await expect(page.getByLabel(/cnpj/i)).toBeVisible();
    await expect(page.getByLabel(/plano contratado/i)).toBeVisible();
    await expect(page.getByLabel(/valor mensal/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /criar cl[íi]nica/i })).toBeVisible();
  });
});
