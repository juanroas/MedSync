import { expect, test } from "@playwright/test";
import { baseApiURL, loginByApi, loginByUi, sharedPassword, users } from "./fixtures";

test.describe("relatorios B2B agregados", () => {
  test.skip(!sharedPassword, "defina MEDSYNC_E2E_PASSWORD para executar login E2E");

  test("empresa acessa somente relatorio do proprio CNPJ", async ({ page }) => {
    await loginByUi(page, users.company2Admin);
    await page.getByRole("navigation").getByRole("link", { name: /relatorios/i }).click();

    await expect(page.getByRole("heading", { name: /relatorios da empresa/i })).toBeVisible();
    await expect(page.getByText("Empresa Alfa", { exact: true })).toBeVisible();
    await expect(page.getByText("Plano Alfa Cuidado Digital", { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/empresa beta/i)).toHaveCount(0);
    await expect(page.getByText(/sem prontuario, diagnostico ou conteudo de chamada/i)).toBeVisible();
  });

  test("plataforma compara CNPJs sem expor detalhe clinico", async ({ page, request }) => {
    await loginByApi(request, users.platformFinance);
    const response = await request.get(`${baseApiURL}/reports/business-summary`);
    expect(response.status()).toBe(200);
    const report = await response.json();
    expect(report.isGlobal).toBe(true);
    expect(report.companies.map((company: { companyName: string }) => company.companyName)).toEqual(
      expect.arrayContaining(["Empresa Demo", "Empresa Alfa", "Empresa Beta"]),
    );
    const rawReport = JSON.stringify(report).toLowerCase();
    expect(rawReport).not.toContain("patientname");
    expect(rawReport).not.toContain("notes");
    expect(rawReport).not.toContain("clinicalrecord");
    expect(rawReport).not.toContain("cpf");

    await loginByUi(page, users.platformFinance);
    await page.getByRole("navigation").getByRole("link", { name: /relatorios/i }).click();

    await expect(page.getByRole("heading", { name: /relatorios por cnpj/i })).toBeVisible();
    await expect(page.getByText("Empresa Demo", { exact: true })).toBeVisible();
    await expect(page.getByText("Empresa Alfa", { exact: true })).toBeVisible();
    await expect(page.getByText("Empresa Beta", { exact: true })).toBeVisible();
    await expect(page.getByText(/sem dados clinicos individuais/i)).toBeVisible();
  });

  test("financeiro exporta dados minimizados por escopo", async ({ request }) => {
    await loginByApi(request, users.company2Finance);
    const companyExport = await request.get(`${baseApiURL}/finance/export`);
    expect(companyExport.status()).toBe(200);
    const companyData = await companyExport.json();
    expect(companyData.isGlobal).toBe(false);
    expect(companyData.rows).toHaveLength(1);
    expect(companyData.rows[0].companyName).toBe("Empresa Alfa");
    expect(JSON.stringify(companyData.rows).toLowerCase()).not.toContain("cpf");
    expect(JSON.stringify(companyData.rows).toLowerCase()).not.toContain("diagnostico");

    await loginByApi(request, users.platformFinance);
    const platformExport = await request.get(`${baseApiURL}/finance/export`);
    expect(platformExport.status()).toBe(200);
    const platformData = await platformExport.json();
    expect(platformData.isGlobal).toBe(true);
    expect(platformData.rows.map((row: { companyName: string }) => row.companyName)).toEqual(
      expect.arrayContaining(["Empresa Demo", "Empresa Alfa", "Empresa Beta"]),
    );
  });

  test("empresa admin e financeiro veem somente o proprio CNPJ pela API", async ({ request }) => {
    await loginByApi(request, users.company2Admin);
    const company2Report = await request.get(`${baseApiURL}/reports/business-summary`);
    expect(company2Report.status()).toBe(200);
    const company2Data = await company2Report.json();
    expect(company2Data.isGlobal).toBe(false);
    expect(company2Data.companies.map((company: { companyName: string }) => company.companyName)).toEqual(["Empresa Alfa"]);

    await loginByApi(request, users.company3Admin);
    const company3Report = await request.get(`${baseApiURL}/reports/business-summary`);
    expect(company3Report.status()).toBe(200);
    const company3Data = await company3Report.json();
    expect(company3Data.isGlobal).toBe(false);
    expect(company3Data.companies.map((company: { companyName: string }) => company.companyName)).toEqual(["Empresa Beta"]);
  });

  test("auditor e DPO nao acessam relatorios financeiros ou B2B", async ({ request }) => {
    await loginByApi(request, users.platformAuditor);
    expect((await request.get(`${baseApiURL}/reports/business-summary`)).status()).toBe(403);
    expect((await request.get(`${baseApiURL}/finance/export`)).status()).toBe(403);

    await loginByApi(request, users.dpo);
    expect((await request.get(`${baseApiURL}/reports/business-summary`)).status()).toBe(403);
    expect((await request.get(`${baseApiURL}/finance/export`)).status()).toBe(403);
  });

  test("paciente nao acessa relatorios empresariais", async ({ page, request }) => {
    await loginByApi(request, users.patient);
    const response = await request.get(`${baseApiURL}/reports/business-summary`);
    expect(response.status()).toBe(403);

    await loginByUi(page, users.patient);
    await expect(page.getByRole("link", { name: /relatorios/i })).toHaveCount(0);
  });
});
