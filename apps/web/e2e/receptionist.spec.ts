import { expect, request, test } from "@playwright/test";
import { baseApiURL, loginByApi, loginByUi, sharedPassword, users, validCpfFromSeed } from "./fixtures";

// ADR-0005: the front desk registers patients and runs the agenda; never clinical content, team, clinic data or audit.
test.describe("perfil recepcao", () => {
  test.skip(!sharedPassword, "defina MEDSYNC_E2E_PASSWORD para executar login E2E");

  test("recepcao ve so pacientes e agenda, cadastra paciente e e barrada no resto", async ({ page }) => {
    await loginByUi(page, users.receptionist);
    const menu = page.getByRole("navigation");
    for (const item of ["Painel", "Meus dados", "Consultas", "Pacientes", "Ajuda"])
      await expect(menu.getByRole("link", { name: item, exact: true })).toBeVisible();
    for (const item of ["Médicos", "Dados da clínica", "Equipe e acessos", "Auditoria"])
      await expect(menu.getByRole("link", { name: item, exact: true })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /agendar consulta/i }).first()).toBeVisible();

    const api = await request.newContext({ baseURL: baseApiURL });
    await loginByApi(api, users.receptionist);
    const seed = Number(Date.now().toString().slice(-8));
    const created = await api.post("/patients", {
      data: {
        name: "Paciente da Recepção",
        email: `recepcao.paciente.${seed}@example.test`,
        cpf: validCpfFromSeed(seed),
        birthDate: "1992-02-02",
        temporaryPassword: "Temporaria123!",
        motherNameUndeclared: true,
        address: { zipCode: "01310-100", street: "Rua B", number: "2", district: "Centro", city: "São Paulo", state: "SP" },
      },
    });
    expect(created.status()).toBe(201);

    // Never clinical content, team, clinic data or audit.
    const appointments = (await (await api.get("/appointments")).json()) as Array<{ id: string; patientId: string; notes?: string | null }>;
    expect(appointments.length).toBeGreaterThan(0);
    expect(appointments.every((item) => !item.notes)).toBe(true);
    expect((await api.get(`/appointments/${appointments[0].id}/clinical-record`)).status()).toBeGreaterThanOrEqual(403);
    expect((await api.get(`/patients/${appointments[0].patientId}/clinical-records`)).status()).toBeGreaterThanOrEqual(403);
    expect((await api.get("/clinics/me")).status()).toBe(403);
    expect((await api.get("/audit-events")).status()).toBeGreaterThanOrEqual(403);
    const staff = await api.post("/staff-users", {
      data: { name: "Outra", email: `x.${seed}@example.test`, role: "Receptionist", temporaryPassword: "Temporaria123!" },
    });
    expect(staff.status()).toBe(403);
    await api.dispose();
  });

  test("ADM da clinica cria conta de recepcao em Equipe e acessos", async () => {
    const admin = await request.newContext({ baseURL: baseApiURL });
    await loginByApi(admin, users.clinicAdmin);
    const seed = Date.now().toString().slice(-8);
    const created = await admin.post("/staff-users", {
      data: { name: "Nova Recepção", email: `nova.recepcao.${seed}@example.test`, role: "Receptionist", temporaryPassword: "Temporaria123!" },
    });
    expect(created.status()).toBe(201);
    await admin.dispose();
  });
});
