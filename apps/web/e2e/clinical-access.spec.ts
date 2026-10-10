import { expect, request, test } from "@playwright/test";
import { baseApiURL, loginByApi, loginByUi, sharedPassword, users } from "./fixtures";

test.describe("acesso ao prontuario com justificativa (regra C3)", () => {
  test.skip(!sharedPassword, "defina MEDSYNC_E2E_PASSWORD para executar login E2E");

  test("medico ADM justifica, le por 30 min; DPO ve a finalidade; paciente ve o registro; outros perfis nao", async ({ page }) => {
    const purpose = `Revisão de conduta E2E ${Date.now()} após reclamação na Ajuda`;

    await loginByUi(page, users.medicalAdmin);
    await page.getByRole("link", { name: /acessos ao prontuário/i }).click();
    await page.getByRole("button", { name: /solicitar acesso/i }).click();
    const dialog = page.getByRole("dialog", { name: /justificar acesso ao prontuário/i });
    await dialog.getByLabel("CPF do paciente").fill("123.456.789-09");
    await dialog.getByRole("button", { name: "Buscar" }).click();
    await expect(dialog.getByTestId("access-patient")).toContainText("Carlos Oliveira");

    // Sem justificativa suficiente e sem a declaração, o acesso não sai.
    await dialog.getByLabel(/descreva a finalidade/i).fill("curto");
    await dialog.getByRole("button", { name: /abrir prontuário por 30 min/i }).click();
    await expect(dialog.getByText(/pelo menos 30 caracteres/i)).toBeVisible();

    await dialog.getByLabel(/incidente ou reclamação/i).check();
    await dialog.getByLabel(/descreva a finalidade/i).fill(purpose);
    await dialog.getByLabel(/declaro que o acesso/i).check();
    await dialog.getByRole("button", { name: /abrir prontuário por 30 min/i }).click();
    await expect(page.getByText(/somente leitura · acesso até/i)).toBeVisible();
    await expect(page.getByText(/ativo até/i).first()).toBeVisible();

    const admin = await request.newContext({ baseURL: baseApiURL });
    await loginByApi(admin, users.medicalAdmin);
    const grants = (await (await admin.get("/clinical-access/grants")).json()) as Array<{ id: string; justification: string }>;
    const grant = grants.find((item) => item.justification === purpose)!;
    expect(grant).toBeTruthy();
    // A API recusa justificativa curta mesmo sem a tela.
    const short = await admin.post("/clinical-access", {
      data: { patientId: "30000000-0000-0000-0000-000000000001", reason: "QualityAudit", justification: "curto", declaration: true },
    });
    expect(short.status()).toBe(400);
    await admin.dispose();

    // Outros perfis não leem pelo acesso de outra pessoa nem pedem acesso.
    for (const email of [users.clinicAdmin, users.support, users.dpo, users.doctor]) {
      const other = await request.newContext({ baseURL: baseApiURL });
      await loginByApi(other, email);
      expect((await other.get(`/clinical-access/grants/${grant.id}/records`)).status(), email).toBe(404);
      const create = await other.post("/clinical-access", {
        data: { patientId: "30000000-0000-0000-0000-000000000001", reason: "QualityAudit", justification: purpose, declaration: true },
      });
      expect(create.status(), email).toBe(403);
      await other.dispose();
    }

    // DPO vê o registro com a finalidade, sem conteúdo clínico.
    const dpo = await request.newContext({ baseURL: baseApiURL });
    await loginByApi(dpo, users.dpo);
    const dpoGrants = (await (await dpo.get("/clinical-access/grants")).json()) as Array<Record<string, unknown>>;
    const seen = dpoGrants.find((item) => item.justification === purpose)!;
    expect(seen.actorName).toBe("Dr. Admin MedSync");
    expect(seen).not.toHaveProperty("records");
    await dpo.dispose();

    // O paciente vê quem acessou.
    await page.getByRole("button", { name: /sair da conta/i }).click();
    await loginByUi(page, users.patient);
    await page.goto("/patients");
    const log = page.getByRole("region", { name: "Quem acessou meu prontuário" });
    await expect(log).toContainText("Dr. Admin MedSync");
    await expect(log).toContainText("Incidente ou reclamação");
  });
});
