import { expect, request, test } from "@playwright/test";
import { baseApiURL, loginByApi, sharedPassword, users, validCnpjFromSeed } from "./fixtures";

// ADR-0005: "Sou médico" creates the doctor's own practice (doctor + admin, pending), and the location switch only
// works for places where the account has a membership.
test.describe("consultorio do medico e troca de local", () => {
  test.skip(!sharedPassword, "defina MEDSYNC_E2E_PASSWORD para executar login E2E");

  test("cadastro de consultorio: medico e ADM, em analise, com o medico como responsavel tecnico", async () => {
    const seed = Number(Date.now().toString().slice(-8));
    const api = await request.newContext({ baseURL: baseApiURL });
    const input = {
      name: "Dra. Teste Consultório",
      email: `consultorio.${seed}@example.test`,
      password: sharedPassword,
      crm: String((seed % 800000) + 100000),
      crmUf: "SP",
      specialty: "Dermatologia",
      legalName: `Consultório Teste ${seed} Ltda`,
      taxId: validCnpjFromSeed(seed * 10 + 9),
      address: { zipCode: "01310-100", street: "Avenida Paulista", number: "900", district: "Bela Vista", city: "São Paulo", state: "SP" },
    };

    expect((await api.post("/auth/register-practice", { data: { ...input, taxId: "11111111111111" } })).status()).toBe(400);
    expect((await api.post("/auth/register-practice", { data: { ...input, crmUf: "XX" } })).status()).toBe(400);

    const created = await api.post("/auth/register-practice", { data: input });
    expect(created.status(), await created.text()).toBe(201);
    const { user } = (await created.json()) as {
      user: { roles: string[]; clinicIsPrivatePractice: boolean; clinicActivationStatus: string; doctorId?: string; clinics: unknown[] };
    };
    expect(user.roles.sort()).toEqual(["ClinicAdmin", "Doctor"]);
    expect(user.clinicIsPrivatePractice).toBe(true);
    expect(user.clinicActivationStatus).toBe("Pending");
    expect(user.doctorId).toBeTruthy();
    expect(user.clinics).toHaveLength(1);

    const clinic = (await (await api.get("/clinics/me")).json()) as { technicalDirectorName?: string; technicalDirectorCrm?: string };
    expect(clinic.technicalDirectorName).toBe(input.name);
    expect(clinic.technicalDirectorCrm).toBe(input.crm);

    // Same CNPJ or e-mail again is refused.
    const again = await request.newContext({ baseURL: baseApiURL });
    expect((await again.post("/auth/register-practice", { data: { ...input, email: `outro.${seed}@example.test` } })).status()).toBe(409);
    await again.dispose();
    await api.dispose();
  });

  test("troca de local sem vinculo e negada", async () => {
    const outsider = await request.newContext({ baseURL: baseApiURL });
    const { user: other } = (await loginByApi(outsider, users.clinic2Admin)) as { user: { clinicId: string } };
    await outsider.dispose();

    const api = await request.newContext({ baseURL: baseApiURL });
    const { user } = (await loginByApi(api, users.clinicAdmin)) as { user: { clinicId: string; clinics: Array<{ id: string }> } };
    expect(user.clinics.map((item) => item.id)).toContain(user.clinicId);
    expect((await api.post("/auth/switch-clinic", { data: { clinicId: other.clinicId } })).status()).toBe(403);
    // The session still belongs to the original clinic.
    const me = (await (await api.get("/auth/me")).json()) as { clinicId: string };
    expect(me.clinicId).toBe(user.clinicId);
    await api.dispose();
  });
  test("medico em dois locais nunca tem duas consultas no mesmo horario; a agenda mostra so o local escolhido", async () => {
    const seed = Date.now().toString().slice(-6);
    const email = `dois.locais.${seed}@example.test`;
    const doctorInput = { name: `Dra. Dois Locais ${seed}`, email, crm: `9${seed}`, crmUf: "SP", specialty: "Clínica geral" };
    const demo = await request.newContext({ baseURL: baseApiURL });
    const alfa = await request.newContext({ baseURL: baseApiURL });
    await loginByApi(demo, users.clinicAdmin);
    await loginByApi(alfa, users.clinic2Admin);

    // Conta nova na Clínica Demo; a Clínica Alfa vincula a mesma conta pelo e-mail (sem senha nova).
    const atDemo = await demo.post("/doctors", { data: { ...doctorInput, temporaryPassword: "Temporaria123!" } });
    expect(atDemo.status(), await atDemo.text()).toBeLessThan(400);
    const atAlfa = await alfa.post("/doctors", { data: { ...doctorInput, temporaryPassword: "" } });
    expect(atAlfa.status(), await atAlfa.text()).toBeLessThan(400);
    const demoDoctorId = ((await atDemo.json()) as { id: string }).id;
    const alfaDoctorId = ((await atAlfa.json()) as { id: string }).id;
    const demoPatient = ((await (await demo.get("/patients")).json()) as Array<{ id: string; email: string }>).find((item) => item.email === users.patient)!;
    const alfaPatient = ((await (await alfa.get("/patients")).json()) as Array<{ id: string; email: string }>).find((item) => item.email === users.clinic2Patient)!;

    const at = new Date(Date.now() + 50 * 24 * 3600_000);
    at.setUTCHours(13, 0, 0, 0);
    const book = (api: typeof demo, doctorId: string, patientId: string, minutes: number) =>
      api.post("/appointments", {
        data: { doctorId, patientId, scheduledAt: new Date(at.getTime() + minutes * 60_000).toISOString(), durationMinutes: 30, modality: "Online", paymentRequired: false },
      });
    const ids: Array<[typeof demo, string]> = [];

    try {
      const first = await book(demo, demoDoctorId, demoPatient.id, 0);
      expect(first.status(), await first.text()).toBe(201);
      ids.push([demo, ((await first.json()) as { id: string }).id]);

      // Mesmo horário (sobreposto) no outro local: bloqueado.
      const clash = await book(alfa, alfaDoctorId, alfaPatient.id, 15);
      expect(clash.status()).toBe(409);
      // Depois que a primeira termina: liberado.
      const later = await book(alfa, alfaDoctorId, alfaPatient.id, 30);
      expect(later.status(), await later.text()).toBe(201);
      ids.push([alfa, ((await later.json()) as { id: string }).id]);

      // A médica vê na agenda só as consultas do local em que está.
      const doctor = await request.newContext({ baseURL: baseApiURL });
      await doctor.post("/auth/login", { data: { email, password: "Temporaria123!" } });
      const changed = await doctor.post("/auth/change-password", { data: { currentPassword: "Temporaria123!", newPassword: "DoisLocais!2026" } });
      expect(changed.status(), await changed.text()).toBeLessThan(400);
      const login = (await (await doctor.post("/auth/login", { data: { email, password: "DoisLocais!2026" } })).json()) as {
        user: { clinics: Array<{ id: string }> };
      };
      expect(login.user.clinics).toHaveLength(2);
      const list = (await (await doctor.get("/appointments")).json()) as Array<{ id: string }>;
      expect(list).toHaveLength(1);
      await doctor.dispose();
    } finally {
      for (const [api, id] of ids) await api.post(`/appointments/${id}/cancel`, { data: { reason: "Limpeza do teste E2E" } });
      await Promise.all([demo.dispose(), alfa.dispose()]);
    }
  });
});
