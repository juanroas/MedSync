import { expect, request, test, type APIRequestContext } from "@playwright/test";
import { baseApiURL, loginByApi, loginByUi, sharedPassword, users, validCpfFromSeed } from "./fixtures";

// Testes de 06/11/2026: encerrar antes de iniciar a próxima, consulta não realizada não recebe registro, online só nos
// horários do médico (encaixe só presencial), senha temporária fácil para paciente e envio do documento por WhatsApp.
const address = { zipCode: "01310-100", street: "Rua A", number: "1", district: "Centro", city: "São Paulo", state: "SP" };

async function firstAccess(email: string, temporary: string): Promise<APIRequestContext> {
  const context = await request.newContext({ baseURL: baseApiURL });
  await loginByApi(context, email, temporary);
  expect((await context.post("/auth/change-password", { data: { currentPassword: temporary, newPassword: sharedPassword } })).status()).toBe(204);
  return context;
}

// A doctor and a patient of their own, so the times never collide with the test data.
async function doctorAndPatient(label: string) {
  const seed = Number(Date.now().toString().slice(-8)) + Math.floor(Math.random() * 1000);
  const temporary = `Tmp${seed}!aA`;
  const admin = await request.newContext({ baseURL: baseApiURL });
  await loginByApi(admin, users.clinicAdmin);
  const doctorEmail = `${label}.medico.${seed}@example.test`;
  const doctorCreated = await admin.post("/doctors", {
    data: { name: "Dr. Trava Teste", email: doctorEmail, crm: String((seed % 800000) + 100000), crmUf: "SP", specialty: `Teste ${label}`, temporaryPassword: temporary },
  });
  expect(doctorCreated.status(), await doctorCreated.text()).toBe(201);
  const patientCreated = await admin.post("/patients", {
    data: { name: "Paciente Trava", email: `${label}.paciente.${seed}@example.test`, cpf: validCpfFromSeed(seed), birthDate: "1990-05-05", temporaryPassword: temporary, motherName: "Mãe Teste", address },
  });
  expect(patientCreated.status(), await patientCreated.text()).toBe(201);
  return {
    admin,
    doctorEmail,
    doctorId: ((await doctorCreated.json()) as { id: string }).id,
    patientId: ((await patientCreated.json()) as { id: string }).id,
    doctor: await firstAccess(doctorEmail, temporary),
  };
}

async function book(admin: APIRequestContext, doctorId: string, patientId: string, minutesFromNow: number, modality: "InPerson" | "Online" = "InPerson") {
  return admin.post("/appointments", {
    data: { doctorId, patientId, scheduledAt: new Date(Date.now() + minutesFromNow * 60_000).toISOString(), durationMinutes: 10, modality, paymentRequired: false },
  });
}

test.describe("reuniao de 06/11", () => {
  test.skip(!sharedPassword, "defina MEDSYNC_E2E_PASSWORD para executar login E2E");

  test("so inicia a proxima consulta depois de encerrar a anterior", async ({ page }) => {
    const { admin, doctor, doctorId, patientId, doctorEmail } = await doctorAndPatient("trava");
    // In person, concluded from 15 minutes before the time: both are concludable now.
    const first = ((await (await book(admin, doctorId, patientId, 1)).json()) as { id: string }).id;
    const second = ((await (await book(admin, doctorId, patientId, 12)).json()) as { id: string }).id;

    expect((await doctor.post(`/consultations/${first}/end`, { data: { outcome: "Completed" } })).status()).toBe(204);
    const locked = await doctor.post(`/consultations/${second}/end`, { data: { outcome: "Completed" } });
    expect(locked.status()).toBe(409);
    const body = (await locked.json()) as { code: string; message: string; appointmentId: string };
    expect(body.code).toBe("pending_closure");
    expect(body.message).toContain("Paciente Trava");
    expect(body.appointmentId).toBe(first);

    await loginByUi(page, doctorEmail);
    await page.getByRole("navigation").getByRole("link", { name: "Agenda", exact: true }).click();
    await expect(page.getByText(/Falta encerrar o atendimento de Paciente Trava/)).toBeVisible();
    await expect(page.getByRole("tab", { name: /A atender \(2\)/ })).toBeVisible();

    expect((await doctor.put(`/appointments/${first}/clinical-record`, { data: { content: "Atendido." } })).status()).toBe(200);
    expect((await doctor.post(`/appointments/${first}/close`)).status()).toBe(200);
    expect((await doctor.post(`/consultations/${second}/end`, { data: { outcome: "Completed" } })).status()).toBe(204);

    await page.reload();
    await page.getByRole("tab", { name: /Finalizadas \(1\)/ }).click();
    await expect(page.getByText("Atendimento encerrado").first()).toBeVisible();
    for (const context of [admin, doctor]) await context.dispose();
  });

  test("consulta cancelada ou sem comparecimento nao recebe registro clinico", async ({ page }) => {
    const { admin, doctor, doctorId, patientId, doctorEmail } = await doctorAndPatient("naorealizada");
    const noShow = ((await (await book(admin, doctorId, patientId, 5)).json()) as { id: string }).id;
    const cancelled = ((await (await book(admin, doctorId, patientId, 120)).json()) as { id: string }).id;
    expect((await doctor.post(`/consultations/${noShow}/end`, { data: { outcome: "NoShow" } })).status()).toBe(204);
    expect((await admin.post(`/appointments/${cancelled}/cancel`, { data: { reason: "Teste" } })).status()).toBe(200);

    for (const id of [noShow, cancelled]) {
      const record = await doctor.put(`/appointments/${id}/clinical-record`, { data: { content: "Não deveria." } });
      expect(record.status(), id).toBe(409);
      expect((await doctor.post(`/appointments/${id}/medical-documents`, { data: { kind: "Report", title: "Laudo", body: "x" } })).status()).toBe(409);
      expect((await doctor.put(`/appointments/${id}/follow-up`, { data: { days: 30 } })).status()).toBe(409);
    }

    await loginByUi(page, doctorEmail);
    await page.goto(`/prontuario/${noShow}`);
    await expect(page.getByText(/não compareceu: não há atendimento para registrar/)).toBeVisible();
    await expect(page.getByLabel("Evolução e conduta")).toBeDisabled();
    await expect(page.getByRole("button", { name: "Salvar prontuário" })).toHaveCount(0);
    for (const context of [admin, doctor]) await context.dispose();
  });

  test("online so nos horarios do medico; presencial a recepcao encaixa", async () => {
    const { admin, doctor, doctorId, patientId } = await doctorAndPatient("encaixe");
    const outside = await book(admin, doctorId, patientId, 60, "Online");
    expect(outside.status()).toBe(409);
    expect(await outside.text()).toContain("Consulta online só nos horários de atendimento online do médico");
    expect((await book(admin, doctorId, patientId, 60, "InPerson")).status(), "encaixe presencial").toBe(201);

    // With the doctor's own online hours, the front desk books inside them.
    const tomorrow = new Date(Date.now() - 3 * 3_600_000 + 24 * 3_600_000);
    const weekday = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][tomorrow.getUTCDay()];
    expect((await doctor.post("/doctors/me/availability", { data: { dayOfWeek: weekday, startTime: "10:00:00", endTime: "12:00:00", modality: "Online" } })).status()).toBe(201);
    const inside = await admin.post("/appointments", {
      data: { doctorId, patientId, scheduledAt: `${tomorrow.toISOString().slice(0, 10)}T13:30:00Z`, durationMinutes: 30, modality: "Online", paymentRequired: false },
    });
    expect(inside.status(), await inside.text()).toBe(201);
    const days = (await (await admin.get(`/doctors/${doctorId}/available-days?modality=Online`)).json()) as { restricted: boolean };
    expect(days.restricted, "sem encaixe online").toBe(true);
    for (const context of [admin, doctor]) await context.dispose();
  });

  test("senha temporaria facil so para paciente", async () => {
    const seed = Number(Date.now().toString().slice(-8));
    const admin = await request.newContext({ baseURL: baseApiURL });
    await loginByApi(admin, users.clinicAdmin);
    const patient = await admin.post("/patients", {
      data: { name: "Paciente Senha", email: `senha.${seed}@example.test`, cpf: validCpfFromSeed(seed), birthDate: "1990-05-05", temporaryPassword: "123456", motherName: "Mãe", address },
    });
    expect(patient.status(), await patient.text()).toBe(201);
    const login = await request.newContext({ baseURL: baseApiURL });
    const session = (await loginByApi(login, `senha.${seed}@example.test`, "123456")) as { user: { mustChangePassword: boolean } };
    expect(session.user.mustChangePassword, "troca no primeiro acesso").toBe(true);

    const doctor = await admin.post("/doctors", {
      data: { name: "Dr. Senha", email: `senha.medico.${seed}@example.test`, crm: String((seed % 800000) + 100000), crmUf: "SP", specialty: "Teste", temporaryPassword: "123456" },
    });
    expect(doctor.status(), "médico segue com senha forte").toBe(400);
    await admin.dispose();
    await login.dispose();
  });

  test("documento assinado vai por WhatsApp como link que pede login", async ({ page }) => {
    const marina = await request.newContext({ baseURL: baseApiURL });
    await loginByApi(marina, users.doctor);
    const history = ((await (await marina.get("/appointments")).json()) as Array<{ id: string; patientName: string; closedAt?: string | null }>)
      .find((item) => item.patientName === "Carlos Oliveira" && item.closedAt);
    expect(history, "consulta encerrada do Carlos na massa").toBeTruthy();

    await loginByUi(page, users.doctor);
    await page.goto(`/prontuario/${history!.id}#documentos`);
    const popup = page.waitForEvent("popup");
    await page.getByRole("button", { name: "Enviar por WhatsApp" }).first().click();
    // WhatsApp may redirect wa.me to api.whatsapp.com, which writes spaces as "+".
    const url = decodeURIComponent((await popup).url().replace(/\+/g, " "));
    expect(url).toMatch(/^https:\/\/(wa\.me|api\.whatsapp\.com)\//);
    expect(url).toContain("/documento/");
    expect(url).toContain("entre com a sua conta");
    expect(url).not.toContain("Laudo");
    await marina.dispose();
  });
});
