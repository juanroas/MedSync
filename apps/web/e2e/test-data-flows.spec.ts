import { expect, request, test, type Browser, type Page } from "@playwright/test";
import { baseApiURL, loginByApi, loginByUi, sharedPassword, users, validCnpjFromSeed, validCpfFromSeed } from "./fixtures";

// Massa de teste (13/10/2026): os dois fluxos completos, feitos pela tela, e os dados ficam no banco para conferência.
// 1. Clínica: cadastro → Médico ADM ativa → ADM cadastra médico e recepção → recepção cadastra paciente e agenda
//    presencial e online → médico emite receitas variadas.
// 2. Consultório: o médico cadastra o próprio consultório (é médico e ADM) → cadastra paciente sem recepção → associa o
//    médico da clínica (que passa a trocar de local) → inclui recepção → recepção cadastra paciente e agenda → receitas.
// Toda conta criada termina com a senha de demonstração (MEDSYNC_E2E_PASSWORD), para entrar e conferir depois.
// Com MEDSYNC_E2E_SIGNING=1 (API com SIGNATURE_PROVIDER=simulator) as receitas online saem assinadas no simulador;
// sem ele, saem pela segunda via (assinar fora do MedSync).

const seed = Date.now().toString().slice(-7);
const n = Number(seed);
const temporary = `Tmp${seed}!aA`;
const signing = process.env.MEDSYNC_E2E_SIGNING === "1";
const DAY_NAMES = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
// Amanhã em Brasília (UTC-3).
const tomorrow = new Date(Date.now() - 3 * 3600_000 + 24 * 3600_000);

const clinic = {
  name: `Clínica Vida Massa ${seed}`,
  adminEmail: `massa.clinica.${seed}@medsync.dev`,
  doctor: {
    name: `Dr. Paulo Massa ${seed}`,
    email: `massa.medico.${seed}@medsync.dev`,
    crm: String((n % 800000) + 100000),
    specialty: "Clínica geral",
  },
  receptionEmail: `massa.recepcao.${seed}@medsync.dev`,
  patient: { name: `Joana Paciente Massa ${seed}`, email: `massa.paciente.${seed}@medsync.dev`, cpf: validCpfFromSeed(n * 10 + 1) },
};

const practice = {
  name: `Consultório Dra. Helena Massa ${seed}`,
  owner: { name: `Dra. Helena Massa ${seed}`, email: `massa.consultorio.${seed}@medsync.dev`, crm: String(((n + 1) % 800000) + 100000) },
  receptionEmail: `massa.recepcao2.${seed}@medsync.dev`,
  // Cadastrado pela própria médica, antes de ter recepção.
  patientByOwner: { name: `Carlos Paciente Massa ${seed}`, email: `massa.paciente2.${seed}@medsync.dev`, cpf: validCpfFromSeed(n * 10 + 2) },
  patientByReception: { name: `Beatriz Paciente Massa ${seed}`, email: `massa.paciente3.${seed}@medsync.dev`, cpf: validCpfFromSeed(n * 10 + 3) },
};

test.describe.serial("massa de teste: clinica e consultorio", () => {
  test.skip(!sharedPassword, "defina MEDSYNC_E2E_PASSWORD para executar login E2E");
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "a massa é criada uma vez, no desktop");
  });

  test("fluxo 1: clinica, medico, recepcao, paciente, consultas e receitas", async ({ browser }) => {
    test.setTimeout(420_000);

    await test.step("clínica se cadastra e fica em análise", async () => {
      const page = await newPage(browser);
      await page.goto("/cadastro");
      await expect(page.getByRole("radio", { name: /^Clínica/ })).toBeChecked();
      await page.getByRole("textbox", { name: "Razão social", exact: true }).fill(`${clinic.name} Ltda`);
      await page.getByRole("textbox", { name: "Nome fantasia", exact: true }).fill(clinic.name);
      await page.getByRole("textbox", { name: "CNPJ", exact: true }).fill(validCnpjFromSeed(n * 10 + 1));
      await page.getByLabel(/telefone da clínica/i).fill("(11) 3333-4444");
      await fillAddress(page, "Avenida Brigadeiro Faria Lima", "1500", "Pinheiros", "São Paulo", "01452-000");
      await page.getByLabel("Nome do médico").fill(clinic.doctor.name);
      await page.getByLabel("CRM", { exact: true }).fill(clinic.doctor.crm);
      await page.getByLabel("UF do CRM").selectOption("SP");
      await page.getByRole("textbox", { name: "Seu nome", exact: true }).fill(`Ana Administradora Massa ${seed}`);
      await page.getByRole("textbox", { name: "E-mail", exact: true }).fill(clinic.adminEmail);
      await page.getByLabel("Senha", { exact: true }).fill(sharedPassword);
      await page.getByRole("button", { name: /criar conta/i }).click();
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 20000 });
      await expect(page.getByText(/cadastro recebido — você já pode configurar a clínica/i)).toBeVisible();
      await page.context().close();
    });

    await test.step("Médico ADM ativa a clínica", () => activate(browser, clinic.name));

    await test.step("ADM cadastra o médico e a recepção", async () => {
      const page = await signIn(browser, clinic.adminEmail);
      await createDoctor(page, { ...clinic.doctor, temporaryPassword: temporary });
      await createReceptionist(page, `Rita Recepção Massa ${seed}`, clinic.receptionEmail);
      await page.context().close();
    });

    await test.step("médico troca a senha e abre horários online e presencial amanhã", async () => {
      const page = await signIn(browser, clinic.doctor.email, temporary);
      await page.getByRole("navigation").getByRole("link", { name: "Agenda", exact: true }).click();
      await addWindows(page, [
        { start: "08:00", end: "10:00", modality: "Online" },
        { start: "14:00", end: "16:00", modality: "Presencial" },
      ]);
      await page.context().close();
    });

    await test.step("recepção cadastra a paciente e agenda presencial e online", async () => {
      const page = await signIn(browser, clinic.receptionEmail, temporary);
      await registerPatient(page, clinic.patient, "Maria Aparecida Massa", "F");
      await book(page, clinic.patient, { modality: "InPerson", time: "14:00" });
      await book(page, clinic.patient, { modality: "Online", time: "08:00" });
      await page.context().close();
    });

    await test.step("médico emite receitas: papel na presencial, assinatura ou segunda via na online", async () => {
      const { inPerson, online } = await appointmentsOf(clinic.doctor.email, clinic.patient.name);
      const page = await signIn(browser, clinic.doctor.email);
      // Presencial: tudo impresso e assinado à mão.
      await prescribe(page, inPerson, true, { kind: "Simple", medication: "Dipirona monoidratada", dosage: "500 mg", instructions: "1 comprimido a cada 6 horas se dor ou febre", quantity: "20 comprimidos" });
      await prescribe(page, inPerson, true, { kind: "Antimicrobial", medication: "Amoxicilina", dosage: "500 mg", instructions: "1 cápsula a cada 8 horas por 7 dias", quantity: "21 (vinte e uma) cápsulas" });
      await prescribe(page, inPerson, true, { kind: "ControlledSpecial", medication: "Clonazepam", dosage: "2 mg", instructions: "1 comprimido à noite", quantity: "30 (trinta) comprimidos", route: "oral" });
      // Telemedicina: simples e antimicrobiano assinam no MedSync (simulador) ou saem para assinar fora; controlado
      // especial só sai para assinar fora (regra D6).
      await prescribe(page, online, false, { kind: "Simple", medication: "Losartana potássica", dosage: "50 mg", instructions: "1 comprimido ao dia", continuous: true });
      await prescribe(page, online, false, { kind: "Antimicrobial", medication: "Azitromicina", dosage: "500 mg", instructions: "1 comprimido ao dia por 3 dias", quantity: "3 (três) comprimidos" });
      await prescribe(page, online, false, { kind: "ControlledSpecial", medication: "Sertralina", dosage: "50 mg", instructions: "1 comprimido pela manhã", quantity: "30 (trinta) comprimidos", route: "oral" });
      // Um rascunho fica aberto, para ver o estado antes de emitir.
      await prescribe(page, online, false, { kind: "Simple", medication: "Omeprazol", dosage: "20 mg", instructions: "1 cápsula em jejum", quantity: "30 cápsulas" }, "draft");
      await page.context().close();
    });

    await test.step("paciente entra, troca a senha e vê as duas consultas", async () => {
      const page = await signIn(browser, clinic.patient.email, temporary);
      await page.getByRole("navigation").getByRole("link", { name: "Minhas consultas", exact: true }).click();
      await expect(page.getByText(clinic.doctor.name).first()).toBeVisible();
      await expect(page.getByText("Presencial").first()).toBeVisible();
      await expect(page.getByText("Online").first()).toBeVisible();
      await page.context().close();
    });
  });

  test("fluxo 2: consultorio do medico, medico associado, recepcao, pacientes e receitas", async ({ browser }) => {
    test.setTimeout(600_000);

    await test.step("médica cadastra o próprio consultório", async () => {
      const page = await newPage(browser);
      await page.goto("/cadastro");
      await page.getByRole("radio", { name: /^Consultório/ }).check();
      await page.getByRole("textbox", { name: "Razão social", exact: true }).fill(`${practice.name} Ltda`);
      await page.getByRole("textbox", { name: "Nome fantasia", exact: true }).fill(practice.name);
      await page.getByRole("textbox", { name: "CNPJ", exact: true }).fill(validCnpjFromSeed(n * 10 + 2));
      await page.getByLabel(/telefone do consultório/i).fill("(11) 98888-7777");
      await fillAddress(page, "Rua Augusta", "2100", "Jardins", "São Paulo", "01412-100");
      await page.getByRole("textbox", { name: "Seu nome", exact: true }).fill(practice.owner.name);
      await page.getByLabel("CRM", { exact: true }).fill(practice.owner.crm);
      await page.getByLabel("UF do CRM").selectOption("SP");
      await page.getByRole("textbox", { name: "Especialidade", exact: true }).fill("Cardiologia");
      await page.getByLabel("RQE (opcional)").fill("54321");
      await page.getByRole("textbox", { name: "E-mail", exact: true }).fill(practice.owner.email);
      await page.getByLabel("Senha", { exact: true }).fill(sharedPassword);
      await page.getByRole("button", { name: /criar conta/i }).click();
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 20000 });
      await expect(page.getByText(/cadastro recebido — você já pode configurar o consultório/i)).toBeVisible();
      await expect(page.getByRole("link", { name: /agendar consulta/i })).toHaveCount(0);
      await page.context().close();
    });

    await test.step("Médico ADM ativa o consultório", () => activate(browser, practice.name, true));

    await test.step("dona do consultório: horários, paciente e agenda sem recepção", async () => {
      const page = await signIn(browser, practice.owner.email);
      await expect(page.getByText("Consultório", { exact: true }).first()).toBeVisible();
      const menu = page.getByRole("navigation");
      for (const item of ["Consultas", "Pacientes", "Médicos", "Dados do consultório", "Equipe e acessos"])
        await expect(menu.getByRole("link", { name: item, exact: true })).toBeVisible();
      await menu.getByRole("link", { name: "Consultas", exact: true }).click();
      await addWindows(page, [
        { start: "09:00", end: "11:00", modality: "Online" },
        { start: "15:00", end: "17:00", modality: "Presencial" },
      ]);
      await registerPatient(page, practice.patientByOwner, "Lúcia Massa", "M");
      await book(page, practice.patientByOwner, { modality: "InPerson", time: "15:00" });
      await page.context().close();
    });

    await test.step("dona associa o médico da clínica e inclui a recepção", async () => {
      const page = await signIn(browser, practice.owner.email);
      // Conta que já existe (atende na clínica do fluxo 1): entra com a senha que já tem.
      await createDoctor(page, { ...clinic.doctor, crm: clinic.doctor.crm, temporaryPassword: "" });
      await createReceptionist(page, `Sônia Recepção Massa ${seed}`, practice.receptionEmail);
      await page.context().close();
    });

    await test.step("médico associado troca de local e abre horário no consultório", async () => {
      const page = await signIn(browser, clinic.doctor.email);
      const place = page.getByLabel("Local de atendimento");
      await expect(place).toBeVisible();
      await place.selectOption({ label: `${practice.name} (consultório)` });
      await expect(page).toHaveURL(/\/dashboard/);
      await expect(page.getByLabel("Local de atendimento").locator("option:checked")).toHaveText(`${practice.name} (consultório)`);
      await page.getByRole("navigation").getByRole("link", { name: "Agenda", exact: true }).click();
      await addWindows(page, [{ start: "18:00", end: "19:00", modality: "Online" }]);
      await page.context().close();
    });

    await test.step("recepção do consultório cadastra paciente e agenda com os dois médicos", async () => {
      const page = await signIn(browser, practice.receptionEmail, temporary);
      await registerPatient(page, practice.patientByReception, "Teresa Massa", "F");
      await book(page, practice.patientByReception, { modality: "Online", time: "09:00", doctorName: practice.owner.name });
      await book(page, practice.patientByReception, { modality: "Online", time: "18:00", doctorName: clinic.doctor.name });
      await page.context().close();
    });

    await test.step("dona emite receitas e vê a agenda toda, sem ações de médico na consulta do colega", async () => {
      const ownerAppointments = await appointmentsOf(practice.owner.email, practice.patientByOwner.name);
      const receptionBooked = await appointmentsOf(practice.owner.email, practice.patientByReception.name);
      const page = await signIn(browser, practice.owner.email);
      await prescribe(page, ownerAppointments.inPerson, true, { kind: "ControlledSpecial", medication: "Alprazolam", dosage: "0,5 mg", instructions: "1 comprimido à noite", quantity: "30 (trinta) comprimidos", route: "oral" });
      await prescribe(page, ownerAppointments.inPerson, true, { kind: "Simple", medication: "Ácido acetilsalicílico", dosage: "100 mg", instructions: "1 comprimido após o almoço", quantity: "30 comprimidos", continuous: true });
      const ownOnline = receptionBooked.all.find((item) => item.doctorName === practice.owner.name)!;
      await prescribe(page, ownOnline.id, false, { kind: "Simple", medication: "Atenolol", dosage: "25 mg", instructions: "1 comprimido ao dia", continuous: true });
      await prescribe(page, ownOnline.id, false, { kind: "Antimicrobial", medication: "Cefalexina", dosage: "500 mg", instructions: "1 cápsula a cada 6 horas por 7 dias", quantity: "28 (vinte e oito) cápsulas" });
      await prescribe(page, ownOnline.id, false, { kind: "ControlledSpecial", medication: "Zolpidem", dosage: "10 mg", instructions: "1 comprimido ao deitar", quantity: "30 (trinta) comprimidos", route: "oral" });

      // Agenda do consultório: as duas pessoas na coluna Médico; prontuário só nas consultas dela.
      await page.getByRole("navigation").getByRole("link", { name: "Consultas", exact: true }).click();
      await expect(page.getByRole("link", { name: /horários de atendimento/i })).toBeVisible();
      const colleagueRow = page.locator("article").filter({ hasText: clinic.doctor.name });
      await expect(colleagueRow.first()).toBeVisible();
      await expect(colleagueRow.first().getByRole("link", { name: /prontu[aá]rio/i })).toHaveCount(0);
      const colleague = receptionBooked.all.find((item) => item.doctorName === clinic.doctor.name)!;
      const api = await request.newContext({ baseURL: baseApiURL });
      await loginByApi(api, practice.owner.email);
      expect([403, 404]).toContain((await api.get(`/appointments/${colleague.id}/prescriptions`)).status());
      await api.dispose();
      await page.context().close();
    });

    await test.step("médico associado emite receita na consulta online do consultório", async () => {
      const page = await signIn(browser, clinic.doctor.email);
      await page.getByLabel("Local de atendimento").selectOption({ label: `${practice.name} (consultório)` });
      await expect(page.getByLabel("Local de atendimento").locator("option:checked")).toHaveText(`${practice.name} (consultório)`);
      const appointments = (await (await page.request.get("/api/appointments")).json()) as Array<{ id: string; patientName: string }>;
      const online = appointments.find((item) => item.patientName === practice.patientByReception.name)!;
      expect(online).toBeTruthy();
      await prescribe(page, online.id, false, { kind: "Simple", medication: "Paracetamol", dosage: "750 mg", instructions: "1 comprimido a cada 8 horas se dor", quantity: "12 comprimidos" });
      await page.context().close();
    });
  });
});

type Prescription = {
  kind: "Simple" | "Antimicrobial" | "ControlledSpecial";
  medication: string;
  dosage?: string;
  instructions: string;
  quantity?: string;
  route?: string;
  continuous?: boolean;
};

async function newPage(browser: Browser) {
  const context = await browser.newContext({ baseURL: test.info().project.use.baseURL });
  // The prescription page prints right after issuing on paper; the test never opens the print dialog.
  await context.addInitScript(() => {
    window.print = () => undefined;
  });
  return context.newPage();
}

// Logs in; a temporary password is replaced by the demo password on the first access.
async function signIn(browser: Browser, email: string, password = sharedPassword) {
  const page = await newPage(browser);
  await loginByUi(page, email, password);
  if (page.url().includes("/alterar-senha")) {
    await page.getByLabel("Senha temporária").fill(password);
    await page.getByLabel("Nova senha", { exact: true }).fill(sharedPassword);
    await page.getByLabel("Confirmar nova senha").fill(sharedPassword);
    await page.getByRole("button", { name: /salvar nova senha/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 20000 });
  }
  return page;
}

async function fillAddress(page: Page, street: string, number: string, district: string, city: string, zipCode: string) {
  // The ZIP lookup only fills empty fields, so the address is typed first.
  await page.getByRole("textbox", { name: "Logradouro", exact: true }).fill(street);
  await page.getByRole("textbox", { name: "Número", exact: true }).fill(number);
  await page.getByRole("textbox", { name: "Bairro", exact: true }).fill(district);
  await page.getByRole("textbox", { name: "Cidade", exact: true }).fill(city);
  await page.getByLabel("UF", { exact: true }).selectOption("SP");
  await page.getByRole("textbox", { name: "CEP", exact: true }).fill(zipCode);
}

async function activate(browser: Browser, name: string, isPractice = false) {
  const page = await signIn(browser, users.medicalAdmin);
  await page.getByRole("navigation").getByRole("link", { name: /^clínicas$/i }).click();
  const row = page.locator("article").filter({ hasText: name });
  await expect(row.getByText("Em análise", { exact: true })).toBeVisible();
  if (isPractice) await expect(row.getByText("Consultório", { exact: true })).toBeVisible();
  await row.getByRole("button", { name: /^ativar$/i }).click();
  await expect(row.getByText("Ativa", { exact: true })).toBeVisible();
  await page.context().close();
}

async function createDoctor(
  page: Page,
  doctor: { name: string; email: string; crm: string; specialty: string; temporaryPassword: string },
) {
  await page.getByRole("navigation").getByRole("link", { name: "Médicos", exact: true }).click();
  await page.getByRole("button", { name: /novo médico/i }).click();
  const form = page.locator("form").filter({ hasText: "Cadastrar médico" });
  await form.getByLabel("Nome completo", { exact: true }).fill(doctor.name);
  await form.getByLabel("E-mail", { exact: true }).fill(doctor.email);
  await form.getByLabel("CRM", { exact: true }).fill(doctor.crm);
  await form.getByLabel("UF do CRM", { exact: true }).fill("SP");
  await form.getByLabel("Especialidade", { exact: true }).fill(doctor.specialty);
  await form.getByLabel("Telefone", { exact: true }).fill("(11) 97777-6666");
  if (doctor.temporaryPassword) await form.getByLabel(/senha temporária/i).fill(doctor.temporaryPassword);
  const created = page.waitForResponse((response) => response.url().endsWith("/doctors") && response.request().method() === "POST");
  await page.getByRole("button", { name: /salvar médico/i }).click();
  expect((await created).status()).toBe(201);
  await expect(page.getByText(doctor.name).first()).toBeVisible();
}

async function createReceptionist(page: Page, name: string, email: string) {
  await page.getByRole("navigation").getByRole("link", { name: "Equipe e acessos", exact: true }).click();
  await page.getByRole("button", { name: /novo acesso/i }).click();
  await page.getByLabel("Nome", { exact: true }).fill(name);
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Perfil", { exact: true }).selectOption("Receptionist");
  await page.getByLabel("Senha temporária").fill(temporary);
  const created = page.waitForResponse((response) => response.url().endsWith("/staff-users") && response.request().method() === "POST");
  await page.getByRole("button", { name: /criar acesso/i }).click();
  expect((await created).status()).toBe(201);
  await expect(page.getByText(email).first()).toBeVisible();
}

// From the agenda (Consultas), opens "Horários de atendimento" and adds bands on tomorrow's weekday.
async function addWindows(page: Page, windows: Array<{ start: string; end: string; modality: "Online" | "Presencial" }>) {
  await page.getByRole("link", { name: /horários de atendimento/i }).click();
  await expect(page.getByRole("heading", { name: /horários de atendimento/i })).toBeVisible();
  const day = page.getByRole("listitem", { name: DAY_NAMES[tomorrow.getUTCDay()], exact: true });
  for (const window of windows) {
    await day.getByRole("button", { name: /adicionar faixa/i }).click();
    await day.getByLabel("Início").fill(window.start);
    await day.getByLabel("Fim").fill(window.end);
    await day.getByRole("button", { name: window.modality, exact: true }).click();
    await day.getByRole("button", { name: /salvar faixa/i }).click();
    await expect(day).toContainText(`${window.start}–${window.end} · ${window.modality}`);
  }
}

async function registerPatient(page: Page, patient: { name: string; email: string; cpf: string }, motherName: string, sex: "F" | "M") {
  await page.getByRole("navigation").getByRole("link", { name: "Pacientes", exact: true }).click();
  await page.getByRole("button", { name: /novo paciente/i }).click();
  const form = page.getByRole("form", { name: "Cadastro de pessoa" });
  await form.getByLabel("Nome completo").fill(patient.name);
  await form.getByLabel("CPF").fill(patient.cpf);
  await form.getByLabel("Data de nascimento").fill(sex === "F" ? "1988-07-14" : "1975-11-02");
  await form.getByLabel("E-mail").fill(patient.email);
  await form.getByLabel("Senha temporária").fill(temporary);
  await form.getByLabel("Nome da mãe").fill(motherName);
  await form.getByLabel("Sexo").selectOption(sex);
  await form.getByLabel("Logradouro", { exact: true }).fill("Rua dos Pinheiros");
  await form.getByLabel("Número", { exact: true }).fill(String(100 + (Number(patient.cpf.slice(-2)) % 800)));
  await form.getByLabel("Bairro", { exact: true }).fill("Pinheiros");
  await form.getByLabel("Cidade", { exact: true }).fill("São Paulo");
  await form.getByLabel("UF", { exact: true }).selectOption("SP");
  await form.getByLabel("CEP", { exact: true }).fill("05422-000");
  const created = page.waitForResponse((response) => response.url().endsWith("/patients") && response.request().method() === "POST");
  await form.getByRole("button", { name: /salvar paciente/i }).click();
  expect((await created).status()).toBe(201);
}

async function book(
  page: Page,
  patient: { name: string; cpf: string },
  options: { modality: "InPerson" | "Online"; time: string; doctorName?: string },
) {
  await page.goto("/consultas/nova");
  await page.getByLabel("Buscar paciente por CPF ou nome").fill(patient.cpf);
  await page.getByRole("button", { name: new RegExp(patient.name) }).click();
  await expect(page.getByTestId("selected-patient")).toContainText(patient.name);
  if (options.doctorName) {
    const select = page.getByRole("combobox", { name: "Médico", exact: true });
    const value = await select.locator("option", { hasText: options.doctorName }).getAttribute("value");
    await select.selectOption(value!);
  }
  await page.getByRole("button", { name: options.modality === "InPerson" ? "Presencial" : "Online", exact: true }).click();
  await page.getByRole("grid", { name: /dias disponíveis/i }).getByRole("button", { name: `${tomorrow.getUTCDate()}, com horários` }).click();
  await page.getByRole("button", { name: options.time, exact: true }).click();
  await expect(page.getByTestId("booking-summary")).toContainText(`às ${options.time}`);
  const booked = page.waitForResponse((response) => response.url().endsWith("/appointments") && response.request().method() === "POST");
  await page.getByRole("button", { name: /confirmar agendamento/i }).click();
  const response = await booked;
  expect(response.status(), await response.text()).toBe(201);
  await expect(page).toHaveURL(/\/consultas$/);
}

async function appointmentsOf(email: string, patientName: string) {
  const api = await request.newContext({ baseURL: baseApiURL });
  await loginByApi(api, email);
  const all = ((await (await api.get("/appointments")).json()) as Array<{
    id: string;
    patientName: string;
    doctorName: string;
    modality: string;
    status: string;
  }>).filter((item) => item.patientName === patientName && item.status !== "Cancelled");
  await api.dispose();
  return {
    all,
    inPerson: all.find((item) => item.modality === "InPerson")?.id ?? "",
    online: all.find((item) => item.modality === "Online")?.id ?? "",
  };
}

// Drafts the prescription in the record, then issues it: in person on paper; online signed in the simulator when it is
// on and allowed, otherwise by the second way (sign outside MedSync). "draft" leaves it open.
async function prescribe(page: Page, appointmentId: string, inPerson: boolean, rx: Prescription, mode: "issue" | "draft" = "issue") {
  expect(appointmentId, rx.medication).toBeTruthy();
  await page.goto(`/prontuario/${appointmentId}`);
  await page.getByRole("button", { name: /nova receita/i }).click();
  await page.getByLabel("Tipo").selectOption(rx.kind);
  await pickMedication(page, rx.medication);
  if (rx.dosage) await page.getByPlaceholder("50 mg").fill(rx.dosage);
  await page.getByPlaceholder("1 comprimido pela manhã").fill(rx.instructions);
  if (rx.quantity) await page.getByPlaceholder(rx.kind === "Simple" ? "30 comprimidos" : "30 (trinta) comprimidos").fill(rx.quantity);
  if (rx.route) await page.getByPlaceholder("oral").fill(rx.route);
  if (rx.continuous) await page.getByText(/uso contínuo \(entra/i).click();
  if (!inPerson) await page.getByPlaceholder("Cidade/UF informada na consulta").fill("São Paulo/SP");
  await page.getByRole("button", { name: /salvar rascunho/i }).click();
  await expect(page.getByText(/rascunho salvo/i)).toBeVisible();
  if (mode === "draft") return;

  const row = page.locator("li").filter({ hasText: rx.medication }).filter({ hasText: "Rascunho" }).first();
  const popup = page.waitForEvent("popup");
  await row.getByRole("link", { name: /ver e imprimir/i }).click();
  const doc = await popup;
  const outside = doc.getByRole("button", { name: inPerson ? /imprimir para assinar à mão/i : /emitir para assinar fora do medsync/i });
  await expect(outside).toBeVisible();
  const sign = doc.getByRole("button", { name: /^assinar( com certificado digital)?$/i });
  if (!inPerson && signing && (await sign.isVisible()) && (await sign.isEnabled())) {
    if (/certificado/i.test((await sign.textContent()) ?? "")) {
      await doc.getByLabel("Liberar assinatura por").selectOption("8");
      await sign.click();
      await expect(doc).toHaveURL(/\/assinatura\/simulador/);
      await doc.getByRole("button", { name: /aprovar \(simulação\)/i }).click();
      await expect(doc).toHaveURL(/assinatura=ok/);
    } else {
      await sign.click();
    }
    await expect(doc.getByText(/assinatura simulada — sem validade/i).first()).toBeVisible();
  } else {
    await outside.click();
    await doc
      .getByRole("dialog")
      .getByRole("button", { name: inPerson ? /emitir e imprimir/i : /^emitir$/i })
      .click();
    await expect(doc.getByText(inPerson ? /emitida em papel em/i : /emitida para assinar fora do medsync em/i)).toBeVisible();
  }
  await doc.close();
}

async function pickMedication(page: Page, name: string) {
  await page.getByRole("combobox", { name: "Medicamento" }).fill(name);
  const listbox = page.getByRole("listbox");
  await expect(listbox).toBeVisible();
  const add = listbox.getByRole("button", { name: /^incluir “/i });
  // The catalog may list the same name in capitals ("DIPIRONA MONOIDRATADA"); then there is no "Incluir".
  const exact = listbox
    .getByRole("option")
    .filter({ has: page.getByText(new RegExp(`^${name}$`, "i")) });
  await expect(add.or(exact).first()).toBeVisible();
  if (await exact.count()) await exact.first().click();
  else await add.click();
  await expect(page.getByRole("combobox", { name: "Medicamento" })).toHaveValue(new RegExp(name.split(" ")[0], "i"));
}
