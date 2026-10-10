import { expect, request, test } from "@playwright/test";
import { baseApiURL, loginByApi, loginByUi, sharedPassword, users } from "./fixtures";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

test.describe("consulta presencial", () => {
  test.skip(!sharedPassword, "defina MEDSYNC_E2E_PASSWORD para executar login E2E");

  test("paciente escolhe presencial, ve o endereco da clinica e a consulta nao abre sala de video", async ({ page }) => {
    // Amanhã (Brasília) a Dra. Marina atende presencialmente das 08:00 às 10:00.
    const tomorrow = new Date(Date.now() - 3 * 3600_000 + 24 * 3600_000);
    const day = tomorrow.getUTCDate();
    const doctor = await request.newContext({ baseURL: baseApiURL });
    await loginByApi(doctor, users.doctor);
    const created = await doctor.post("/doctors/me/availability", {
      data: { dayOfWeek: WEEKDAYS[tomorrow.getUTCDay()], startTime: "08:00:00", endTime: "10:00:00", modality: "InPerson" },
    });
    expect(created.status()).toBeLessThan(400);
    const window = (await created.json()) as { id: string };
    let appointmentId = "";

    try {
      await loginByUi(page, users.patient);
      await page.goto("/consultas/nova");
      await page.getByRole("button", { name: "Presencial" }).click();
      await page.getByLabel(/m[eé]dico dispon[ií]vel/i).selectOption({ label: "Dra. Marina Costa" });

      const location = page.getByTestId("doctor-location");
      await expect(location).toContainText("Clínica Demo");
      await expect(location).toContainText("Avenida Paulista, 1000");
      await expect(location.getByRole("link", { name: "Ver no mapa" })).toHaveAttribute("href", /google\.com\/maps/);

      const calendar = page.getByRole("grid", { name: /dias disponíveis/i });
      await calendar.getByRole("button", { name: `${day}, com horários` }).click();
      await page.getByRole("button", { name: "08:30" }).click();

      const requestDone = page.waitForResponse((response) => response.url().endsWith("/appointments/request"));
      await page.getByRole("button", { name: /solicitar consulta/i }).click();
      const response = await requestDone;
      expect(response.status()).toBe(201);
      const appointment = (await response.json()) as { id: string; modality: string; location: string };
      appointmentId = appointment.id;
      expect(appointment.modality).toBe("InPerson");
      expect(appointment.location).toContain("Avenida Paulista");

      await expect(page).toHaveURL(/\/consultas$/);
      await expect(page.getByText(/Presencial · Clínica Demo/).first()).toBeVisible();

      // Presencial não tem sala de vídeo.
      const start = await doctor.post(`/consultations/${appointmentId}/start`);
      expect(start.status()).toBe(409);
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
