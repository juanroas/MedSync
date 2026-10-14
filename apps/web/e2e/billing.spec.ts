import { expect, request, test } from "@playwright/test";
import { baseApiURL, loginByApi, loginByUi, sharedPassword, users } from "./fixtures";

// Financeiro (14/10/2026): mensalidade do MedSync à mão. Suporte lança, a clínica paga por Pix e avisa, o suporte
// confirma depois de ver o valor e a clínica imprime o recibo. Ninguém fora disso vê ou mexe.
test.describe("financeiro da mensalidade MedSync", () => {
  test.skip(!sharedPassword, "defina MEDSYNC_E2E_PASSWORD para executar login E2E");

  test("suporte lanca, clinica avisa o Pix, suporte confirma e a clinica baixa o recibo", async ({ page }) => {
    test.setTimeout(120_000);
    // A month far ahead, unique per run, so the "one charge per clinic and month" rule never blocks the test.
    const seed = Date.now();
    const reference = `${2030 + (seed % 60)}-${String((Math.floor(seed / 60) % 12) + 1).padStart(2, "0")}`;

    await loginByUi(page, users.support);
    await page.getByRole("navigation").getByRole("link", { name: "Financeiro", exact: true }).click();
    await expect(page.getByRole("heading", { name: /financeiro/i })).toBeVisible();
    await page.getByRole("button", { name: /lançar cobrança/i }).click();
    const createDialog = page.getByRole("dialog", { name: "Lançar cobrança" });
    const clinicSelect = createDialog.getByRole("combobox", { name: "Clínica", exact: true });
    const alfa = await clinicSelect.locator("option", { hasText: "Clínica Alfa" }).getAttribute("value");
    await clinicSelect.selectOption(alfa!);
    await expect(createDialog.getByLabel("Valor (R$)")).toHaveValue("349.9");
    await createDialog.getByLabel("Mês de referência").fill(reference);
    const created = page.waitForResponse((response) => response.url().endsWith("/billing/invoices") && response.request().method() === "POST");
    await createDialog.getByRole("button", { name: /lançar cobrança/i }).click();
    const createdResponse = await created;
    expect(createdResponse.status(), await createdResponse.text()).toBe(201);
    const invoice = (await createdResponse.json()) as { id: string; code: string; pixCode: string | null };
    await expect(page.getByText(`Cobrança ${invoice.code} lançada para Clínica Alfa.`)).toBeVisible();

    // One charge per clinic and month.
    const support = await request.newContext({ baseURL: baseApiURL });
    await loginByApi(support, users.support);
    const duplicate = await support.post("/billing/invoices", { data: { clinicId: alfa, reference, dueDate: "2030-01-10" } });
    expect(duplicate.status()).toBe(409);

    // The clinic sees it with the Pix to pay, prints the invoice and says it paid.
    await page.context().clearCookies();
    await loginByUi(page, users.clinic2Admin);
    await page.getByRole("navigation").getByRole("link", { name: "Financeiro", exact: true }).click();
    const card = page.getByRole("article").filter({ hasText: invoice.code });
    await expect(card).toBeVisible();
    if (invoice.pixCode) {
      await expect(card.getByLabel("Pix copia e cola")).toHaveValue(invoice.pixCode);
      expect(invoice.pixCode).toContain(invoice.code);
    } else {
      await expect(card.getByText(/chave pix do medsync ainda não foi configurada/i)).toBeVisible();
    }
    const invoicePdf = page.waitForEvent("download");
    await card.getByRole("button", { name: /baixar fatura/i }).click();
    expect((await invoicePdf).suggestedFilename()).toBe(`fatura-${invoice.code}.pdf`);
    await card.getByRole("button", { name: /já paguei/i }).click();
    const informDialog = page.getByRole("dialog", { name: "Avisar que pagou?" });
    await informDialog.getByLabel(/observação/i).fill("Pago pelo app do banco");
    await informDialog.getByRole("button", { name: /avisar o medsync/i }).click();
    await expect(card.getByText(/você avisou o pagamento/i)).toBeVisible();

    // The support confirms after seeing the money.
    await page.context().clearCookies();
    await loginByUi(page, users.support);
    await page.getByRole("navigation").getByRole("link", { name: "Financeiro", exact: true }).click();
    await page.getByLabel("Filtrar por situação").selectOption("PaymentInformed");
    const row = page.locator("tr").filter({ hasText: invoice.code });
    await expect(row.getByText("Pago pelo app do banco", { exact: false })).toBeVisible();
    await row.getByRole("button", { name: /confirmar pagamento/i }).click();
    await page.getByRole("dialog", { name: "Confirmar pagamento" }).getByRole("button", { name: /confirmar recebimento/i }).click();
    await expect(page.getByText(/pagamento de clínica alfa confirmado/i)).toBeVisible();

    // The clinic downloads the receipt.
    await page.context().clearCookies();
    await loginByUi(page, users.clinic2Admin);
    await page.getByRole("navigation").getByRole("link", { name: "Financeiro", exact: true }).click();
    const historyRow = page.locator("tr").filter({ hasText: invoice.code });
    await expect(historyRow.getByText("Paga", { exact: true })).toBeVisible();
    const receipt = page.waitForEvent("download");
    await historyRow.getByRole("button", { name: /recibo/i }).click();
    expect((await receipt).suggestedFilename()).toBe(`recibo-${invoice.code}.pdf`);

    // Paid cannot be cancelled or confirmed twice; the support report comes out.
    expect((await support.post(`/billing/invoices/${invoice.id}/cancel`, { data: { reason: "Teste de cancelamento" } })).status()).toBe(409);
    expect((await support.post(`/billing/invoices/${invoice.id}/confirm`, { data: { paidOn: "2026-10-01", method: "Pix" } })).status()).toBe(409);
    const report = await support.get("/billing/report/pdf?from=2030-01&to=2099-12");
    expect(report.status()).toBe(200);
    expect(report.headers()["content-type"]).toContain("application/pdf");

    // Another clinic never sees it; no one but the MedSync team charges or confirms.
    const otherAdmin = await request.newContext({ baseURL: baseApiURL });
    await loginByApi(otherAdmin, users.clinicAdmin);
    const own = (await (await otherAdmin.get("/billing/invoices")).json()) as Array<{ id: string }>;
    expect(own.some((item) => item.id === invoice.id)).toBe(false);
    expect((await otherAdmin.get(`/billing/invoices/${invoice.id}/pdf`)).status()).toBe(404);
    expect((await otherAdmin.post("/billing/invoices", { data: { clinicId: alfa, reference: "2031-01", dueDate: "2031-01-10" } })).status()).toBe(403);
    expect((await otherAdmin.post(`/billing/invoices/${invoice.id}/confirm`, { data: { paidOn: "2026-10-01", method: "Pix" } })).status()).toBe(403);
    expect((await otherAdmin.get("/billing/report/pdf")).status()).toBe(403);
    await otherAdmin.dispose();

    for (const email of [users.receptionist, users.doctor, users.patient, users.dpo]) {
      const context = await request.newContext({ baseURL: baseApiURL });
      await loginByApi(context, email);
      expect((await context.get("/billing/invoices")).status(), email).toBe(403);
      await context.dispose();
    }
    await support.dispose();
  });
});
