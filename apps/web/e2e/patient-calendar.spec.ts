import { expect, request, test } from "@playwright/test";
import { baseApiURL, loginByApi, loginByUi, sharedPassword, users } from "./fixtures";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

test.describe("calendario de solicitacao de consulta", () => {
  test.skip(!sharedPassword, "defina MEDSYNC_E2E_PASSWORD para executar login E2E");

  test("so os dias com horario livre do medico podem ser escolhidos", async ({ page }) => {
    // Amanhã (horário de Brasília) ganha uma janela de atendimento da Dra. Marina.
    const tomorrow = new Date(Date.now() - 3 * 3600_000 + 24 * 3600_000);
    const tomorrowKey = tomorrow.toISOString().slice(0, 10);
    const doctor = await request.newContext({ baseURL: baseApiURL });
    await loginByApi(doctor, users.doctor);
    const created = await doctor.post("/doctors/me/availability", {
      data: { dayOfWeek: WEEKDAYS[tomorrow.getUTCDay()], startTime: "08:00:00", endTime: "18:00:00" },
    });
    expect(created.status()).toBeLessThan(400);
    const slot = (await created.json()) as { id: string };

    try {
      await loginByUi(page, users.patient);
      await page.goto("/consultas/nova");
      await page.getByLabel(/m[eé]dico dispon[ií]vel/i).selectOption({ label: "Dra. Marina Costa (agenda fixa)" });

      const calendar = page.getByRole("grid", { name: /dias disponíveis/i });
      await expect(calendar).toBeVisible();
      const day = Number(tomorrowKey.slice(8));
      await expect(calendar.getByRole("button", { name: `${day}, com horários` })).toBeEnabled();
      // Um dia de outra semana no mesmo dia da semana também abre; o dia seguinte a amanhã não.
      await expect(calendar.getByRole("button", { name: /sem horários/ }).first()).toBeDisabled();

      await calendar.getByRole("button", { name: `${day}, com horários` }).click();
      await expect(page.getByRole("button", { name: "08:00" })).toBeVisible();
      await page.getByRole("button", { name: "08:30" }).click();
      await expect(page.getByRole("button", { name: "08:30" })).toHaveClass(/bg-teal-600/);
    } finally {
      await doctor.delete(`/doctors/me/availability/${slot.id}`);
      await doctor.dispose();
    }
  });
});
