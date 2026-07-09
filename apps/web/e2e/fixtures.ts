import { expect, type APIRequestContext, type Page } from "@playwright/test";

export const baseApiURL = process.env.MEDSYNC_E2E_API_URL ?? "http://localhost:8080";
export const sharedPassword = process.env.MEDSYNC_E2E_PASSWORD ?? "";

export const users = {
  clinicAdmin: process.env.MEDSYNC_E2E_ADMIN_EMAIL ?? "adm_clinica@medsync.dev",
  receptionist: process.env.MEDSYNC_E2E_RECEPTION_EMAIL ?? "recepcao@medsync.dev",
  finance: process.env.MEDSYNC_E2E_FINANCE_EMAIL ?? "financeiro@medsync.dev",
  privacyAuditor: process.env.MEDSYNC_E2E_AUDITOR_EMAIL ?? "auditor_privacidade@medsync.dev",
  patient: process.env.MEDSYNC_E2E_PATIENT_EMAIL ?? "paciente_novo@teste.com",
  doctor: process.env.MEDSYNC_E2E_DOCTOR_EMAIL ?? "medico_novo@medsync.dev",
};

export async function loginByUi(page: Page, email: string, password = sharedPassword) {
  if (!password) throw new Error("Configure MEDSYNC_E2E_PASSWORD para executar login E2E.");
  await page.goto("/login");
  await page.getByLabel(/e-mail/i).fill(email);
  await page.getByLabel(/senha/i).fill(password);
  await page.getByRole("button", { name: /entrar/i }).click();
  await expect(page).toHaveURL(/\/(dashboard|alterar-senha)/);
}

export async function loginByApi(request: APIRequestContext, email: string, password = sharedPassword) {
  if (!password) throw new Error("Configure MEDSYNC_E2E_PASSWORD para executar login E2E.");
  const response = await request.post(`${baseApiURL}/auth/login`, {
    data: { email, password },
  });
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
