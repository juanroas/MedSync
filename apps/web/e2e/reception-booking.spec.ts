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
