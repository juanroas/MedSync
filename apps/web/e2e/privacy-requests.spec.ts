import { expect, test } from "@playwright/test";
import { baseApiURL, loginByApi, loginByUi, sharedPassword, users } from "./fixtures";

test.describe("privacidade e direitos do titular", () => {
  test.skip(!sharedPassword, "defina MEDSYNC_E2E_PASSWORD para executar login E2E");

  test("paciente registra solicitacao e DPO atualiza status minimizado", async ({ page, request }) => {
    await loginByApi(request, users.clinicAdmin);
    const forbidden = await request.get(`${baseApiURL}/privacy/requests`);
    expect(forbidden.status()).toBe(403);

    const description = `Solicito acesso aos meus dados cadastrais em homologacao ${Date.now()}.`;

    await loginByUi(page, users.patient);
    // Paciente não tem mais "Privacidade" no menu: o pedido sobre os dados fica dentro da Ajuda.
    await expect(page.getByRole("navigation").getByRole("link", { name: /privacidade/i })).toHaveCount(0);
    await page.goto("/privacidade");
    await expect(page).toHaveURL(/\/ajuda\?tipo=lgpd/);
    await expect(page.getByRole("tab", { name: /pedido sobre meus dados/i })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByText(/encarregado de dados \(DPO\)/i)).toBeVisible();
    await page.getByLabel(/o que você quer/i).selectOption("Access");
    await page.getByLabel(/detalhes do pedido/i).fill(description);
    await page.getByRole("button", { name: /enviar pedido sobre meus dados/i }).click();
    await expect(page.getByText(/pedido registrado/i)).toBeVisible();
    const mine = page.locator("li").filter({ hasText: description });
    await expect(mine).toContainText("Meus dados");

    await loginByUi(page, users.dpo);
    await page.getByRole("navigation").getByRole("link", { name: /privacidade/i }).click();

    await expect(page.getByRole("heading", { name: /direitos do titular/i })).toBeVisible();
    await expect(page.getByText(description)).toBeVisible();

    const item = page.locator("article").filter({ hasText: description }).first();
    await item.getByRole("combobox").selectOption("InReview");
    await item.getByPlaceholder(/nota operacional minimizada/i).fill("Analise DPO iniciada em ambiente de homologacao.");
    await item.getByRole("button", { name: /atualizar/i }).click();

    await expect(page.getByText(/status de privacidade atualizado com auditoria/i)).toBeVisible();
    await expect(item.locator("span").filter({ hasText: /^Em analise$/ }).first()).toBeVisible();

    await loginByUi(page, users.clinicAdmin);
    await expect(page.getByRole("link", { name: /privacidade/i })).toHaveCount(0);
  });
});
