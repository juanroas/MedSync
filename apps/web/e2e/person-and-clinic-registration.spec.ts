import { expect, test } from "@playwright/test";
import { loginByUi, sharedPassword, users, validCpfFromSeed } from "./fixtures";

test.describe("cadastro de pessoa fisica e dados da clinica", () => {
  test.skip(!sharedPassword, "defina MEDSYNC_E2E_PASSWORD para executar login E2E");

  test("ADM da clinica cadastra paciente com nome da mae e endereco", async ({ page }) => {
    const seed = Number(Date.now().toString().slice(-8));
    await loginByUi(page, users.clinicAdmin);
    await page.getByRole("link", { name: /^pacientes$/i }).click();
    await page.getByRole("button", { name: /novo paciente/i }).click();

    const form = page.getByRole("form", { name: "Cadastro de pessoa" });
    await form.getByLabel("Nome completo").fill(`Pessoa Fisica ${seed}`);
    await form.getByLabel("CPF").fill(validCpfFromSeed(seed));
    await form.getByLabel("Data de nascimento").fill("1985-03-20");

    // Sem nome da mãe o cadastro não sai; "Não declarado" é aceito.
    await form.getByLabel("E-mail").fill(`pessoa.${seed}@example.test`);
    await form.getByLabel("Senha temporária").fill("Temporaria123!");
    await form.getByLabel("Nome da mãe").fill("Joana Fisica");
    await form.getByLabel("Sexo").selectOption("F");
    await form.getByLabel("Logradouro", { exact: true }).fill("Rua das Flores");
    await form.getByLabel("Número", { exact: true }).fill("25");
    await form.getByLabel("Bairro", { exact: true }).fill("Centro");
    await form.getByLabel("Cidade", { exact: true }).fill("Campinas");
    await form.getByLabel("UF", { exact: true }).selectOption("SP");
    await form.getByLabel("CEP", { exact: true }).fill("13010-000");

    const created = page.waitForResponse((response) => response.url().endsWith("/patients") && response.request().method() === "POST");
    await form.getByRole("button", { name: /salvar paciente/i }).click();
    const response = await created;
    expect(response.status()).toBe(201);
    const patient = (await response.json()) as { motherName: string; sex: string; address: { city: string; zipCode: string } };
    expect(patient.motherName).toBe("Joana Fisica");
    expect(patient.sex).toBe("F");
    expect(patient.address.city).toBe("Campinas");
    expect(patient.address.zipCode).toBe("13010-000");

    const card = page.locator("article").filter({ hasText: `Pessoa Fisica ${seed}` });
    await expect(card).toContainText("Campinas/SP");
  });

  test("ADM da clinica atualiza endereco e responsavel tecnico em Dados da clinica", async ({ page }) => {
    await loginByUi(page, users.clinicAdmin);
    await page.getByRole("link", { name: /dados da clínica/i }).click();
    await expect(page.getByRole("heading", { name: /dados da clínica/i })).toBeVisible();
    await expect(page.getByLabel("Logradouro", { exact: true })).toHaveValue("Avenida Paulista");

    await page.getByLabel("Nome do médico").fill("Dra. Marina Costa");
    await page.getByLabel("CRM", { exact: true }).fill("200000");
    await page.getByLabel("UF do CRM").selectOption("SP");
    await page.getByRole("button", { name: /salvar dados/i }).click();
    await expect(page.getByText("Dados da clínica salvos.")).toBeVisible();
    await expect(page.getByText("Conferido pela MedSync")).toBeVisible();
  });
});
