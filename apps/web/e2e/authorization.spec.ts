import { expect, request, test } from "@playwright/test";
import { baseApiURL, loginByApi, sharedPassword, users } from "./fixtures";

test.describe("autorizacao por perfil", () => {
  test.skip(!sharedPassword, "defina MEDSYNC_E2E_PASSWORD para executar login E2E");

  test("empresa, financeiro e suporte nao acessam prontuario clinico", async () => {
    const patientContext = await request.newContext({ baseURL: baseApiURL });
    await loginByApi(patientContext, users.patient);
    const patientAppointments = await patientContext.get("/appointments");
    expect(patientAppointments.status()).toBeLessThan(400);
    const patientList = (await patientAppointments.json()) as Array<{ id: string }>;
    test.skip(patientList.length === 0, "sem consulta de paciente para validar bloqueio clinico");
    const appointmentId = patientList[0].id;
    await patientContext.dispose();

    for (const email of [users.companyAdmin, users.companyFinance, users.platformFinance, users.support]) {
      const context = await request.newContext({ baseURL: baseApiURL });
      await loginByApi(context, email);
      const clinicalRecord = await context.get(`/appointments/${appointmentId}/clinical-record`);
      expect([403, 404]).toContain(clinicalRecord.status());
      await context.dispose();
    }
  });

  test("auditor de empresa nao altera dados operacionais", async () => {
    const context = await request.newContext({ baseURL: baseApiURL });
    await loginByApi(context, users.companyAuditor);
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

  test("admin plataforma nao recebe token de videochamada", async () => {
    const context = await request.newContext({ baseURL: baseApiURL });
    await loginByApi(context, users.platformAdmin);
    const appointments = await context.get("/appointments");
    expect(appointments.status()).toBeLessThan(400);
    const list = (await appointments.json()) as Array<{ id: string }>;
    test.skip(list.length === 0, "sem consultas para validar token");

    const token = await context.post(`/consultations/${list[0].id}/token`);
    expect([403, 404, 409]).toContain(token.status());
    await context.dispose();
  });

  test("medico e admin plataforma nao criam agenda por API direta", async () => {
    for (const email of [users.doctor, users.platformAdmin]) {
      const context = await request.newContext({ baseURL: baseApiURL });
      await loginByApi(context, email);
      const response = await context.post("/appointments", {
        data: {
          doctorId: "00000000-0000-0000-0000-000000000001",
          patientId: "00000000-0000-0000-0000-000000000002",
          scheduledAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          durationMinutes: 30,
          paymentRequired: false,
        },
      });
      expect(response.status(), email).toBe(403);
      await context.dispose();
    }
  });
});
