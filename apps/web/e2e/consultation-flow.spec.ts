import { expect, request, test } from "@playwright/test";
import { baseApiURL, loginByApi, sharedPassword, users, validCpfFromSeed } from "./fixtures";

test.describe("fluxo completo de consulta", () => {
  test.skip(!sharedPassword, "defina MEDSYNC_E2E_PASSWORD para executar login E2E");
  test.skip(process.env.MEDSYNC_E2E_MUTATING !== "1", "defina MEDSYNC_E2E_MUTATING=1 para criar dados de homologacao");

  test("recepcao agenda, paciente consente, medico inicia e encerra", async () => {
    const password = "Temp123!Temp";
    const finalPassword = "Final123!Temp";
    const suffix = Date.now();
    const reception = await request.newContext({ baseURL: baseApiURL });
    await loginByApi(reception, users.receptionist);

    const doctorsResponse = await reception.get("/doctors");
    expect(doctorsResponse.status()).toBeLessThan(400);
    const doctors = (await doctorsResponse.json()) as Array<{ id: string }>;
    expect(doctors.length).toBeGreaterThan(0);

    const patientResponse = await reception.post("/patients", {
      data: {
        name: "Paciente E2E",
        email: `paciente.e2e.${suffix}@example.test`,
        cpf: validCpfFromSeed(suffix),
        birthDate: "1990-01-01",
        phone: "11999990000",
        temporaryPassword: password,
      },
    });
    expect(patientResponse.status()).toBe(201);
    const patient = (await patientResponse.json()) as { id: string; email: string };

    const scheduledAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const appointmentResponse = await reception.post("/appointments", {
      data: {
        doctorId: doctors[0].id,
        patientId: patient.id,
        scheduledAt,
        durationMinutes: 30,
        paymentRequired: false,
      },
    });
    expect(appointmentResponse.status()).toBe(201);
    const appointment = (await appointmentResponse.json()) as { id: string };

    const patientContext = await request.newContext({ baseURL: baseApiURL });
    await loginByApi(patientContext, patient.email, password);
    const changePassword = await patientContext.post("/auth/change-password", {
      data: { currentPassword: password, newPassword: finalPassword },
    });
    expect(changePassword.status()).toBe(204);
    const consent = await patientContext.post(`/appointments/${appointment.id}/consent`, {
      data: { accepted: true, termVersion: "telemedicina-2026-01" },
    });
    expect(consent.status()).toBe(200);

    const doctorContext = await request.newContext({ baseURL: baseApiURL });
    await loginByApi(doctorContext, users.doctor);
    const start = await doctorContext.post(`/consultations/${appointment.id}/start`);
    expect(start.status()).toBe(200);

    const patientToken = await patientContext.post(`/consultations/${appointment.id}/token`);
    expect(patientToken.status()).toBe(200);

    const end = await doctorContext.post(`/consultations/${appointment.id}/end`);
    expect([204, 503]).toContain(end.status());

    await reception.dispose();
    await patientContext.dispose();
    await doctorContext.dispose();
  });
});
