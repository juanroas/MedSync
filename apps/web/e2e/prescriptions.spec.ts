import { expect, request, test } from "@playwright/test";
import { baseApiURL, loginByApi, loginByUi, sharedPassword, users } from "./fixtures";

test.describe("receita do atendimento", () => {
  test.skip(!sharedPassword, "defina MEDSYNC_E2E_PASSWORD para executar login E2E");

  test("medico monta rascunho com medicamento novo e ve o documento sem validade", async ({ page }) => {
    const api = await request.newContext({ baseURL: baseApiURL });
    await loginByApi(api, users.doctor);
    const appointments = (await (await api.get("/appointments")).json()) as Array<{ id: string }>;
    await api.dispose();
    test.skip(appointments.length === 0, "sem consulta do medico");
    const medication = `Medicamento E2E ${Date.now().toString().slice(-6)}`;

    await loginByUi(page, users.doctor);
    await page.goto(`/prontuario/${appointments[0].id}`);
    await page.getByRole("button", { name: /nova receita/i }).click();
    await page.getByRole("combobox", { name: "Medicamento" }).fill(medication);
    await page.getByRole("button", { name: new RegExp(`incluir “${medication}”`, "i") }).click();
    await page.getByPlaceholder("50 mg").fill("10 mg");
    await page.getByPlaceholder("1 comprimido pela manhã").fill("1 comprimido ao dia");
    await page.getByText(/uso contínuo \(entra/i).click();
    await page.getByPlaceholder("Cidade/UF informada na consulta").fill("São Paulo/SP");
    await page.getByRole("button", { name: /salvar rascunho/i }).click();

    await expect(page.getByText(/rascunho salvo/i)).toBeVisible();
    await expect(page.getByText("Medicações em uso contínuo")).toBeVisible();
    const row = page.locator("li").filter({ hasText: medication }).filter({ hasText: "Rascunho" });
    await expect(row).toBeVisible();

    const documentPage = page.waitForEvent("popup");
    await row.getByRole("link", { name: /ver e imprimir/i }).click();
    const doc = await documentPage;
    await expect(doc.getByText(/sem validade — rascunho/i).first()).toBeVisible();
    await expect(doc.getByText(/modalidade de telemedicina/i)).toBeVisible();
    await expect(doc.getByText(medication, { exact: false })).toBeVisible();
  });

  test("ADM da clinica e suporte nao veem receitas", async () => {
    const doctor = await request.newContext({ baseURL: baseApiURL });
    await loginByApi(doctor, users.doctor);
    const appointments = (await (await doctor.get("/appointments")).json()) as Array<{ id: string }>;
    await doctor.dispose();
    test.skip(appointments.length === 0, "sem consulta do medico");

    for (const email of [users.clinicAdmin, users.support, users.dpo]) {
      const context = await request.newContext({ baseURL: baseApiURL });
      await loginByApi(context, email);
      const response = await context.get(`/appointments/${appointments[0].id}/prescriptions`);
      expect([403, 404], email).toContain(response.status());
      const search = await context.get("/medications?q=losartana");
      expect(search.status(), email).toBe(403);
      await context.dispose();
    }
  });
});
