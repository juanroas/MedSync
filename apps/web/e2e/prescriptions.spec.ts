import { expect, request, test } from "@playwright/test";
import { baseApiURL, loginByApi, loginByUi, sharedPassword, users } from "./fixtures";

test.describe("receita do atendimento", () => {
  test.skip(!sharedPassword, "defina MEDSYNC_E2E_PASSWORD para executar login E2E");

  test("medico monta rascunho com medicamento novo e ve o documento sem validade", async ({ page }) => {
    const api = await request.newContext({ baseURL: baseApiURL });
    await loginByApi(api, users.doctor);
    // Cancelled appointments do not take prescriptions; other specs may leave one as the most recent.
    const appointments = ((await (await api.get("/appointments")).json()) as Array<{ id: string; status: string }>).filter(
      (item) => item.status !== "Cancelled",
    );
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
    // Sem o certificado em nuvem configurado, assinar fica indisponível e o motivo aparece (regra D2).
    test.skip(process.env.MEDSYNC_E2E_SIGNING === "1", "com o simulador ligado a assinatura fica disponível");
    // Sem a assinatura do MedSync, a segunda via é emitir para assinar fora dele (o paciente não espera a plataforma).
    await expect(doc.getByRole("button", { name: /assinar com certificado digital/i })).toHaveCount(0);
    await expect(doc.getByRole("button", { name: /emitir para assinar fora do medsync/i })).toBeEnabled();
    await expect(doc.getByText(/assinatura digital ICP-Brasil \(VIDaaS\) ainda não está ativa/i)).toBeVisible();
  });

  test("controle especial sai em 2 vias no modelo com comprador e fornecedor", async ({ page }) => {
    const api = await request.newContext({ baseURL: baseApiURL });
    await loginByApi(api, users.doctor);
    const appointments = ((await (await api.get("/appointments")).json()) as Array<{ id: string; status: string }>).filter(
      (item) => item.status !== "Cancelled",
    );
    await api.dispose();
    test.skip(appointments.length === 0, "sem consulta do medico");
    const medication = `Controlado E2E ${Date.now().toString().slice(-6)}`;

    await loginByUi(page, users.doctor);
    await page.goto(`/prontuario/${appointments[0].id}`);
    await page.getByRole("button", { name: /nova receita/i }).click();
    await page.getByLabel("Tipo").selectOption("ControlledSpecial");
    await page.getByRole("combobox", { name: "Medicamento" }).fill(medication);
    await page.getByRole("button", { name: new RegExp(`incluir “${medication}”`, "i") }).click();
    await page.getByPlaceholder("50 mg").fill("0,5 mg/ml");
    await page.getByPlaceholder("1 comprimido pela manhã").fill("Dar 1 ml 2x ao dia");
    await page.getByPlaceholder("30 (trinta) comprimidos").fill("1 (um) frasco");
    await page.getByPlaceholder("oral").fill("oral");
    await page.getByPlaceholder("Cidade/UF informada na consulta").fill("São Paulo/SP");
    await page.getByRole("button", { name: /salvar rascunho/i }).click();
    await expect(page.getByText(/rascunho salvo/i)).toBeVisible();

    const row = page.locator("li").filter({ hasText: medication }).filter({ hasText: "Rascunho" });
    const documentPage = page.waitForEvent("popup");
    await row.getByRole("link", { name: /ver e imprimir/i }).click();
    const doc = await documentPage;
    const copies = doc.getByTestId("special-copy");
    await expect(copies).toHaveCount(2);
    await expect(copies.first()).toContainText("1ª via — Retenção da Farmácia ou Drogaria");
    await expect(copies.nth(1)).toContainText("2ª via — Orientação ao Paciente");
    await expect(copies.first()).toContainText("Identificação do comprador");
    await expect(copies.first()).toContainText("Identificação do fornecedor");
    await expect(copies.first()).toContainText("VIA ORAL");
    await expect(copies.first()).toContainText("Nome da mãe:");
    await expect(copies.first()).toContainText("Validade: 30 dias");
    // Regra D6: controlado não é assinado antes da integração com o SNCR.
    await expect(doc.getByText(/número do SNCR/i)).toBeVisible();
    await expect(doc.getByRole("button", { name: /assinar com certificado/i })).toHaveCount(0);
    await expect(doc.getByRole("button", { name: /emitir para assinar fora do medsync/i })).toBeEnabled();
  });

  test("simulador: aprova uma vez, assina com um clique e encerra a liberacao", async ({ page }) => {
    test.skip(process.env.MEDSYNC_E2E_SIGNING !== "1", "defina MEDSYNC_E2E_SIGNING=1 com SIGNATURE_PROVIDER=simulator na API");
    const api = await request.newContext({ baseURL: baseApiURL });
    await loginByApi(api, users.doctor);
    const [doctor] = (await (await api.get("/doctors")).json()) as Array<Record<string, unknown>>;
    await api.put(`/doctors/${doctor.id}`, { data: { ...doctor, professionalAddress: "Av. Paulista, 1000 - São Paulo/SP" } });
    // Cancelled appointments do not take prescriptions; other specs may leave one as the most recent.
    const appointments = ((await (await api.get("/appointments")).json()) as Array<{ id: string; status: string }>).filter(
      (item) => item.status !== "Cancelled",
    );
    const draft = async () => {
      const created = await api.post(`/appointments/${appointments[0].id}/prescriptions`, {
        data: {
          kind: "Simple",
          patientLocation: "São Paulo/SP",
          items: [{ medicationName: "LOSARTANA POTÁSSICA", dosage: "50 mg", instructions: "1 comprimido ao dia", continuousUse: true }],
        },
      });
      return ((await created.json()) as { id: string }).id;
    };
    const first = await draft();
    const second = await draft();
    const third = await draft();
    await api.delete("/signature/session");
    await api.dispose();

    // 1ª receita: vai ao simulador (não é o VIDaaS) e aprova por 8 horas.
    await loginByUi(page, users.doctor);
    await page.goto(`/receita/${first}`);
    await expect(page.getByText("Modo simulador de assinatura")).toBeVisible();
    await page.getByLabel("Liberar assinatura por").selectOption("8");
    await page.getByRole("button", { name: /assinar com certificado digital/i }).click();
    await expect(page).toHaveURL(/\/assinatura\/simulador/);
    await expect(page.getByText("Isto não é o VIDaaS")).toBeVisible();
    await page.getByRole("button", { name: /aprovar \(simulação\)/i }).click();
    await expect(page).toHaveURL(new RegExp(`/receita/${first}\\?assinatura=ok`));
    await expect(page.getByText(/assinatura simulada — sem validade/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /baixar pdf assinado/i })).toBeVisible();

    // 2ª receita: a liberação está ativa, assina com um clique, sem sair da página.
    await page.goto(`/receita/${second}`);
    await expect(page.getByText(/assinatura liberada até/i)).toBeVisible();
    await page.getByRole("button", { name: /^assinar$/i }).click();
    await expect(page.getByText(/assinatura simulada — sem validade/i)).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`/receita/${second}$`));

    // Encerrar a liberação: a 3ª volta a pedir aprovação.
    await page.goto(`/receita/${third}`);
    await page.getByRole("button", { name: /encerrar liberação/i }).click();
    await expect(page.getByRole("button", { name: /assinar com certificado digital/i })).toBeVisible();

    // Paciente baixa o PDF da 1ª, sem botão de WhatsApp.
    await page.context().clearCookies();
    await loginByUi(page, users.patient);
    await page.goto(`/receita/${first}`);
    await expect(page.getByRole("link", { name: /baixar pdf assinado/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /enviar pelo whatsapp/i })).toHaveCount(0);
    const pdf = await page.request.get(`/files/prescriptions/${first}/pdf`);
    expect(pdf.status()).toBe(200);
  });

  test("medico ve as receitas anteriores so do paciente que atende; ADM, recepcao e paciente nao", async () => {
    const doctor = await request.newContext({ baseURL: baseApiURL });
    await loginByApi(doctor, users.doctor);
    const appointments = ((await (await doctor.get("/appointments")).json()) as Array<{ id: string; status: string; patientId: string }>).filter(
      (item) => item.status !== "Cancelled",
    );
    test.skip(appointments.length === 0, "sem consulta do medico");
    const { id: appointmentId, patientId } = appointments[0];
    const medication = `Historico E2E ${Date.now().toString().slice(-6)}`;
    const created = await doctor.post(`/appointments/${appointmentId}/prescriptions`, {
      data: { kind: "Simple", patientLocation: "São Paulo/SP", items: [{ medicationName: medication, instructions: "1 ao dia", continuousUse: false }] },
    });
    const prescriptionId = ((await created.json()) as { id: string }).id;
    // A draft is not history yet; once issued it is.
    let history = (await (await doctor.get(`/patients/${patientId}/prescriptions`)).json()) as Array<{ id: string; items: Array<{ medicationName: string }> }>;
    expect(history.some((item) => item.id === prescriptionId)).toBe(false);
    expect((await doctor.post(`/prescriptions/${prescriptionId}/issue-paper`)).status()).toBe(200);
    history = (await (await doctor.get(`/patients/${patientId}/prescriptions`)).json()) as typeof history;
    expect(history.find((item) => item.id === prescriptionId)?.items[0].medicationName).toBe(medication);
    await doctor.dispose();

    for (const email of [users.clinicAdmin, users.receptionist, users.patient]) {
      const context = await request.newContext({ baseURL: baseApiURL });
      await loginByApi(context, email);
      expect((await context.get(`/patients/${patientId}/prescriptions`)).status(), email).toBe(403);
      await context.dispose();
    }
    // A doctor of another clinic does not even find the patient.
    const other = await request.newContext({ baseURL: baseApiURL });
    await loginByApi(other, users.clinic2Doctor);
    expect((await other.get(`/patients/${patientId}/prescriptions`)).status()).toBe(404);
    await other.dispose();
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
