import { expect, test } from "@playwright/test";
import { loginByUi, sharedPassword, users } from "./fixtures";

test.describe("experiencia por perfil", () => {
  test.skip(!sharedPassword, "defina MEDSYNC_E2E_PASSWORD para executar login E2E");

  test("medico ve painel medico e nao cria agenda", async ({ page }) => {
    await loginByUi(page, users.doctor);

    await expect(page.getByRole("heading", { name: /^painel medico$/i })).toBeVisible();
    await expect(page.getByText(/agendamentos sao criados/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /nova consulta/i })).toHaveCount(0);
  });

  test("financeiro empresa tem tela financeira sem aba consultas", async ({ page }) => {
    await loginByUi(page, users.companyFinance);

    await expect(page.getByRole("heading", { name: /financeiro empresa/i })).toBeVisible();
    await expect(page.getByText(/faturas e uso agregado/i)).toBeVisible();
    await expect(page.getByText(/sem prontuario, diagnostico ou sala/i)).toBeVisible();
    await expect(page.getByRole("heading", { name: /portal empresa/i })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /^consultas$/i })).toHaveCount(0);
  });

  test("admin plataforma ve relatorios e nao cria agenda", async ({ page }) => {
    await loginByUi(page, users.platformAdmin);

    await expect(page.getByRole("heading", { name: /relatorios da plataforma/i })).toBeVisible();
    await expect(page.getByText(/este perfil nao cria agenda/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /nova consulta/i })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /auditoria/i })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /equipe e acessos/i })).toBeVisible();
  });

  test("auditor empresa enxerga modulos assistenciais e auditoria", async ({ page }) => {
    await loginByUi(page, users.companyAuditor);

    await expect(page.getByRole("heading", { name: /visao operacional autorizada/i })).toBeVisible();
    await expect(page.getByText(/sem prontuario, diagnostico ou conteudo de chamada/i)).toBeVisible();
    const navigation = page.getByRole("navigation");
    await expect(navigation.getByRole("link", { name: /^consultas$/i })).toBeVisible();
    await expect(navigation.getByRole("link", { name: /pacientes/i })).toBeVisible();
    await expect(navigation.getByRole("link", { name: /^medicos$/i })).toBeVisible();
    await expect(navigation.getByRole("link", { name: /^auditoria$/i })).toBeVisible();
  });

  test("paciente e medico usam nomes de jornada, nao modulos administrativos", async ({ page }) => {
    await loginByUi(page, users.patient);
    await expect(page.getByRole("link", { name: /^minhas consultas$/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /^meu cadastro$/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /^pacientes$/i })).toHaveCount(0);

    await page.getByRole("button", { name: /sair da conta/i }).click();
    await loginByUi(page, users.doctor);
    await expect(page.getByRole("link", { name: /^agenda$/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /^pacientes vinculados$/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /^meu perfil$/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /nova consulta/i })).toHaveCount(0);
  });

  test("entrada em sala respeita status da consulta", async ({ page }) => {
    await loginByUi(page, users.doctor);
    await page.getByRole("link", { name: /^agenda$/i }).click();
    await expect(
      page.getByRole("button", { name: /iniciar sala/i }).or(page.getByRole("link", { name: /^entrar$/i })),
    ).toBeVisible();

    await page.getByRole("button", { name: /sair da conta/i }).click();
    await loginByUi(page, users.patient);
    await page.getByRole("link", { name: /^minhas consultas$/i }).click();
    await expect(
      page.getByText(/aguardando sala/i).or(page.getByRole("link", { name: /^entrar$/i })),
    ).toBeVisible();
  });

  test("card LGPD do portal empresa fica legivel", async ({ page }) => {
    await loginByUi(page, users.companyAdmin);

    const privacyCard = page.getByText(/dados clinicos individuais nao sao exibidos/i);
    await expect(privacyCard).toBeVisible();
    await expect(page.getByText(/empresas acessam apenas dados administrativos e agregados/i)).toBeVisible();
  });
});
