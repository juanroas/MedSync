// Exploratory walkthrough of every profile's main flow, for usability review before a release.
// Usage: WALK_PASSWORD=... node scripts/walkthrough.mjs <baseUrl> <outDir>
// Takes a screenshot per step and records console errors and API responses >= 400 (except expected ones).
import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const [base = "http://localhost:3107", out = "walk"] = process.argv.slice(2);
const password = process.env.WALK_PASSWORD;
if (!password) {
  console.error("Set WALK_PASSWORD.");
  process.exit(2);
}
fs.mkdirSync(out, { recursive: true });

const report = [];
let shot = 0;
const browser = await chromium.launch();

function nextWeekday(jsDay) {
  // Next date (Brasília) with this weekday, at least 2 days ahead, as yyyy-mm-dd.
  const date = new Date(Date.now() - 3 * 3600_000 + 2 * 86400_000);
  while (date.getUTCDay() !== jsDay) date.setUTCDate(date.getUTCDate() + 1);
  return date;
}

async function session(email, run) {
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await context.newPage();
  const issues = [];
  page.on("console", (message) => message.type() === "error" && issues.push(`console: ${message.text().slice(0, 200)}`));
  page.on("response", (response) => {
    const url = response.url();
    if (response.status() >= 400 && !url.endsWith("/auth/me") && !url.includes("/_next/"))
      issues.push(`${response.status()} ${response.request().method()} ${url.replace(base, "")}`);
  });
  const step = async (name, fn) => {
    try {
      await fn();
    } catch (error) {
      issues.push(`STEP FAILED "${name}": ${String(error.message).split("\n")[0].slice(0, 200)}`);
    }
    shot += 1;
    const file = path.join(out, `${String(shot).padStart(2, "0")}-${email.split("@")[0]}-${name}.png`);
    await page.screenshot({ path: file, fullPage: true }).catch(() => undefined);
  };
  await page.goto(`${base}/login`);
  await page.getByLabel(/e-mail/i).fill(email);
  await page.getByRole("textbox", { name: /senha/i }).fill(password);
  await page.getByRole("button", { name: /entrar/i }).click();
  await page.waitForURL(/\/(dashboard|alterar-senha)/, { timeout: 20000 });
  await run(page, step);
  report.push({ email, issues });
  await context.close();
}

const tuesday = nextWeekday(2);
const wednesday = nextWeekday(3);

// Doctor: sets Tuesday "online ou presencial" and Wednesday "presencial", then looks at every screen.
await session("medico@medsync.dev", async (page, step) => {
  await step("painel", async () => page.waitForLoadState("networkidle"));
  await step("horarios-vazio", async () => {
    await page.goto(`${base}/consultas/horarios`);
    await page.getByRole("heading", { name: /horários de atendimento/i }).waitFor();
  });
  for (const [day, modality] of [["Terça", "Os dois"], ["Quarta", "Presencial"]]) {
    await step(`faixa-${day}`, async () => {
      const row = page.getByRole("listitem", { name: day });
      await row.getByRole("button", { name: /adicionar faixa/i }).click();
      await row.getByLabel("Início").fill("09:00");
      await row.getByLabel("Fim").fill("12:00");
      await row.getByRole("button", { name: modality }).click();
      await row.getByRole("button", { name: /salvar faixa/i }).click();
      await row.getByText("09:00–12:00").waitFor();
    });
  }
  await step("agenda-dia", async () => {
    await page.goto(`${base}/consultas`);
    await page.getByRole("tab", { name: "Dia" }).waitFor();
  });
  await step("agenda-semana", async () => page.getByRole("tab", { name: "Semana" }).click());
  await step("agenda-mes", async () => page.getByRole("tab", { name: "Mês" }).click());
  await step("pacientes", async () => {
    await page.goto(`${base}/patients`);
    await page.waitForLoadState("networkidle");
  });
  await step("meu-perfil", async () => {
    await page.goto(`${base}/doctors`);
    await page.waitForLoadState("networkidle");
  });
  await step("prontuario", async () => {
    await page.goto(`${base}/consultas`);
    await page.getByRole("tab", { name: "Semana" }).click();
    const link = page.getByRole("link", { name: /prontuário/i }).first();
    if (await link.count()) await link.click();
    else {
      await page.getByRole("tab", { name: "Dia" }).click();
    }
    await page.waitForLoadState("networkidle");
  });
});

// Patient: online and in-person request, list, own data, help.
await session("paciente@medsync.dev", async (page, step) => {
  await step("painel", async () => page.waitForLoadState("networkidle"));
  await step("solicitar-online", async () => {
    await page.goto(`${base}/consultas/nova`);
    await page.getByRole("button", { name: "Online" }).waitFor();
    await page.waitForLoadState("networkidle");
  });
  await step("solicitar-presencial", async () => {
    await page.getByRole("button", { name: "Presencial" }).click();
    await page.waitForLoadState("networkidle");
  });
  await step("presencial-quarta", async () => {
    const calendar = page.getByRole("grid", { name: /dias disponíveis/i });
    await calendar.getByRole("button", { name: `${wednesday.getUTCDate()}, com horários` }).click();
    await page.getByRole("button", { name: "10:00" }).click();
  });
  await step("presencial-enviado", async () => {
    await page.getByRole("button", { name: /solicitar consulta/i }).click();
    await page.waitForURL(/\/consultas$/, { timeout: 15000 });
    await page.waitForLoadState("networkidle");
  });
  await step("painel-depois", async () => {
    await page.goto(`${base}/dashboard`);
    await page.waitForLoadState("networkidle");
  });
  await step("meu-cadastro", async () => {
    await page.goto(`${base}/patients`);
    await page.waitForLoadState("networkidle");
  });
  await step("ajuda", async () => {
    await page.goto(`${base}/ajuda`);
    await page.waitForLoadState("networkidle");
  });
});

// Doctor again: the new in-person appointment on the agenda.
await session("medico@medsync.dev", async (page, step) => {
  await step("agenda-semana-com-presencial", async () => {
    await page.goto(`${base}/consultas`);
    await page.getByRole("tab", { name: "Semana" }).click();
    for (let i = 0; i < 2; i++) {
      if (await page.getByText("Presencial", { exact: true }).count()) break;
      await page.getByRole("button", { name: /próxima semana/i }).click();
    }
  });
  await step("agenda-dia-presencial", async () => {
    const card = page.locator("section[aria-label]").filter({ hasText: "Presencial" }).first();
    await card.getByRole("button").first().click();
  });
});

// Clinic admin / reception.
await session("clinica.admin@medsync.dev", async (page, step) => {
  await step("painel", async () => page.waitForLoadState("networkidle"));
  await step("consultas", async () => {
    await page.goto(`${base}/consultas`);
    await page.waitForLoadState("networkidle");
  });
  await step("agendar-recepcao", async () => {
    await page.goto(`${base}/consultas/nova`);
    await page.getByLabel("Buscar paciente por CPF ou nome").fill("Carlos");
    await page.getByRole("button", { name: /Carlos Oliveira/ }).click();
    await page.waitForLoadState("networkidle");
  });
  await step("agendar-recepcao-terca", async () => {
    const calendar = page.getByRole("grid", { name: /dias disponíveis/i });
    await calendar.getByRole("button", { name: `${tuesday.getUTCDate()}, com horários` }).click();
    await page.waitForLoadState("networkidle");
  });
  await step("pacientes-novo", async () => {
    await page.goto(`${base}/patients`);
    await page.getByRole("button", { name: /novo paciente/i }).click();
  });
  await step("dados-clinica", async () => {
    await page.goto(`${base}/clinica`);
    await page.waitForLoadState("networkidle");
  });
  await step("medicos", async () => {
    await page.goto(`${base}/doctors`);
    await page.waitForLoadState("networkidle");
  });
  await step("equipe", async () => {
    await page.goto(`${base}/acessos`);
    await page.waitForLoadState("networkidle");
  });
  await step("auditoria", async () => {
    await page.goto(`${base}/auditoria`);
    await page.waitForLoadState("networkidle");
  });
});

for (const [email, pages] of [
  ["admin@medsync.dev", ["dashboard", "perfil", "clinicas", "acessos", "acessos-prontuario", "ajuda"]],
  ["suporte@medsync.dev", ["dashboard", "clinicas", "ajuda"]],
  ["dpo@medsync.dev", ["dashboard", "auditoria", "acessos-prontuario", "privacidade", "ajuda"]],
]) {
  await session(email, async (page, step) => {
    for (const target of pages)
      await step(target, async () => {
        await page.goto(`${base}/${target}`);
        await page.waitForLoadState("networkidle");
      });
  });
}

await browser.close();
fs.writeFileSync(path.join(out, "report.json"), JSON.stringify(report, null, 2));
for (const { email, issues } of report) {
  console.log(`== ${email}: ${issues.length} issue(s)`);
  for (const issue of issues) console.log(`   ${issue}`);
}
