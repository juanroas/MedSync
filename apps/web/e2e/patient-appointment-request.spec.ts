import { expect, request, test } from "@playwright/test";
import { baseApiURL, loginByApi, loginByUi, sharedPassword, users } from "./fixtures";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

test.describe("solicitacao de consulta por paciente", () => {
  test.skip(!sharedPassword, "defina MEDSYNC_E2E_PASSWORD para executar login E2E");

  test("paciente so marca dentro dos horarios que o medico abriu; sem horarios o medico nem aparece", async ({ page }) => {
    // Clínica Alfa: o Dr. Rafael Lima começa sem nenhuma faixa de horário.
    const patientApi = await request.newContext({ baseURL: baseApiURL });
    await loginByApi(patientApi, users.clinic2Patient);
    const before = (await (await patientApi.get("/care/specialties")).json()) as Array<{ doctors: Array<{ id: string; name: string }> }>;
    expect(before.flatMap((item) => item.doctors.map((doctor) => doctor.name))).not.toContain("Dr. Rafael Lima");
    const tomorrow = new Date(Date.now() - 3 * 3600_000 + 24 * 3600_000);
    const key = tomorrow.toISOString().slice(0, 10);
    const blocked = await patientApi.post("/appointments/request", {
      data: {
        specialty: "Clínica geral",
        doctorId: "11000000-0000-0000-0000-000000000001",
        scheduledAt: new Date(`${key}T07:00:00-03:00`).toISOString(),
        durationMinutes: 30,
        modality: "Online",
      },
    });
    expect(blocked.status()).toBe(409);

    // O médico abre uma faixa online amanhã; agora o paciente marca pelo calendário.
    const doctorApi = await request.newContext({ baseURL: baseApiURL });
    await loginByApi(doctorApi, users.clinic2Doctor);
    const created = await doctorApi.post("/doctors/me/availability", {
      data: { dayOfWeek: WEEKDAYS[tomorrow.getUTCDay()], startTime: "07:00:00", endTime: "08:00:00", modality: "Online" },
    });
    expect(created.status()).toBeLessThan(400);
    const window = (await created.json()) as { id: string };
    let appointmentId = "";

    try {
      await loginByUi(page, users.clinic2Patient);
      await page.getByRole("link", { name: /minhas consultas/i }).click();
      await expect(page.getByRole("heading", { name: /minhas consultas/i })).toBeVisible();
      await page.getByRole("link", { name: "Solicitar consulta", exact: true }).click();
      await expect(page.getByRole("heading", { name: /solicitar consulta/i })).toBeVisible();
      await expect(page.getByLabel(/especialidade ou [aá]rea/i)).toContainText(/cl[ií]nica geral/i);
      await expect(page.getByLabel(/data e hor[aá]rio/i)).toHaveCount(0);

      const calendar = page.getByRole("grid", { name: /dias disponíveis/i });
      await calendar.getByRole("button", { name: `${tomorrow.getUTCDate()}, com horários` }).click();
      await page.getByRole("button", { name: "07:00", exact: true }).click();
      await page.getByLabel(/observa[cç][aã]o para o atendimento/i).fill("Solicitacao de homologacao dentro da faixa.");
      const requestDone = page.waitForResponse((response) => response.url().endsWith("/appointments/request"));
      await page.getByRole("button", { name: /solicitar consulta/i }).click();
      const response = await requestDone;
      expect(response.status()).toBe(201);
      appointmentId = ((await response.json()) as { id: string }).id;
      await expect(page).toHaveURL(/\/consultas$/);
    } finally {
      if (appointmentId) await patientApi.post(`/appointments/${appointmentId}/cancel`, { data: { reason: "Limpeza do teste E2E" } });
      await doctorApi.delete(`/doctors/me/availability/${window.id}`);
      await Promise.all([patientApi.dispose(), doctorApi.dispose()]);
    }
  });

  test("api bloqueia solicitacao sem especialidade disponivel", async ({ request }) => {
    await loginByApi(request, users.clinic2Patient);
    const response = await request.post(`${baseApiURL}/appointments/request`, {
      data: {
        specialty: "Especialidade inexistente",
        scheduledAt: new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString(),
        durationMinutes: 30,
      },
    });

    expect(response.status()).toBe(409);
  });
});
