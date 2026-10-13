import { expect, request, test } from "@playwright/test";
import { baseApiURL, loginByApi, loginByUi, sharedPassword, users } from "./fixtures";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Rule D6: in person, controlled and antimicrobial prescriptions are printed and signed by hand; in telemedicine any
// prescription can be issued as a PDF the doctor signs with their own certificate (second way when the platform fails).
test.describe("receita em papel na consulta presencial", () => {
  test.skip(!sharedPassword, "defina MEDSYNC_E2E_PASSWORD para executar login E2E");

  test("controle especial presencial: imprime para assinar a mao; telemedicina emite PDF para assinar fora", async ({ page }) => {
    const tomorrow = new Date(Date.now() - 3 * 3600_000 + 24 * 3600_000);
    const doctor = await request.newContext({ baseURL: baseApiURL });
    await loginByApi(doctor, users.doctor);
    const slot = (await (
      await doctor.post("/doctors/me/availability", {
        data: { dayOfWeek: WEEKDAYS[tomorrow.getUTCDay()], startTime: "06:00:00", endTime: "07:00:00", modality: "InPerson" },
      })
    ).json()) as { id: string };
    const patient = await request.newContext({ baseURL: baseApiURL });
    await loginByApi(patient, users.patient);
    let appointmentId = "";

    try {
      // In-person request tomorrow at 06:00 (Brasília) = 09:00 UTC.
      const key = tomorrow.toISOString().slice(0, 10);
      const booked = await patient.post("/appointments/request", {
        data: {
          specialty: "Clínica geral",
          doctorId: "20000000-0000-0000-0000-000000000001",
          scheduledAt: `${key}T09:00:00.000Z`,
          durationMinutes: 30,
          modality: "InPerson",
        },
      });
      expect(booked.status(), await booked.text()).toBe(201);
      appointmentId = ((await booked.json()) as { id: string }).id;

      const medication = `Controlado papel ${Date.now().toString().slice(-6)}`;
      await loginByUi(page, users.doctor);
      await page.goto(`/prontuario/${appointmentId}`);
      await page.getByRole("button", { name: /nova receita/i }).click();
      await page.getByLabel("Tipo").selectOption("ControlledSpecial");
      await expect(page.getByText(/consulta presencial: a receita sai com o endereço da clínica/i)).toBeVisible();
      await expect(page.getByPlaceholder("Cidade/UF informada na consulta")).toHaveCount(0);
      await page.getByRole("combobox", { name: "Medicamento" }).fill(medication);
      await page.getByRole("button", { name: new RegExp(`incluir “${medication}”`, "i") }).click();
      await page.getByPlaceholder("1 comprimido pela manhã").fill("1 comprimido à noite");
      await page.getByPlaceholder("30 (trinta) comprimidos").fill("30 (trinta) comprimidos");
      await page.getByRole("button", { name: /salvar rascunho/i }).click();
      await expect(page.getByText(/rascunho salvo/i)).toBeVisible();

      const row = page.locator("li").filter({ hasText: medication });
      const popup = page.waitForEvent("popup");
      await row.getByRole("link", { name: /ver e imprimir/i }).click();
      const doc = await popup;
      await doc.evaluate(() => {
        window.print = () => undefined;
      });
      // Digital signature is blocked (SNCR), so printing to sign by hand is the action; no "Assinar" button.
      await expect(doc.getByRole("button", { name: /assinar com certificado/i })).toHaveCount(0);
      await doc.getByRole("button", { name: /imprimir para assinar à mão/i }).click();
      await doc.getByRole("dialog", { name: /imprimir para assinar à mão/i }).getByRole("button", { name: /emitir e imprimir/i }).click();
      await expect(doc.getByText(/emitida em papel em/i)).toBeVisible();
      await expect(doc.getByText(/sem validade — rascunho/i)).toHaveCount(0);
      const copies = doc.getByTestId("special-copy");
      await expect(copies).toHaveCount(2);
      await expect(copies.first()).toContainText("Emitida em consulta presencial");
      await expect(copies.first()).toContainText("Assinatura manual do médico");

      // Closed for editing and not issued twice.
      const prescriptions = (await (await doctor.get(`/appointments/${appointmentId}/prescriptions`)).json()) as Array<{
        id: string;
        status: string;
      }>;
      const issued = prescriptions.find((item) => item.status === "IssuedOnPaper")!;
      expect(issued).toBeTruthy();
      expect((await doctor.post(`/prescriptions/${issued.id}/issue-paper`)).status()).toBe(409);
      expect((await doctor.delete(`/prescriptions/${issued.id}`)).status()).toBeGreaterThanOrEqual(400);

      // Telemedicine: the seed online appointment never goes to paper.
      const online = ((await (await doctor.get("/appointments")).json()) as Array<{ id: string; modality: string; status: string }>).find(
        (item) => item.modality === "Online" && item.status !== "Cancelled",
      )!;
      const draft = await doctor.post(`/appointments/${online.id}/prescriptions`, {
        data: {
          kind: "ControlledSpecial",
          patientLocation: "São Paulo/SP",
          items: [{ medicationName: "Teste telemedicina", instructions: "1 ao dia", quantity: "10 (dez)", continuousUse: false }],
        },
      });
      expect(draft.status()).toBe(201);
      const draftId = ((await draft.json()) as { id: string }).id;
      // Telemedicine also has a second way out: issue, download the PDF, sign with the doctor's own certificate.
      expect((await doctor.post(`/prescriptions/${draftId}/issue-paper`)).status()).toBe(200);
      const pdf = await doctor.get(`/prescriptions/${draftId}/pdf`);
      expect(pdf.status()).toBe(200);
      expect(pdf.headers()["content-type"]).toContain("application/pdf");
      const patientPdf = await patient.get(`/prescriptions/${draftId}/pdf`);
      expect(patientPdf.status()).toBe(404);
    } finally {
      if (appointmentId) await doctor.post(`/appointments/${appointmentId}/cancel`, { data: { reason: "Limpeza do teste E2E" } });
      await doctor.delete(`/doctors/me/availability/${slot.id}`);
      await doctor.dispose();
      await patient.dispose();
    }
  });
});
