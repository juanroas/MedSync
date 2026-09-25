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

  test("ADM da clinica opera agenda sem conteudo clinico", async ({ page }) => {
    await loginByUi(page, users.clinicAdmin);

    await expect(page.getByRole("heading", { name: /central de operacao/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /nova consulta/i })).toBeVisible();
    const navigation = page.getByRole("navigation");
    await expect(navigation.getByRole("link", { name: /^consultas$/i })).toBeVisible();
    await expect(navigation.getByRole("link", { name: /^clínicas$/i })).toHaveCount(0);
  });

  test("medico ADM ve clinicas aguardando analise e nao cria agenda", async ({ page }) => {
    await loginByUi(page, users.medicalAdmin);

    await expect(page.getByText(/clínicas aguardando análise/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /nova consulta/i })).toHaveCount(0);
    const navigation = page.getByRole("navigation");
    await expect(navigation.getByRole("link", { name: /^clínicas$/i })).toBeVisible();
    await expect(navigation.getByRole("link", { name: /^consultas$/i })).toHaveCount(0);
    await expect(navigation.getByRole("link", { name: /^auditoria$/i })).toHaveCount(0);
  });

  test("suporte ve a fila de ajuda e nao agenda", async ({ page }) => {
    await loginByUi(page, users.support);

    await expect(page.getByText(/pedidos de ajuda de todas as clínicas/i)).toBeVisible();
    const navigation = page.getByRole("navigation");
    await expect(navigation.getByRole("link", { name: /^consultas$/i })).toHaveCount(0);
    await expect(navigation.getByRole("link", { name: /pacientes/i })).toHaveCount(0);
  });

  test("DPO ve privacidade e auditoria sem modulos assistenciais", async ({ page }) => {
    await loginByUi(page, users.dpo);

    await expect(page.getByRole("heading", { name: /dpo medsync/i })).toBeVisible();
    const navigation = page.getByRole("navigation");
    await expect(navigation.getByRole("link", { name: /^privacidade$/i })).toBeVisible();
    await expect(navigation.getByRole("link", { name: /^auditoria$/i })).toBeVisible();
    await expect(navigation.getByRole("link", { name: /^consultas$/i })).toHaveCount(0);
    await expect(navigation.getByRole("link", { name: /pacientes/i })).toHaveCount(0);
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
});
