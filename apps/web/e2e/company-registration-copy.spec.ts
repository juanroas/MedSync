import { expect, test } from "@playwright/test";

test.describe("cadastro empresarial", () => {
  test("usa linguagem B2B de empresa, nao clinica", async ({ page }) => {
    await page.goto("/cadastro");

    await expect(page.getByRole("heading", { name: /cadastrar empresa/i })).toBeVisible();
    await expect(page.getByLabel(/nome da empresa/i)).toBeVisible();
    await expect(page.getByText(/empresa parceira do medsync/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /criar empresa/i })).toBeVisible();
    await expect(page.getByText(/clinica|clínica/i)).toHaveCount(0);
  });
});
