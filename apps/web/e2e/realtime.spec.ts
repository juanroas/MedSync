import { expect, request, test } from "@playwright/test";
import { baseApiURL, loginByApi, loginByUi, sharedPassword, users } from "./fixtures";

// ADR-0004: the doctor's agenda follows changes made by someone else, without reloading the page.
test.describe("atualizacao em tempo real", () => {
  test.skip(!sharedPassword, "defina MEDSYNC_E2E_PASSWORD para executar login E2E");
  test.skip(!process.env.MEDSYNC_E2E_REALTIME, "defina MEDSYNC_E2E_REALTIME=1 com NEXT_PUBLIC_REALTIME_URL no build");

  test("agenda da medica mostra consulta marcada e cancelada pela clinica sem recarregar", async ({ page }) => {
    // MEDSYNC_E2E_SECOND_API_URL: act through another API instance; the push has to cross the Redis backplane.
    const admin = await request.newContext({ baseURL: process.env.MEDSYNC_E2E_SECOND_API_URL ?? baseApiURL });
    await loginByApi(admin, users.clinicAdmin);
    const doctors = (await (await admin.get("/doctors")).json()) as Array<{ id: string; email: string }>;
    const patients = (await (await admin.get("/patients")).json()) as Array<{ id: string; email: string }>;
    const doctorId = doctors.find((item) => item.email === users.doctor)!.id;
    const patientId = patients.find((item) => item.email === users.patient)!.id;

    await loginByUi(page, users.doctor);
    await page.goto("/consultas");
    await expect(page.getByText("Horários de atendimento", { exact: true })).toBeVisible();
    await page.evaluate(() => ((window as unknown as { __noReload: boolean }).__noReload = true));

    // First free quarter-hour today, from 20 minutes ahead (the seed may already hold some times).
    const todayKey = (date: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(date);
    let scheduledAt = new Date();
    let created;
    for (let minutes = 20; minutes < 6 * 60; minutes += 15) {
      scheduledAt = new Date(Date.now() + minutes * 60_000);
      scheduledAt.setSeconds(0, 0);
      test.skip(todayKey(scheduledAt) !== todayKey(new Date()), "sem horario livre hoje para o teste");
      created = await admin.post("/appointments", {
        data: { doctorId, patientId, scheduledAt: scheduledAt.toISOString(), durationMinutes: 15, paymentRequired: false, notes: "tempo real" },
      });
      if (created.status() !== 409) break;
    }
    expect(created!.status(), await created!.text()).toBeLessThan(400);
    const appointment = (await created!.json()) as { id: string };
    const label = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" }).format(scheduledAt);
    const row = page.locator("li").filter({ hasText: label }).filter({ hasText: "15 min" });

    await expect(row).toBeVisible({ timeout: 10_000 });

    const cancelled = await admin.post(`/appointments/${appointment.id}/cancel`, { data: { reason: "Teste de tempo real" } });
    expect(cancelled.status(), await cancelled.text()).toBeLessThan(400);
    await expect(row).toHaveCount(0, { timeout: 10_000 });
    await expect(page.getByRole("button", { name: /mostrar canceladas/i })).toBeVisible();

    // Same document all along: nothing reloaded the page.
    expect(await page.evaluate(() => (window as unknown as { __noReload?: boolean }).__noReload)).toBe(true);
    await admin.dispose();
  });
});
