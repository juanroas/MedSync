import { expect, test } from "@playwright/test";

test.describe("autocadastro de clínica", () => {
  test("entra na hora com a clínica em análise, sem liberar consultas", async ({ page }) => {
    const seed = Date.now().toString().slice(-8);

    await page.goto("/cadastro");
    await page.getByRole("textbox", { name: "Razão social", exact: true }).fill(`Clínica Autocadastro ${seed} Ltda`);
    await page.getByRole("textbox", { name: "Nome fantasia", exact: true }).fill(`Clínica Autocadastro ${seed}`);
    await page.getByRole("textbox", { name: "CNPJ", exact: true }).fill(validCnpjFromSeed(Number(seed) + 7));
    await page.getByRole("textbox", { name: "Seu nome", exact: true }).fill("Admin Autocadastro");
    await page.getByRole("textbox", { name: "E-mail", exact: true }).fill(`autocadastro.${seed}@medsync.dev`);
    await page.getByLabel("Senha", { exact: true }).fill("Autocadastro123!");
    await page.getByRole("button", { name: /criar conta/i }).click();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 20000 });
    await expect(page.getByText(/cadastro recebido/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /falar com o suporte/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /nova consulta/i })).toHaveCount(0);
  });
});

function validCnpjFromSeed(seed: number) {
  const base = String(seed).padStart(12, "0").slice(-12);
  const firstDigit = cnpjDigit(base, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const partial = `${base}${firstDigit}`;
  const secondDigit = cnpjDigit(partial, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return `${partial}${secondDigit}`;
}

function cnpjDigit(value: string, weights: number[]) {
  const sum = weights.reduce((total, weight, index) => total + Number(value[index]) * weight, 0);
  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}
