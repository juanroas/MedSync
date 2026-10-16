import { expect, request, test } from "@playwright/test";
import { baseApiURL, loginByApi, loginByUi, sharedPassword, users } from "./fixtures";

function brazilDatePlus(days: number) {
  const date = new Date(Date.now() - 3 * 60 * 60 * 1000);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

test.describe("agenda do medico", () => {
  test.skip(!sharedPassword, "defina MEDSYNC_E2E_PASSWORD para executar login E2E");

  test("abre no dia de hoje e alterna entre mes, semana e dia", async ({ page }) => {
    await loginByUi(page, users.doctor);
    await page.getByRole("link", { name: /^agenda$/i }).click();

    await expect(page.getByRole("heading", { name: /^agenda$/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Dia" })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByText("Horários de atendimento", { exact: true })).toBeVisible();

    await page.getByRole("tab", { name: "Semana" }).click();
    const columns = page.locator("section[aria-label]");
    await expect(columns).toHaveCount(7);
    await expect(columns.first()).toContainText("Segunda");
    await page.getByRole("button", { name: /próxima semana/i }).click();
    await page.getByRole("button", { name: /^hoje$/i }).click();

    // Mês: grade completa de semanas; clicar num dia abre a visão Dia.
    await page.getByRole("tab", { name: "Mês" }).click();
    const cells = page.getByRole("button", { name: /consulta\(s\)/ });
    expect(await cells.count()).toBeGreaterThanOrEqual(35);
    await page.getByRole("button", { name: /próximo mês/i }).click();
    await page.getByRole("button", { name: /mês anterior/i }).click();
    await cells.nth(10).click();
    await expect(page.getByRole("tab", { name: "Dia" })).toHaveAttribute("aria-selected", "true");
  });

  test("horarios de atendimento: faixa presencial, regras e folga", async ({ page }) => {
    // Own doctor: other specs book with Dra. Marina in parallel, and this test changes the weekly windows and rules.
    const seed = Date.now().toString().slice(-6);
    const email = `agenda.${seed}@example.test`;
    const admin = await request.newContext({ baseURL: baseApiURL });
    await loginByApi(admin, users.clinicAdmin);
    const created = await admin.post("/doctors", {
      data: { name: `Dra. Agenda ${seed}`, email, crm: `8${seed}`, crmUf: "SP", specialty: "Clínica geral", temporaryPassword: "Temporaria123!" },
    });
    expect(created.status(), await created.text()).toBeLessThan(400);
    const doctorApi = await request.newContext({ baseURL: baseApiURL });
    await doctorApi.post("/auth/login", { data: { email, password: "Temporaria123!" } });
    const changed = await doctorApi.post("/auth/change-password", { data: { currentPassword: "Temporaria123!", newPassword: sharedPassword } });
    expect(changed.status(), await changed.text()).toBeLessThan(400);
    await Promise.all([admin.dispose(), doctorApi.dispose()]);

    await loginByUi(page, email);
    await page.getByRole("link", { name: /^agenda$/i }).click();
    await page.getByRole("link", { name: /horários de atendimento/i }).click();
    await expect(page.getByRole("heading", { name: /horários de atendimento/i })).toBeVisible();

    // Faixa presencial no sábado aparece na semana-padrão e na grade da agenda.
    const saturday = page.getByRole("listitem", { name: "Sábado" });
    await saturday.getByRole("button", { name: /adicionar faixa/i }).click();
    await saturday.getByLabel("Início").fill("07:00");
    await saturday.getByLabel("Fim").fill("07:30");
    await saturday.getByRole("button", { name: "Presencial" }).click();
    await saturday.getByRole("button", { name: /salvar faixa/i }).click();
    await expect(saturday).toContainText("07:00–07:30 · Presencial");

    // Regras: muda a duração e volta para 30 minutos.
    await page.getByRole("button", { name: "20 min" }).click();
    await page.getByRole("button", { name: /salvar regras/i }).click();
    await expect(page.getByText("Regras salvas.")).toBeVisible();
    await page.getByRole("button", { name: "30 min" }).click();
    await page.getByRole("button", { name: /salvar regras/i }).click();
    await expect(page.getByText("Regras salvas.")).toBeVisible();

    // Folga: bloqueia um dia futuro e libera de novo.
    const day = brazilDatePlus(40);
    await page.getByRole("button", { name: /bloquear datas/i }).click();
    await page.getByLabel("De", { exact: true }).fill(day);
    await page.getByLabel("Até", { exact: true }).fill(day);
    await page.getByLabel(/motivo/i).fill("Congresso E2E");
    await page.getByRole("button", { name: /^bloquear$/i }).click();
    await expect(page.getByText("Congresso E2E")).toBeVisible();

    await page.getByRole("link", { name: /voltar para a agenda/i }).click();
    await page.getByRole("tab", { name: "Semana" }).click();
    await expect(page.locator("section[aria-label^='Sábado']")).toContainText("07:00–07:30 · Presencial");

    await page.getByRole("link", { name: /horários de atendimento/i }).click();
    await page.getByRole("button", { name: /^liberar /i }).first().click();
    await page.getByRole("dialog", { name: /liberar estes dias/i }).getByRole("button", { name: /^liberar dias$/i }).click();
    await expect(page.getByText("Congresso E2E")).toHaveCount(0);

    await page.getByRole("button", { name: /remover sábado 07:00/i }).click();
    await page.getByRole("dialog", { name: /remover esta faixa/i }).getByRole("button", { name: /^remover faixa$/i }).click();
    await expect(page.getByRole("listitem", { name: "Sábado" })).toContainText("Não atendo");
  });
});
