import { expect, test } from "@playwright/test";

test.describe("cadastro de clinica", () => {
  test("usa linguagem de clinica, cliente principal do MedSync (ADR-0002)", async ({ page }) => {
    await page.goto("/cadastro");

    await expect(page.getByRole("heading", { name: /cadastrar cl[íi]nica/i })).toBeVisible();
    await expect(page.getByLabel(/raz[ãa]o social/i)).toBeVisible();
    await expect(page.getByLabel(/cnpj/i)).toBeVisible();
    await expect(page.getByLabel(/plano contratado/i)).toHaveCount(0);
    await expect(page.getByLabel(/valor mensal/i)).toHaveCount(0);
    await expect(page.getByRole("button", { name: /criar conta/i })).toBeVisible();
  });
});
