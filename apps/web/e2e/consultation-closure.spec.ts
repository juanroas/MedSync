import { expect, request, test, type APIRequestContext, type Page } from "@playwright/test";
import { baseApiURL, loginByApi, loginByUi, sharedPassword, users, validCpfFromSeed } from "./fixtures";

// Ajustes da reunião de 31/10/2026: sessão por uso, duração por faixa, "Concluir consulta" x "Encerrar atendimento"
// (regra D8), solicitação de exames, retorno e menor de idade com responsável legal (ADR-0006).
const address = { zipCode: "01310-100", street: "Rua A", number: "1", district: "Centro", city: "São Paulo", state: "SP" };

async function firstAccess(email: string, temporary: string): Promise<APIRequestContext> {
  const context = await request.newContext({ baseURL: baseApiURL });
  await loginByApi(context, email, temporary);
  const changed = await context.post("/auth/change-password", { data: { currentPassword: temporary, newPassword: sharedPassword } });
  expect(changed.status()).toBe(204);
  return context;
}

// Médico e paciente próprios do teste, para o horário não colidir com o seed.
async function setup(label: string, modality: "InPerson" | "Online" = "InPerson") {
  const seed = Number(Date.now().toString().slice(-8)) + Math.floor(Math.random() * 1000);
  const temporary = `Tmp${seed}!aA`;
  const admin = await request.newContext({ baseURL: baseApiURL });
  await loginByApi(admin, users.clinicAdmin);

  const doctorEmail = `${label}.medico.${seed}@example.test`;
  const doctorCreated = await admin.post("/doctors", {
    data: { name: "Dra. Encerramento Teste", email: doctorEmail, crm: String((seed % 800000) + 100000), crmUf: "SP", specialty: `Teste ${label}`, temporaryPassword: temporary },
  });
  expect(doctorCreated.status(), await doctorCreated.text()).toBe(201);
  const doctorId = ((await doctorCreated.json()) as { id: string }).id;

  const patientEmail = `${label}.paciente.${seed}@example.test`;
  const patientCreated = await admin.post("/patients", {
    data: { name: "Paciente Encerramento", email: patientEmail, cpf: validCpfFromSeed(seed), birthDate: "1990-05-05", temporaryPassword: temporary, motherName: "Mãe Teste", address },
  });
  expect(patientCreated.status(), await patientCreated.text()).toBe(201);
  const patientId = ((await patientCreated.json()) as { id: string }).id;

  const booked = await admin.post("/appointments", {
    data: { doctorId, patientId, scheduledAt: new Date(Date.now() + 5 * 60_000).toISOString(), durationMinutes: 15, modality, paymentRequired: false },
  });
  expect(booked.status(), await booked.text()).toBe(201);
  const appointmentId = ((await booked.json()) as { id: string }).id;

  return {
    admin,
    doctorId,
    doctorEmail,
    patientEmail,
    appointmentId,
    doctor: await firstAccess(doctorEmail, temporary),
    patient: await firstAccess(patientEmail, temporary),
  };
}

function nextDate(dayIndex: number) {
  const date = new Date(Date.now() - 3 * 3_600_000);
  do date.setUTCDate(date.getUTCDate() + 1);
  while (date.getUTCDay() !== dayIndex);
  return date.toISOString().slice(0, 10);
}

async function openTab(page: Page, name: string) {
  await page.getByRole("tab", { name, exact: true }).click();
}

test.describe("reuniao de 31/10", () => {
  test.skip(!sharedPassword, "defina MEDSYNC_E2E_PASSWORD para executar login E2E");

  test("sessao renova com uso e nao existe sem login", async () => {
    const context = await request.newContext({ baseURL: baseApiURL });
    await loginByApi(context, users.doctor);
    const renewed = await context.post("/auth/refresh");
    expect(renewed.status()).toBe(204);
    expect(renewed.headers()["set-cookie"]).toContain("medsync_session=");
    expect((await context.get("/auth/me")).status()).toBe(200);

    const anonymous = await request.newContext({ baseURL: baseApiURL });
    expect((await anonymous.post("/auth/refresh")).status()).toBe(401);
    await context.dispose();
    await anonymous.dispose();
  });

  test("10 minutos sem uso encerram a sessao sem perder o que foi digitado; com uso ela continua", async ({ page }) => {
    const { admin, doctor, patient, doctorEmail, appointmentId } = await setup("inativo");
    const here = new RegExp(`/prontuario/${appointmentId}`);
    await page.clock.install();
    await loginByUi(page, doctorEmail);
    await page.goto(`/prontuario/${appointmentId}`);
    await page.getByLabel("Evolução e conduta").fill("Texto digitado antes de sair.");

    // Working: each move restarts the count, so 18 minutes in two steps do not end the session.
    await page.clock.fastForward("09:00");
    await expect(page).toHaveURL(here);
    await page.mouse.move(200, 200);
    await page.clock.fastForward("09:00");
    await expect(page).toHaveURL(here);

    await page.clock.fastForward("10:30");
    await expect(page).toHaveURL(/\/login\?motivo=inatividade/);
    await expect(page.getByText(/10 minutos sem uso/)).toBeVisible();

    await page.getByLabel(/e-mail/i).fill(doctorEmail);
    await page.getByRole("textbox", { name: /senha/i }).fill(sharedPassword);
    await page.getByRole("button", { name: /entrar/i }).click();
    await expect(page).toHaveURL(here);
    await expect(page.getByLabel("Evolução e conduta")).toHaveValue("Texto digitado antes de sair.");
    for (const context of [admin, doctor, patient]) await context.dispose();
  });

  test("encerrar atendimento bloqueia toda escrita, com as pendencias antes", async () => {
    const { admin, doctor, patient, appointmentId } = await setup("bloqueio");
    const close = () => doctor.post(`/appointments/${appointmentId}/close`);

    expect((await close()).status(), "antes de concluir").toBe(409);
    expect((await doctor.post(`/consultations/${appointmentId}/end`, { data: { outcome: "Completed" } })).status()).toBe(204);
    expect((await close()).status(), "sem registro clínico").toBe(409);
    expect((await doctor.put(`/appointments/${appointmentId}/clinical-record`, { data: { content: "Evolução do teste." } })).status()).toBe(200);

    const draft = await doctor.post(`/appointments/${appointmentId}/medical-documents`, {
      data: { kind: "Report", title: "Laudo médico", body: "Texto." },
    });
    expect(draft.status(), await draft.text()).toBe(201);
    const draftId = ((await draft.json()) as { id: string }).id;
    const withDraft = await close();
    expect(withDraft.status()).toBe(409);
    expect(await withDraft.text()).toContain("1 documento");
    expect((await doctor.delete(`/medical-documents/${draftId}`)).status()).toBe(204);

    expect((await admin.post(`/appointments/${appointmentId}/close`)).status(), "ADM não encerra").toBe(403);
    const closed = await close();
    expect(closed.status(), await closed.text()).toBe(200);
    expect(((await closed.json()) as { closedAt: string | null }).closedAt).toBeTruthy();
    expect((await close()).status(), "encerrar de novo").toBe(409);

    // Nothing changes anymore, and reading keeps working.
    expect((await doctor.put(`/appointments/${appointmentId}/clinical-record`, { data: { content: "Tentativa." } })).status()).toBe(409);
    expect((await doctor.post(`/appointments/${appointmentId}/medical-documents`, { data: { kind: "Report", title: "Laudo", body: "x" } })).status()).toBe(409);
    expect((await doctor.post(`/appointments/${appointmentId}/prescriptions`, { data: { kind: "Simple", items: [] } })).status()).toBe(409);
    expect((await doctor.put(`/appointments/${appointmentId}/follow-up`, { data: { days: 30 } })).status()).toBe(409);
    expect((await doctor.post(`/consultations/${appointmentId}/end`, { data: { outcome: "NoShow" } })).status()).toBe(409);
    const upload = await patient.post(`/appointments/${appointmentId}/clinical-record/attachments`, {
      multipart: { file: { name: "exame.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n%%EOF") } },
    });
    expect(upload.status()).toBe(409);

    const record = (await (await doctor.get(`/appointments/${appointmentId}/clinical-record`)).json()) as { content: string; version: number };
    expect(record.content).toBe("Evolução do teste.");
    expect(record.version).toBe(1);
    for (const context of [admin, doctor, patient]) await context.dispose();
  });

  test("prontuario: concluir volta para a agenda; encerrar deixa somente leitura", async ({ page }) => {
    const { admin, doctor, patient, doctorEmail, appointmentId } = await setup("tela");
    await loginByUi(page, doctorEmail);
    await page.goto(`/prontuario/${appointmentId}`);

    await page.getByLabel("Evolução e conduta").fill("Registro digitado antes de concluir.");
    await page.getByRole("button", { name: "Concluir consulta" }).click();
    await page.getByRole("button", { name: /Consulta realizada/ }).click();
    await expect(page).toHaveURL(/\/consultas$/);

    await page.goto(`/prontuario/${appointmentId}`);
    await expect(page.getByLabel("Evolução e conduta")).toHaveValue("Registro digitado antes de concluir.");
    await expect(page.getByRole("button", { name: "Concluir consulta" })).toHaveCount(0);

    await page.getByRole("button", { name: "Encerrar atendimento" }).click();
    await expect(page.getByText(/nada desta consulta pode ser alterado/).first()).toBeVisible();
    await page.getByRole("dialog").getByRole("button", { name: "Encerrar atendimento" }).click();
    await expect(page).toHaveURL(/\/consultas$/);

    await page.goto(`/prontuario/${appointmentId}`);
    await expect(page.getByText("Atendimento encerrado", { exact: true }).first()).toBeVisible();
    await expect(page.getByLabel("Evolução e conduta")).toBeDisabled();
    await expect(page.getByRole("button", { name: "Salvar prontuário" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Encerrar atendimento" })).toHaveCount(0);
    await openTab(page, "Receitas");
    await expect(page.getByRole("button", { name: "Nova receita" })).toHaveCount(0);
    await openTab(page, "Exames e retorno");
    await expect(page.getByRole("button", { name: "Nova solicitação" })).toHaveCount(0);
    await expect(page.getByLabel("Precisa de retorno?")).toBeDisabled();
    await openTab(page, "Laudos e declaração");
    await expect(page.getByRole("button", { name: "Novo laudo" })).toHaveCount(0);
    for (const context of [admin, doctor, patient]) await context.dispose();
  });

  test("solicitacao de exames e retorno: medico e paciente veem, recepcao nao", async ({ page }) => {
    const { admin, doctor, patient, doctorEmail, appointmentId } = await setup("exames");
    await loginByUi(page, doctorEmail);
    await page.goto(`/prontuario/${appointmentId}#exames`);

    await page.getByRole("button", { name: "Nova solicitação" }).click();
    await page.getByRole("button", { name: "+ Hemograma completo" }).click();
    await page.getByRole("button", { name: "+ TSH" }).click();
    await expect(page.getByLabel("Exames (um por linha)")).toHaveValue("Hemograma completo\nTSH");
    await page.getByRole("button", { name: "Salvar rascunho" }).click();
    await expect(page.getByText("Solicitação de exames").nth(1)).toBeVisible();

    const documents = (await (await doctor.get(`/appointments/${appointmentId}/medical-documents`)).json()) as {
      documents: Array<{ id: string; kind: string; title: string; body: string }>;
    };
    const exam = documents.documents.find((document) => document.kind === "ExamRequest");
    expect(exam?.title).toBe("Solicitação de exames");
    expect(exam?.body).toBe("Hemograma completo\nTSH");
    expect((await patient.get(`/medical-documents/${exam?.id}/pdf`)).status(), "rascunho não sai para o paciente").toBe(404);
    expect((await doctor.get(`/medical-documents/${exam?.id}/pdf`)).status()).toBe(200);

    await page.getByLabel("Precisa de retorno?").selectOption("30");
    await expect(page.getByText(/Retorno até/)).toBeVisible();

    const followUp = async (context: APIRequestContext) =>
      ((await (await context.get(`/appointments/${appointmentId}`)).json()) as { followUpDays?: number | null }).followUpDays;
    expect(await followUp(doctor)).toBe(30);
    expect(await followUp(patient)).toBe(30);
    expect(await followUp(admin), "conduta não vai para o ADM").toBeNull();
    expect((await doctor.put(`/appointments/${appointmentId}/follow-up`, { data: { days: 0 } })).status()).toBe(400);
    expect((await doctor.put(`/appointments/${appointmentId}/follow-up`, { data: { days: null } })).status()).toBe(200);
    expect(await followUp(patient)).toBeNull();
    for (const context of [admin, doctor, patient]) await context.dispose();
  });

  test("cada faixa tem a propria duracao e a consulta marcada segue a faixa", async ({ page }) => {
    const { admin, doctor, patient, doctorId, doctorEmail } = await setup("duracao", "Online");
    const window = async (dayOfWeek: string, slotMinutes: number) => {
      const created = await doctor.post("/doctors/me/availability", {
        data: { dayOfWeek, startTime: "09:00:00", endTime: "10:00:00", modality: "Online", slotMinutes },
      });
      expect(created.status(), await created.text()).toBe(201);
    };
    await window("Monday", 30);
    await window("Wednesday", 15);
    await window("Friday", 60);
    const invalid = await doctor.post("/doctors/me/availability", {
      data: { dayOfWeek: "Tuesday", startTime: "09:00:00", endTime: "10:00:00", modality: "Online", slotMinutes: 7 },
    });
    expect(invalid.status()).toBe(400);

    const times = async (date: string) =>
      (await (await patient.get(`/doctors/${doctorId}/available-times?date=${date}&modality=Online`)).json()) as Array<{ startsAt: string; durationMinutes: number }>;
    const monday = await times(nextDate(1));
    const wednesday = await times(nextDate(3));
    const friday = await times(nextDate(5));
    expect(monday.map((slot) => slot.durationMinutes)).toEqual([30, 30]);
    expect(wednesday.map((slot) => slot.durationMinutes)).toEqual([15, 15, 15, 15]);
    expect(friday.map((slot) => slot.durationMinutes)).toEqual([60]);

    // The window decides the length, whatever the client sends.
    const requested = await patient.post("/appointments/request", {
      data: { specialty: "Teste duracao", doctorId, scheduledAt: wednesday[0].startsAt, durationMinutes: 15, modality: "Online" },
    });
    expect(requested.status(), await requested.text()).toBe(201);
    expect(((await requested.json()) as { durationMinutes: number }).durationMinutes).toBe(15);
    expect((await times(nextDate(3))).length).toBe(3);

    await loginByUi(page, doctorEmail);
    await page.goto("/consultas/horarios");
    await expect(page.getByLabel("Quarta").getByText(/15 min/)).toBeVisible();
    await page.getByLabel("Quinta").getByRole("button", { name: "Adicionar faixa" }).click();
    await page.getByLabel("Duração da consulta").selectOption("45");
    await page.getByRole("button", { name: "Salvar faixa" }).click();
    await expect(page.getByLabel("Quinta").getByText(/45 min/)).toBeVisible();
    for (const context of [admin, doctor, patient]) await context.dispose();
  });

  test("menor sem CPF entra com responsavel, na conta dele", async ({ page }) => {
    const seed = Number(Date.now().toString().slice(-8));
    const temporary = `Tmp${seed}!aA`;
    const admin = await request.newContext({ baseURL: baseApiURL });
    await loginByApi(admin, users.clinicAdmin);
    const email = `responsavel.${seed}@example.test`;
    const guardianCpf = validCpfFromSeed(seed);
    const guardian = { name: "Ana Responsável", cpf: guardianCpf, relationship: "Mãe" };
    const person = { email, temporaryPassword: temporary, motherName: "Ana Responsável", address };

    expect((await admin.post("/patients", { data: { ...person, name: "Adulto Sem Cpf", birthDate: "1990-01-01" } })).status(), "adulto precisa de CPF").toBe(400);
    expect((await admin.post("/patients", { data: { ...person, name: "Criança Sem Responsável", birthDate: "2019-01-01" } })).status(), "menor precisa de responsável").toBe(400);
    expect(
      (await admin.post("/patients", { data: { ...person, name: "Criança Vínculo", birthDate: "2019-01-01", guardian: { ...guardian, relationship: "Vizinha" } } })).status(),
      "vínculo fora da lista",
    ).toBe(400);

    const first = await admin.post("/patients", { data: { ...person, name: "Bia Teste", birthDate: "2019-01-01", guardian } });
    expect(first.status(), await first.text()).toBe(201);
    const created = (await first.json()) as { id: string; cpfMasked: string; guardianName: string };
    expect(created.cpfMasked).toBe("Não possui");
    expect(created.guardianName).toBe("Ana Responsável");
    const second = await admin.post("/patients", { data: { ...person, name: "Caio Teste", birthDate: "2021-02-02", guardian } });
    expect(second.status(), await second.text()).toBe(201);
    expect((await admin.post("/patients", { data: { ...person, name: "Bia Teste", birthDate: "2019-01-01", guardian } })).status(), "repetido").toBe(409);

    const reception = await request.newContext({ baseURL: baseApiURL });
    await loginByApi(reception, users.receptionist);
    const byGuardian = (await (await reception.get(`/patients?cpf=${guardianCpf}`)).json()) as Array<{ name: string }>;
    expect(byGuardian.map((item) => item.name).sort()).toEqual(["Bia Teste", "Caio Teste"]);

    const account = await firstAccess(email, temporary);
    expect((await (await account.get("/auth/me")).json()).name).toBe("Ana Responsável");
    const own = (await (await account.get("/patients")).json()) as Array<{ id: string; guardianName: string }>;
    expect(own).toHaveLength(2);
    expect((await account.get("/profile")).status(), "conta do responsável abre o perfil").toBeLessThan(500);

    // Na lista do responsável, cada consulta diz de quem é.
    const pediatrician = await admin.post("/doctors", {
      data: { name: "Dra. Pediatria Teste", email: `pediatra.${seed}@example.test`, crm: String((seed % 800000) + 100000), crmUf: "SP", specialty: "Pediatria teste", temporaryPassword: temporary },
    });
    expect(pediatrician.status(), await pediatrician.text()).toBe(201);
    const booked = await admin.post("/appointments", {
      data: { doctorId: ((await pediatrician.json()) as { id: string }).id, patientId: created.id, scheduledAt: new Date(Date.now() + 26 * 3_600_000).toISOString(), durationMinutes: 30, modality: "Online", paymentRequired: false },
    });
    expect(booked.status(), await booked.text()).toBe(201);
    await loginByUi(page, email);
    await page.goto("/consultas");
    await expect(page.getByText("Paciente: Bia Teste")).toBeVisible();
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());

    // A ficha do cadastro pede o responsável conforme a idade.
    await loginByUi(page, users.clinicAdmin);
    await page.goto("/patients?novo=1");
    await expect(page.getByText("Responsável legal", { exact: true })).toHaveCount(0);
    await page.getByLabel("Data de nascimento").fill("2020-06-01");
    await expect(page.getByText("Responsável legal", { exact: true })).toBeVisible();
    await expect(page.getByLabel("CPF (se tiver)")).toBeVisible();
    for (const context of [admin, reception, account]) await context.dispose();
  });
});
