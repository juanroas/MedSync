import { expect, request, test } from "@playwright/test";
import { baseApiURL, loginByApi, loginByUi, sharedPassword, users } from "./fixtures";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

test.describe("recepcao agenda pelo paciente", () => {
  test.skip(!sharedPassword, "defina MEDSYNC_E2E_PASSWORD para executar login E2E");

  test("ADM da clinica busca por CPF e marca consulta presencial num horario livre", async ({ page }) => {
    // Amanhã (Brasília) a Dra. Marina atende presencialmente das 10:00 às 12:00 (faixa própria deste spec).
    const tomorrow = new Date(Date.now() - 3 * 3600_000 + 24 * 3600_000);
    const doctor = await request.newContext({ baseURL: baseApiURL });
    await loginByApi(doctor, users.doctor);
    const created = await doctor.post("/doctors/me/availability", {
      data: { dayOfWeek: WEEKDAYS[tomorrow.getUTCDay()], startTime: "10:00:00", endTime: "12:00:00", modality: "InPerson" },
    });
    expect(created.status()).toBeLessThan(400);
    const window = (await created.json()) as { id: string };
    let appointmentId = "";

    try {
      await loginByUi(page, users.clinicAdmin);
      await page.goto("/consultas/nova");
      await expect(page.getByRole("link", { name: "Cadastrar pessoa" })).toHaveAttribute("href", /\/patients\?novo=1/);

      await page.getByLabel("Buscar paciente por CPF ou nome").fill("123.456.789-09");
      await page.getByRole("button", { name: /Carlos Oliveira/ }).click();
      await expect(page.getByTestId("selected-patient")).toContainText("Carlos Oliveira");
      await expect(page.getByTestId("selected-patient")).toContainText("mãe:");

      // Other specs create doctors in parallel; pick Dra. Marina instead of relying on the first one in the list.
      await page.getByRole("combobox", { name: "Médico" }).selectOption({ label: "Dra. Marina Costa — Clínica geral" });
      await expect(page.getByRole("button", { name: "Presencial" })).toHaveAttribute("aria-pressed", "true");
      const calendar = page.getByRole("grid", { name: /dias disponíveis/i });
      await calendar.getByRole("button", { name: `${tomorrow.getUTCDate()}, com horários` }).click();
      await page.getByRole("button", { name: "11:00" }).click();
      await expect(page.getByTestId("booking-summary")).toContainText("às 11:00");

      const booked = page.waitForResponse((response) => response.url().endsWith("/appointments") && response.request().method() === "POST");
      await page.getByRole("button", { name: /confirmar agendamento/i }).click();
      const response = await booked;
      expect(response.status()).toBe(201);
      const appointment = (await response.json()) as { id: string; modality: string; patientName: string };
      appointmentId = appointment.id;
      expect(appointment.modality).toBe("InPerson");
      expect(appointment.patientName).toBe("Carlos Oliveira");
      await expect(page).toHaveURL(/\/consultas$/);
    } finally {
      if (appointmentId) {
        const cancelled = await doctor.post(`/appointments/${appointmentId}/cancel`, { data: { reason: "Limpeza do teste E2E" } });
        expect(cancelled.status()).toBeLessThan(400);
      }
      await doctor.delete(`/doctors/me/availability/${window.id}`);
      await doctor.dispose();
    }
  });
});

test.describe("encaixe respeita a folga do medico", () => {
  test.skip(!sharedPassword, "defina MEDSYNC_E2E_PASSWORD para executar login E2E");

  test("recepcao nao encaixa consulta num dia que o medico bloqueou", async () => {
    // Dia bloqueado só por este teste (o spec da agenda usa outro dia).
    const blocked = new Date(Date.now() - 3 * 3600_000 + 47 * 24 * 3600_000).toISOString().slice(0, 10);
    const doctor = await request.newContext({ baseURL: baseApiURL });
    const reception = await request.newContext({ baseURL: baseApiURL });
    await loginByApi(doctor, users.doctor);
    await loginByApi(reception, users.receptionist);
    const created = await doctor.post("/doctors/me/time-off", { data: { startDate: blocked, endDate: blocked, reason: "Folga E2E" } });
    expect(created.status()).toBeLessThan(400);
    const timeOff = (await created.json()) as { id: string };

    try {
      const patients = (await (await reception.get("/patients")).json()) as Array<{ id: string; email: string }>;
      const doctors = (await (await reception.get("/doctors")).json()) as Array<{ id: string; email: string }>;
      const fitIn = await reception.post("/appointments", {
        data: {
          doctorId: doctors.find((item) => item.email === users.doctor)!.id,
          patientId: patients.find((item) => item.email === users.patient)!.id,
          scheduledAt: new Date(`${blocked}T10:00:00-03:00`).toISOString(),
          durationMinutes: 30,
          modality: "Online",
          paymentRequired: false,
        },
      });
      expect(fitIn.status()).toBe(409);
      expect(((await fitIn.json()) as { message: string }).message).toContain("folga");
    } finally {
      await doctor.delete(`/doctors/me/time-off/${timeOff.id}`);
      await doctor.dispose();
      await reception.dispose();
    }
  });
});
