import { expect, request, test, type APIRequestContext } from "@playwright/test";
import { baseApiURL, loginByApi, loginByUi, sharedPassword, users, validCpfFromSeed } from "./fixtures";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const TEMP = "Temporaria123!";
const FINAL = "Definitiva123!";

// A clinic onboarded by Support starts without an address. In-person hours must not reach patients, and every
// profile must be told why, until the clinic admin fills the address.
test.describe("clinica sem endereco de atendimento", () => {
  test.skip(!sharedPassword, "defina MEDSYNC_E2E_PASSWORD para executar login E2E");

  test("presencial fica indisponivel com aviso para medico, ADM e paciente, e volta com o endereco", async ({ page }) => {
    const seed = Number(Date.now().toString().slice(-8));
    const adminEmail = `adm.semendereco.${seed}@example.test`;
    const doctorEmail = `medico.semendereco.${seed}@example.test`;
    const patientEmail = `paciente.semendereco.${seed}@example.test`;
    const contexts: APIRequestContext[] = [];
    // New accounts start with a temporary password that must be changed before anything else (as in the UI).
    const open = async (email: string, password = sharedPassword) => {
      const context = await request.newContext({ baseURL: baseApiURL });
      contexts.push(context);
      await loginByApi(context, email, password);
      if (password === TEMP) {
        const changed = await context.post("/auth/change-password", { data: { currentPassword: TEMP, newPassword: FINAL } });
        expect(changed.status(), `troca de senha ${email}`).toBeLessThan(400);
        await loginByApi(context, email, FINAL);
      }
      return context;
    };

    try {
      const support = await open(users.support);
      const onboarding = await support.post("/clinics/onboarding", {
        data: {
          legalName: `Clínica Sem Endereço ${seed} Ltda`,
          tradeName: `Clínica Sem Endereço ${seed}`,
          taxId: validCnpjFromSeed(seed),
          adminName: "ADM Sem Endereço",
          adminEmail,
          temporaryPassword: TEMP,
        },
      });
      expect(onboarding.status()).toBe(201);
      const clinicId = ((await onboarding.json()) as { clinicId: string }).clinicId;

      const medicalAdmin = await open(users.medicalAdmin);
      const activation = await medicalAdmin.put(`/clinics/${clinicId}/activation`, {
        data: { status: "Active", reason: "Teste E2E", planName: "Plano E2E", monthlyFee: 100 },
      });
      expect(activation.status()).toBeLessThan(400);

      const clinicAdmin = await open(adminEmail, TEMP);
      expect(
        (
          await clinicAdmin.post("/doctors", {
            data: { name: "Dra. Sem Endereço", email: doctorEmail, crm: "123456", crmUf: "SP", specialty: "Clínica geral", temporaryPassword: TEMP },
          })
        ).status(),
      ).toBe(201);
      const patientResponse = await clinicAdmin.post("/patients", {
        data: {
          name: "Paciente Sem Endereço",
          email: patientEmail,
          cpf: validCpfFromSeed(seed),
          birthDate: "1990-01-01",
          temporaryPassword: TEMP,
          motherName: "Mãe E2E",
          address: { zipCode: "01310-100", street: "Rua A", number: "1", district: "Centro", city: "São Paulo", state: "SP" },
        },
      });
      expect(patientResponse.status()).toBe(201);
      const patientId = ((await patientResponse.json()) as { id: string }).id;

      // The doctor sets in-person hours tomorrow.
      const tomorrow = new Date(Date.now() - 3 * 3600_000 + 24 * 3600_000);
      const doctor = await open(doctorEmail, TEMP);
      expect(
        (
          await doctor.post("/doctors/me/availability", {
            data: { dayOfWeek: WEEKDAYS[tomorrow.getUTCDay()], startTime: "08:00:00", endTime: "12:00:00", modality: "Both" },
          })
        ).status(),
      ).toBeLessThan(400);

      // Patient: only online is offered, and the API says in-person is waiting for the address.
      const patient = await open(patientEmail, TEMP);
      const specialties = (await (await patient.get("/care/specialties")).json()) as Array<{
        doctors: Array<{ modalities: string[]; inPersonPendingAddress: boolean }>;
      }>;
      expect(specialties[0].doctors[0].modalities).toEqual(["Online"]);
      expect(specialties[0].doctors[0].inPersonPendingAddress).toBe(true);

      // Reception cannot book in person either.
      const booking = await clinicAdmin.post("/appointments", {
        data: {
          doctorId: ((await (await clinicAdmin.get("/doctors")).json()) as Array<{ id: string }>)[0].id,
          patientId,
          scheduledAt: new Date(Date.now() + 2 * 86400_000).toISOString(),
          durationMinutes: 30,
          paymentRequired: false,
          modality: "InPerson",
        },
      });
      expect(booking.status()).toBe(409);
      expect(((await booking.json()) as { message: string }).message).toMatch(/endereço/i);

      // Each profile sees why.
      await loginByUi(page, doctorEmail, FINAL);
      await page.goto("/consultas/horarios");
      await expect(page.getByRole("alert").filter({ hasText: "A clínica ainda não cadastrou o endereço de atendimento" })).toBeVisible();
      await page.context().clearCookies();

      await loginByUi(page, adminEmail, FINAL);
      await page.goto("/dashboard");
      await expect(page.getByRole("link", { name: "Cadastrar endereço" })).toHaveAttribute("href", "/clinica");
      await page.context().clearCookies();

      await loginByUi(page, patientEmail, FINAL);
      await page.goto("/consultas/nova");
      await expect(page.getByText(/atendimento presencial ainda indisponível/i)).toBeVisible();
      await expect(page.getByRole("button", { name: "Presencial" })).toBeDisabled();

      // With the address, in-person comes back for the patient.
      expect(
        (
          await clinicAdmin.put("/clinics/me", {
            data: {
              name: `Clínica Sem Endereço ${seed}`,
              address: { zipCode: "01310-100", street: "Avenida Paulista", number: "2000", district: "Bela Vista", city: "São Paulo", state: "SP" },
            },
          })
        ).status(),
      ).toBe(200);
      const after = (await (await patient.get("/care/specialties")).json()) as Array<{
        doctors: Array<{ modalities: string[]; clinicAddress: string; inPersonPendingAddress: boolean }>;
      }>;
      expect(after[0].doctors[0].modalities).toEqual(["Online", "InPerson"]);
      expect(after[0].doctors[0].inPersonPendingAddress).toBe(false);
      expect(after[0].doctors[0].clinicAddress).toContain("Avenida Paulista, 2000");
    } finally {
      await Promise.all(contexts.map((context) => context.dispose()));
    }
  });
});

function validCnpjFromSeed(seed: number) {
  const base = String(seed).padStart(12, "0").slice(-12);
  const first = cnpjDigit(base, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const partial = `${base}${first}`;
  return `${partial}${cnpjDigit(partial, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])}`;
}

function cnpjDigit(value: string, weights: number[]) {
  const remainder = weights.reduce((total, weight, index) => total + Number(value[index]) * weight, 0) % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}
