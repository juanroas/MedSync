import { expect, test } from "@playwright/test";
import { loginByUi, sharedPassword, users } from "./fixtures";

test.describe("onboarding assistido de clínica", () => {
  test.skip(!sharedPassword, "defina MEDSYNC_E2E_PASSWORD para executar login E2E");

  test("suporte cadastra a clínica e o Médico ADM ativa", async ({ page }) => {
    const seed = Date.now().toString().slice(-8);
    const clinicName = `Clínica Onboarding ${seed}`;

    await loginByUi(page, users.support);
    await page.getByRole("navigation").getByRole("link", { name: /^clínicas$/i }).click();
    await expect(page.getByRole("heading", { name: /^clínicas$/i })).toBeVisible();
    await page.getByRole("button", { name: /cadastrar clínica/i }).click();
    await page.getByRole("textbox", { name: "Razão social", exact: true }).fill(`${clinicName} Ltda`);
    await page.getByRole("textbox", { name: "Nome fantasia", exact: true }).fill(clinicName);
    const cnpj = page.getByRole("textbox", { name: "CNPJ", exact: true });
    await cnpj.fill(validCnpjFromSeed(Number(seed)));
    await expect(cnpj).toHaveValue(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/);
    await page.getByLabel(/nome do administrador/i).fill("Admin Onboarding");
    await page.getByLabel(/e-mail do administrador/i).fill(`admin.onboarding.${seed}@medsync.dev`);
    await page.getByLabel(/senha tempor[áa]ria/i).fill("TempOnboarding123!");
    await page.getByRole("button", { name: /cadastrar clínica/i }).click();
    await expect(page.getByText(/aguardando ativa[çc][ãa]o/i)).toBeVisible();

    await page.getByRole("button", { name: /sair da conta/i }).click();
    await loginByUi(page, users.medicalAdmin);
    await page.getByRole("navigation").getByRole("link", { name: /^clínicas$/i }).click();
    const row = page.locator("article").filter({ hasText: clinicName });
    await expect(row.getByText("Em análise", { exact: true })).toBeVisible();
    await row.getByRole("button", { name: /^ativar$/i }).click();
    await expect(row.getByText("Ativa", { exact: true })).toBeVisible();
  });

  test("suporte não ativa clínica", async ({ page }) => {
    await loginByUi(page, users.support);
    await page.getByRole("navigation").getByRole("link", { name: /^clínicas$/i }).click();
    await expect(page.getByRole("heading", { name: /^clínicas$/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /^ativar$/i })).toHaveCount(0);
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
