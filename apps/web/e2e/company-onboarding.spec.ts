import { expect, test } from "@playwright/test";
import { loginByUi, sharedPassword, users } from "./fixtures";

test.describe("onboarding assistido de empresa", () => {
  test.skip(!sharedPassword, "defina MEDSYNC_E2E_PASSWORD para executar login E2E");

  test("suporte cadastra empresa e ADM MedSync habilita CNPJ", async ({ page }) => {
    const seed = Date.now().toString().slice(-8);
    const companyName = `Empresa Onboarding ${seed}`;

    await loginByUi(page, users.support);
    await page.getByRole("navigation").getByRole("link", { name: /^empresas$/i }).click();
    await expect(page.getByRole("heading", { name: /^empresas$/i })).toBeVisible();
    await page.getByLabel(/razao social/i).fill(`${companyName} Ltda`);
    await page.getByLabel(/nome fantasia/i).fill(companyName);
    await page.getByLabel(/cnpj/i).fill(validCnpjFromSeed(Number(seed)));
    await expect(page.getByLabel(/cnpj/i)).toHaveValue(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/);
    await page.getByLabel(/plano contratado/i).fill("Plano Onboarding");
    await page.getByLabel(/valor mensal/i).fill("899.90");
    await page.getByLabel(/limite mensal/i).fill("250");
    await page.getByLabel(/nome do adm/i).fill("Admin Onboarding");
    await page.getByLabel(/e-mail do adm/i).fill(`admin.onboarding.${seed}@medsync.dev`);
    await page.getByLabel(/senha temporaria/i).fill("TempOnboarding123!");
    await page.getByRole("button", { name: /cadastrar empresa/i }).click();
    await expect(page.getByText(/cnpj aguardando habilitacao/i)).toBeVisible();

    await page.getByRole("button", { name: /sair da conta/i }).click();
    await loginByUi(page, users.platformAdmin);
    await page.getByRole("navigation").getByRole("link", { name: /elegibilidade/i }).click();
    await expect(page.getByText(companyName)).toBeVisible();
    const row = page.locator("article").filter({ hasText: companyName });
    await expect(row.getByText(/aguardando habilitacao/i)).toBeVisible();
    await row.getByRole("button", { name: /habilitar cnpj/i }).click();
    await expect(row.getByText(/habilitada/i)).toBeVisible();
  });

  test("suporte nao habilita CNPJ", async ({ page }) => {
    await loginByUi(page, users.support);
    await page.getByRole("navigation").getByRole("link", { name: /elegibilidade/i }).click();
    await expect(page.getByRole("button", { name: /habilitar cnpj/i })).toHaveCount(0);
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
