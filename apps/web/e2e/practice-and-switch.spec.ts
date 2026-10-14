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
});
