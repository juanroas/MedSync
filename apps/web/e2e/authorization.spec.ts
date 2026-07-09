import { expect, request, test } from "@playwright/test";
import { baseApiURL, loginByApi, sharedPassword, users } from "./fixtures";

test.describe("autorizacao por perfil", () => {
  test.skip(!sharedPassword, "defina MEDSYNC_E2E_PASSWORD para executar login E2E");

  test("recepcao e financeiro nao acessam prontuario clinico", async () => {
    for (const email of [users.receptionist, users.finance]) {
      const context = await request.newContext({ baseURL: baseApiURL });
      await loginByApi(context, email);
      const appointments = await context.get("/appointments");
      expect(appointments.status()).toBeLessThan(400);
      const list = (await appointments.json()) as Array<{ id: string }>;
      test.skip(list.length === 0, `sem consultas disponiveis para ${email}`);

      const clinicalRecord = await context.get(`/appointments/${list[0].id}/clinical-record`);
      expect([403, 404]).toContain(clinicalRecord.status());
      await context.dispose();
    }
  });

  test("auditor de privacidade nao altera dados operacionais", async () => {
    const context = await request.newContext({ baseURL: baseApiURL });
    await loginByApi(context, users.privacyAuditor);
    const response = await context.post("/patients", {
      data: {
        name: "Paciente Bloqueado",
        email: "bloqueado-auditor@example.test",
        cpf: "52998224725",
        birthDate: "1990-01-01",
        temporaryPassword: "Temp123!Temp",
      },
    });
    expect(response.status()).toBe(403);
    await context.dispose();
  });

  test("admin nao recebe token de videochamada", async () => {
    const context = await request.newContext({ baseURL: baseApiURL });
    await loginByApi(context, users.clinicAdmin);
    const appointments = await context.get("/appointments");
    expect(appointments.status()).toBeLessThan(400);
    const list = (await appointments.json()) as Array<{ id: string }>;
    test.skip(list.length === 0, "sem consultas para validar token");

    const token = await context.post(`/consultations/${list[0].id}/token`);
    expect([403, 404, 409]).toContain(token.status());
    await context.dispose();
  });
});
