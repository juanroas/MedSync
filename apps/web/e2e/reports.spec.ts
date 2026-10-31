import { expect, request, test, type APIRequestContext } from "@playwright/test";
import { baseApiURL, loginByApi, loginByUi, sharedPassword, users, validCpfFromSeed } from "./fixtures";

// Relatórios (14/10/2026): atendimentos da clínica, produção do médico, acessos LGPD e declaração de comparecimento
// (assinada pelo médico desde 28/10/2026).
// Nenhum deles traz conteúdo clínico (regra C5); receitas só aparecem no relatório do próprio médico.
test.describe("relatorios", () => {
  test.skip(!sharedPassword, "defina MEDSYNC_E2E_PASSWORD para executar login E2E");

  test("ADM ve atendimentos da clinica e baixa PDF e planilha", async ({ page }) => {
    await loginByUi(page, users.clinicAdmin);
    await page.getByRole("navigation").getByRole("link", { name: "Relatórios", exact: true }).click();
    await expect(page.getByRole("heading", { name: /relatórios/i })).toBeVisible();
    await expect(page.getByLabel("Resumo do período").getByText("Realizadas", { exact: true })).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Médico" })).toBeVisible();
    await expect(page.getByText("Receitas emitidas por mim")).toHaveCount(0);

    const pdf = page.waitForEvent("download");
    await page.getByRole("button", { name: /baixar pdf/i }).click();
    expect((await pdf).suggestedFilename()).toMatch(/^atendimentos-.*\.pdf$/);
    const csv = page.waitForEvent("download");
    await page.getByRole("button", { name: /baixar planilha/i }).click();
    expect((await csv).suggestedFilename()).toMatch(/^atendimentos-.*\.csv$/);

    const api = await request.newContext({ baseURL: baseApiURL });
    await loginByApi(api, users.clinicAdmin);
    const report = (await (await api.get("/reports/appointments")).json()) as { scope: string; prescriptions: unknown };
    expect(report.scope).toBe("clinic");
    expect(report.prescriptions).toBeNull();
    expect((await api.get("/reports/appointments?from=2026-10-31&to=2026-10-01")).status()).toBe(400);
    const csvFile = await api.get("/reports/appointments/csv");
    expect(csvFile.headers()["content-type"]).toContain("text/csv");
    expect(await csvFile.text()).toContain("Data;Horário;Paciente;Médico;Modalidade;Situação");
    await api.dispose();
  });

  test("medico ve so a propria producao, com as receitas", async ({ page }) => {
    const api = await request.newContext({ baseURL: baseApiURL });
    const { user } = (await loginByApi(api, users.doctor)) as { user: { doctorId: string } };
    const report = (await (await api.get("/reports/appointments")).json()) as {
      scope: string;
      prescriptions: { total: number } | null;
      items: Array<{ doctorId: string }>;
    };
    expect(report.scope).toBe("own");
    expect(report.prescriptions).not.toBeNull();
    expect(report.items.every((item) => item.doctorId === user.doctorId)).toBe(true);
    expect((await api.get(`/reports/appointments?doctorId=${crypto.randomUUID()}`)).status()).toBe(403);
    expect((await api.get("/reports/appointments/pdf")).headers()["content-type"]).toContain("application/pdf");
    await api.dispose();

    await loginByUi(page, users.doctor);
    await page.getByRole("navigation").getByRole("link", { name: "Relatórios", exact: true }).click();
    await expect(page.getByText("Receitas emitidas por mim")).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Médico" })).toHaveCount(0);
  });

  test("recepcao ve atendimentos sem receitas; suporte, Medico ADM e paciente nao", async ({ page }) => {
    const reception = await request.newContext({ baseURL: baseApiURL });
    await loginByApi(reception, users.receptionist);
    const report = await reception.get("/reports/appointments");
    expect(report.status()).toBe(200);
    expect(((await report.json()) as { prescriptions: unknown }).prescriptions).toBeNull();
    await reception.dispose();

    for (const email of [users.support, users.medicalAdmin, users.patient]) {
      const context = await request.newContext({ baseURL: baseApiURL });
      await loginByApi(context, email);
      expect((await context.get("/reports/appointments")).status(), email).toBe(403);
      expect((await context.get("/reports/appointments/csv")).status(), email).toBe(403);
      await context.dispose();
    }

    await loginByUi(page, users.support);
    await expect(page.getByRole("navigation").getByRole("link", { name: "Relatórios", exact: true })).toHaveCount(0);
  });

  test("LGPD: paciente baixa quem acessou seus dados; DPO gera pelo CPF; ADM nao", async ({ page }) => {
    const patient = await request.newContext({ baseURL: baseApiURL });
    await loginByApi(patient, users.patient);
    const own = await patient.get("/me/data-access-report");
    expect(own.status()).toBe(200);
    expect(own.headers()["content-type"]).toContain("application/pdf");
    await patient.dispose();

    const dpo = await request.newContext({ baseURL: baseApiURL });
    await loginByApi(dpo, users.dpo);
    expect((await dpo.post("/privacy/data-access-report", { data: { cpf: "123" } })).status()).toBe(400);
    expect((await dpo.post("/privacy/data-access-report", { data: { cpf: validCpfFromSeed(99999991) } })).status()).toBe(404);
    const byCpf = await dpo.post("/privacy/data-access-report", { data: { cpf: "123.456.789-09" } });
    expect(byCpf.status()).toBe(200);
    expect(byCpf.headers()["content-type"]).toContain("application/pdf");
    await dpo.dispose();

    const admin = await request.newContext({ baseURL: baseApiURL });
    await loginByApi(admin, users.clinicAdmin);
    expect((await admin.post("/privacy/data-access-report", { data: { cpf: "123.456.789-09" } })).status()).toBe(403);
    expect((await admin.get("/me/data-access-report")).status()).toBe(403);
    await admin.dispose();

    await loginByUi(page, users.patient);
    await page.getByRole("navigation").getByRole("link", { name: "Meu cadastro", exact: true }).click();
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: /baixar relatório de acessos/i }).click();
    expect((await download).suggestedFilename()).toBe("acessos-aos-meus-dados.pdf");

    await page.context().clearCookies();
    await loginByUi(page, users.dpo);
    await page.getByRole("navigation").getByRole("link", { name: "Relatórios", exact: true }).click();
    await page.getByLabel("CPF completo do titular").fill("12345678909");
    const dpoDownload = page.waitForEvent("download");
    await page.getByRole("button", { name: /baixar relatório/i }).click();
    expect((await dpoDownload).suggestedFilename()).toBe("relatorio-de-acessos-titular.pdf");
    await expect(page.getByText(/relatório gerado/i)).toBeVisible();
  });

  // 28/10/2026: the doctor signs the declaration; before that nobody downloads anything (no unsigned document in the
  // clinic's or the platform's name). The signing part needs the simulator: MEDSYNC_E2E_SIGNING=1.
  test("declaracao de comparecimento sai so depois que o medico assina", async ({ page }) => {
    const seed = Number(Date.now().toString().slice(-8));
    const temporary = `Tmp${seed}!aA`;
    const admin = await request.newContext({ baseURL: baseApiURL });
    await loginByApi(admin, users.clinicAdmin);

    // Médico e paciente próprios do teste, para o horário não colidir com o seed.
    const doctorEmail = `declaracao.medico.${seed}@example.test`;
    const doctorCreated = await admin.post("/doctors", {
      data: { name: "Dr. Declaração Teste", email: doctorEmail, crm: String((seed % 800000) + 100000), crmUf: "SP", specialty: "Clínica geral", temporaryPassword: temporary },
    });
    expect(doctorCreated.status(), await doctorCreated.text()).toBe(201);
    const doctorId = ((await doctorCreated.json()) as { id: string }).id;
    const patientEmail = `declaracao.paciente.${seed}@example.test`;
    const patientCreated = await admin.post("/patients", {
      data: {
        name: "Paciente Declaração",
        email: patientEmail,
        cpf: validCpfFromSeed(seed),
        birthDate: "1990-05-05",
        temporaryPassword: temporary,
        motherName: "Mãe Declaração",
        address: { zipCode: "01310-100", street: "Rua A", number: "1", district: "Centro", city: "São Paulo", state: "SP" },
      },
    });
    expect(patientCreated.status(), await patientCreated.text()).toBe(201);
    const patientId = ((await patientCreated.json()) as { id: string }).id;

    const booked = await admin.post("/appointments", {
      data: {
        doctorId,
        patientId,
        scheduledAt: new Date(Date.now() + 5 * 60_000).toISOString(),
        durationMinutes: 15,
        modality: "InPerson",
        paymentRequired: false,
      },
    });
    expect(booked.status(), await booked.text()).toBe(201);
    const appointmentId = ((await booked.json()) as { id: string }).id;

    const doctor = await firstAccess(doctorEmail, temporary);
    const patient = await firstAccess(patientEmail, temporary);
    const reception = await request.newContext({ baseURL: baseApiURL });
    await loginByApi(reception, users.receptionist);
    expect((await patient.get(`/appointments/${appointmentId}/attendance-declaration`)).status()).toBe(409);

    // Not before the consultation is concluded.
    const panel = (await (await doctor.get(`/appointments/${appointmentId}/medical-documents`)).json()) as {
      suggestedStartedAt: string;
      suggestedEndedAt: string;
    };
    const times = { kind: "AttendanceDeclaration", attendanceStartedAt: panel.suggestedStartedAt, attendanceEndedAt: panel.suggestedEndedAt };
    expect((await doctor.post(`/appointments/${appointmentId}/medical-documents`, { data: times })).status()).toBe(400);
    expect((await doctor.post(`/consultations/${appointmentId}/end`, { data: { outcome: "Completed" } })).status()).toBe(204);

    // Concluded, entry and exit typed by the doctor (in person: the booked time), still a draft: nobody gets it.
    const startedAt = new Date(Date.now() - 20 * 60_000).toISOString();
    const endedAt = new Date().toISOString();
    const created = await doctor.post(`/appointments/${appointmentId}/medical-documents`, {
      data: { ...times, attendanceStartedAt: startedAt, attendanceEndedAt: endedAt },
    });
    expect(created.status(), await created.text()).toBe(201);
    const declarationId = ((await created.json()) as { id: string }).id;
    for (const context of [patient, reception, admin, doctor])
      expect((await context.get(`/appointments/${appointmentId}/attendance-declaration`)).status()).toBe(409);
    expect((await patient.get(`/medical-documents/${declarationId}/pdf`)).status()).toBe(404);
    const patientList = (await (await patient.get("/appointments")).json()) as { id: string; documentCount: number }[];
    expect(patientList.find((item) => item.id === appointmentId)?.documentCount).toBe(0);

    if (process.env.MEDSYNC_E2E_SIGNING !== "1") {
      expect((await doctor.post(`/medical-documents/${declarationId}/sign`, { data: { lifetimeHours: 1 } })).status()).toBe(409);
      for (const context of [admin, doctor, patient, reception]) await context.dispose();
      return;
    }

    // The doctor signs it on the document page (simulator in this environment).
    await loginByUi(page, doctorEmail);
    await page.goto(`/documento/${declarationId}`);
    await expect(page.getByRole("heading", { name: /declaração de comparecimento/i })).toBeVisible();
    await page.getByRole("button", { name: /assinar com certificado digital/i }).click();
    await expect(page).toHaveURL(/\/assinatura\/simulador/);
    await page.getByRole("button", { name: /aprovar \(simulação\)/i }).click();
    await expect(page.getByRole("link", { name: /baixar pdf assinado/i })).toBeVisible({ timeout: 20000 });

    for (const context of [patient, admin, doctor, reception]) {
      const declaration = await context.get(`/appointments/${appointmentId}/attendance-declaration`);
      expect(declaration.status()).toBe(200);
      expect(declaration.headers()["content-type"]).toContain("application/pdf");
    }
    for (const email of [users.dpo, users.clinic2Admin]) {
      const other = await request.newContext({ baseURL: baseApiURL });
      await loginByApi(other, email);
      expect((await other.get(`/appointments/${appointmentId}/attendance-declaration`)).status(), email).toBe(404);
      await other.dispose();
    }

    // The doctor downloads it from the day view of the agenda.
    await page.getByRole("link", { name: /voltar ao prontuário/i }).click();
    await page.getByRole("navigation").getByRole("link", { name: "Agenda", exact: true }).click();
    const agendaDownload = page.waitForEvent("download");
    await page.getByRole("button", { name: /declaração de comparecimento/i }).click();
    expect((await agendaDownload).suggestedFilename()).toBe("declaracao-de-comparecimento.pdf");

    // The patient finds it in Minhas consultas → Histórico → Documentos.
    await page.context().clearCookies();
    await loginByUi(page, patientEmail);
    await page.getByRole("navigation").getByRole("link", { name: "Minhas consultas", exact: true }).click();
    await page.getByRole("button", { name: /histórico/i }).click();
    await page.getByRole("button", { name: "Documentos (1)" }).click();
    const download = page.waitForEvent("download");
    await page.getByRole("dialog", { name: "Documentos da consulta" }).getByRole("button", { name: /baixar pdf/i }).click();
    expect((await download).suggestedFilename()).toBe("declaracao-de-comparecimento.pdf");

    for (const context of [admin, doctor, patient, reception]) await context.dispose();
  });
});

// Replaces the temporary password by the demo one, so the account can be used afterwards.
async function firstAccess(email: string, temporary: string): Promise<APIRequestContext> {
  const context = await request.newContext({ baseURL: baseApiURL });
  await loginByApi(context, email, temporary);
  const changed = await context.post("/auth/change-password", { data: { currentPassword: temporary, newPassword: sharedPassword } });
  expect(changed.status()).toBe(204);
  return context;
}
