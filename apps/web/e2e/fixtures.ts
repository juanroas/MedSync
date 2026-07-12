import { expect, type APIRequestContext, type Page } from "@playwright/test";

export const baseApiURL = process.env.MEDSYNC_E2E_API_URL ?? "http://localhost:8080";
export const sharedPassword = process.env.MEDSYNC_E2E_PASSWORD ?? "";

export const users = {
  platformAdmin: process.env.MEDSYNC_E2E_ADMIN_EMAIL ?? "admin@medsync.dev",
  companyAdmin: process.env.MEDSYNC_E2E_COMPANY_ADMIN_EMAIL ?? "empresa.admin@medsync.dev",
  companyFinance: process.env.MEDSYNC_E2E_COMPANY_FINANCE_EMAIL ?? "empresa.financeiro@medsync.dev",
  company2Admin: process.env.MEDSYNC_E2E_COMPANY2_ADMIN_EMAIL ?? "empresa2.admin@medsync.dev",
  company2Finance: process.env.MEDSYNC_E2E_COMPANY2_FINANCE_EMAIL ?? "empresa2.financeiro@medsync.dev",
  company2Auditor: process.env.MEDSYNC_E2E_COMPANY2_AUDITOR_EMAIL ?? "empresa2.auditor@medsync.dev",
  company2Patient: process.env.MEDSYNC_E2E_COMPANY2_PATIENT_EMAIL ?? "paciente.empresa2@medsync.dev",
  company2Doctor: process.env.MEDSYNC_E2E_COMPANY2_DOCTOR_EMAIL ?? "medico.empresa2@medsync.dev",
  company3Admin: process.env.MEDSYNC_E2E_COMPANY3_ADMIN_EMAIL ?? "empresa3.admin@medsync.dev",
  company3Finance: process.env.MEDSYNC_E2E_COMPANY3_FINANCE_EMAIL ?? "empresa3.financeiro@medsync.dev",
  company3Auditor: process.env.MEDSYNC_E2E_COMPANY3_AUDITOR_EMAIL ?? "empresa3.auditor@medsync.dev",
  company3Patient: process.env.MEDSYNC_E2E_COMPANY3_PATIENT_EMAIL ?? "paciente.empresa3@medsync.dev",
  company3Doctor: process.env.MEDSYNC_E2E_COMPANY3_DOCTOR_EMAIL ?? "medico.empresa3@medsync.dev",
  platformFinance: process.env.MEDSYNC_E2E_PLATFORM_FINANCE_EMAIL ?? "plataforma.financeiro@medsync.dev",
  support: process.env.MEDSYNC_E2E_SUPPORT_EMAIL ?? "suporte@medsync.dev",
  companyAuditor: process.env.MEDSYNC_E2E_COMPANY_AUDITOR_EMAIL ?? "empresa.auditor@medsync.dev",
  platformAuditor: process.env.MEDSYNC_E2E_PLATFORM_AUDITOR_EMAIL ?? "plataforma.auditor@medsync.dev",
  dpo: process.env.MEDSYNC_E2E_DPO_EMAIL ?? "dpo@medsync.dev",
  occupationalHealthAdmin: process.env.MEDSYNC_E2E_OCCUPATIONAL_ADMIN_EMAIL ?? "medico.trabalho@medsync.dev",
  patient: process.env.MEDSYNC_E2E_PATIENT_EMAIL ?? "paciente@medsync.dev",
  patient2: process.env.MEDSYNC_E2E_PATIENT2_EMAIL ?? "paciente2@medsync.dev",
  patient3: process.env.MEDSYNC_E2E_PATIENT3_EMAIL ?? "paciente3@medsync.dev",
  demoPatient: process.env.MEDSYNC_E2E_DEMO_PATIENT_EMAIL ?? "paciente.demo@medsync.dev",
  demoPatient2: process.env.MEDSYNC_E2E_DEMO_PATIENT2_EMAIL ?? "paciente.demo2@medsync.dev",
  doctor: process.env.MEDSYNC_E2E_DOCTOR_EMAIL ?? "medico@medsync.dev",
};

export async function loginByUi(page: Page, email: string, password = sharedPassword) {
  if (!password) throw new Error("Configure MEDSYNC_E2E_PASSWORD para executar login E2E.");
  await page.goto("/login");
  await page.getByLabel(/e-mail/i).fill(email);
  await page.getByRole("textbox", { name: /senha/i }).fill(password);
  for (let attempt = 1; attempt <= 4; attempt++) {
    await page.getByRole("button", { name: /entrar/i }).click();
    try {
      await expect(page).toHaveURL(/\/(dashboard|alterar-senha)/, { timeout: 5000 });
      return;
    } catch (error) {
      if (attempt === 4) throw error;
      await page.waitForTimeout(attempt * 1000);
    }
  }
}

export async function loginByApi(request: APIRequestContext, email: string, password = sharedPassword) {
  if (!password) throw new Error("Configure MEDSYNC_E2E_PASSWORD para executar login E2E.");
  let response = await request.post(`${baseApiURL}/auth/login`, {
    data: { email, password },
  });
  for (let attempt = 1; response.status() === 429 && attempt <= 4; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
    response = await request.post(`${baseApiURL}/auth/login`, {
      data: { email, password },
    });
  }
  expect(response.status(), `login ${email}`).toBeLessThan(400);
  return response.json();
}

export function validCpfFromSeed(seed: number) {
  const base = String(seed).padStart(9, "0").slice(-9);
  const firstSum = base
    .split("")
    .reduce((sum, digit, index) => sum + Number(digit) * (10 - index), 0);
  const firstDigit = firstSum % 11 < 2 ? 0 : 11 - (firstSum % 11);
  const partial = `${base}${firstDigit}`;
  const secondSum = partial
    .split("")
    .reduce((sum, digit, index) => sum + Number(digit) * (11 - index), 0);
  const secondDigit = secondSum % 11 < 2 ? 0 : 11 - (secondSum % 11);
  return `${partial}${secondDigit}`;
}
