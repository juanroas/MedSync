import { expect, type APIRequestContext, type Page } from "@playwright/test";

export const baseApiURL = process.env.MEDSYNC_E2E_API_URL ?? "http://localhost:8080";
export const sharedPassword = process.env.MEDSYNC_E2E_PASSWORD ?? "";

// Seed de demonstração (ADR-0003): equipe MedSync na clínica plataforma e três clínicas com ADM, médico e paciente.
export const users = {
  medicalAdmin: process.env.MEDSYNC_E2E_ADMIN_EMAIL ?? "admin@medsync.dev",
  support: process.env.MEDSYNC_E2E_SUPPORT_EMAIL ?? "suporte@medsync.dev",
  dpo: process.env.MEDSYNC_E2E_DPO_EMAIL ?? "dpo@medsync.dev",
  clinicAdmin: process.env.MEDSYNC_E2E_CLINIC_ADMIN_EMAIL ?? "clinica.admin@medsync.dev",
  clinic2Admin: process.env.MEDSYNC_E2E_CLINIC2_ADMIN_EMAIL ?? "clinica2.admin@medsync.dev",
  clinic3Admin: process.env.MEDSYNC_E2E_CLINIC3_ADMIN_EMAIL ?? "clinica3.admin@medsync.dev",
  clinic2Patient: process.env.MEDSYNC_E2E_CLINIC2_PATIENT_EMAIL ?? "paciente.empresa2@medsync.dev",
  clinic2Doctor: process.env.MEDSYNC_E2E_CLINIC2_DOCTOR_EMAIL ?? "medico.empresa2@medsync.dev",
  clinic3Patient: process.env.MEDSYNC_E2E_CLINIC3_PATIENT_EMAIL ?? "paciente.empresa3@medsync.dev",
  clinic3Doctor: process.env.MEDSYNC_E2E_CLINIC3_DOCTOR_EMAIL ?? "medico.empresa3@medsync.dev",
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
      await expect(page).toHaveURL(/\/(dashboard|alterar-senha)/, { timeout: 15000 });
      return;
    } catch (error) {
      // A slow login may still be navigating; only click again if we are really still on /login.
      if (attempt === 4 || !page.url().endsWith("/login")) throw error;
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
