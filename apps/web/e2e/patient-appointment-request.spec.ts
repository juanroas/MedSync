import { expect, test } from "@playwright/test";
import { baseApiURL, loginByApi, loginByUi, sharedPassword, users } from "./fixtures";

function futureLocalDateTime() {
  const scheduled = new Date(Date.now() + 26 * 60 * 60 * 1000 + Math.floor(Math.random() * 90) * 60 * 1000);
  return new Date(scheduled.getTime() - scheduled.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}

test.describe("solicitacao de consulta por paciente", () => {
  test.skip(!sharedPassword, "defina MEDSYNC_E2E_PASSWORD para executar login E2E");

  test("paciente empresa2 solicita consulta por especialidade disponivel", async ({ page }) => {
    await loginByUi(page, users.company2Patient);
    await page.getByRole("link", { name: /minhas consultas/i }).click();

    await expect(page.getByRole("heading", { name: /minhas consultas/i })).toBeVisible();
    await page.getByRole("link", { name: "Solicitar consulta", exact: true }).click();

    await expect(page.getByRole("heading", { name: /solicitar consulta/i })).toBeVisible();
    await expect(page.getByLabel(/especialidade ou area/i)).toContainText(/clinica geral/i);
    await page.getByLabel(/data e horario/i).fill(futureLocalDateTime());
    await page.getByLabel(/observacao para o atendimento/i).fill("Solicitacao de homologacao por especialidade.");
    await page.getByRole("button", { name: /solicitar consulta/i }).click();

    await expect(page).toHaveURL(/\/consultas$/);
    await expect(page.getByText(/clinica geral/i).first()).toBeVisible();
  });

  test("api bloqueia solicitacao sem especialidade disponivel", async ({ request }) => {
    await loginByApi(request, users.company2Patient);
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
