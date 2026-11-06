using MedSync.Application;
using MedSync.Domain;
using MedSync.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace MedSync.Api;

// Massa de teste (roteiro em docs/08-quality/MASSA_DE_TESTE.md): uma sessão de testes por dia (17h às 20h por padrão,
// TEST_SESSION_HOURS muda) com consultas online e presenciais em todos os locais, um médico em dois locais, o histórico
// da véspera com documentos assinados (o paciente vê), rascunhos (o paciente não vê) e consultas sem documento, uma
// clínica em análise, pedidos de suporte e LGPD e mensalidades em todas as situações. Os Ids derivam da data da sessão:
// cada dia de teste começa limpo, o que mudou num teste anterior fica no histórico, e reiniciar no mesmo dia não
// duplica nada. Assinaturas pelo simulador, marcadas "SIMULAÇÃO — SEM VALIDADE" (regra D4).
public static partial class DatabaseSeeder
{
    private static readonly Guid ClinicDemo = Guid.Parse("01000000-0000-0000-0000-000000000001");
    private static readonly Guid ClinicAlfa = Guid.Parse("01000000-0000-0000-0000-000000000002");
    private static readonly Guid ClinicBeta = Guid.Parse("01000000-0000-0000-0000-000000000003");
    private static readonly Guid ClinicHelena = Guid.Parse("01000000-0000-0000-0000-000000000004");
    private static readonly Guid ClinicGama = Guid.Parse("01000000-0000-0000-0000-000000000005");

    private static readonly Guid DoctorMarina = Guid.Parse("20000000-0000-0000-0000-000000000001");
    private static readonly Guid DoctorRafael = Guid.Parse("20000000-0000-0000-0000-000000000002");
    private static readonly Guid DoctorRenata = Guid.Parse("20000000-0000-0000-0000-000000000003");
    private static readonly Guid DoctorHelena = Guid.Parse("20000000-0000-0000-0000-000000000004");
    private static readonly Guid DoctorBrunoDemo = Guid.Parse("25000000-0000-0000-0000-000000000001");
    private static readonly Guid DoctorBrunoHelena = Guid.Parse("25000000-0000-0000-0000-000000000002");

    private static readonly Guid PatientCarlos = Guid.Parse("30000000-0000-0000-0000-000000000001");
    private static readonly Guid PatientPatricia = Guid.Parse("30000000-0000-0000-0000-000000000002");
    private static readonly Guid PatientJoao = Guid.Parse("30000000-0000-0000-0000-000000000003");
    private static readonly Guid PatientLucas = Guid.Parse("30000000-0000-0000-0000-000000000004");
    private static readonly Guid PatientCarla = Guid.Parse("33000000-0000-0000-0000-000000000001");
    private static readonly Guid PatientRoberto = Guid.Parse("33000000-0000-0000-0000-000000000002");
    private static readonly Guid PatientDaniel = Guid.Parse("33000000-0000-0000-0000-000000000003");
    private static readonly Guid PatientSofia = Guid.Parse("33000000-0000-0000-0000-000000000090");
    private static readonly Guid PatientMariana = Guid.Parse("33000000-0000-0000-0000-000000000004");
    private static readonly Guid PatientBeatriz = Guid.Parse("35000000-0000-0000-0000-000000000001");

    private static readonly Guid UserSupport = Guid.Parse("10000000-0000-0000-0000-000000000007");
    private static readonly Guid UserAnaClinica = Guid.Parse("10000000-0000-0000-0000-000000000012");
    private static readonly Guid UserHelena = Guid.Parse("14000000-0000-0000-0000-000000000001");

    private static readonly DemoAccount BeatrizAccount =
        new(Guid.Parse("15000000-0000-0000-0000-000000000001"), "Beatriz Consultório", "paciente2.consultorio@medsync.dev", ClinicRole.Patient);
    private static readonly DemoAccount BrunoAccount =
        new(Guid.Parse("15000000-0000-0000-0000-000000000002"), "Dr. Bruno Dois Locais", "medico.doislocais@medsync.dev", ClinicRole.Doctor);
    private static readonly DemoAccount GamaAdminAccount =
        new(Guid.Parse("15000000-0000-0000-0000-000000000003"), "Gustavo Clínica Gama", "clinica.analise@medsync.dev", ClinicRole.ClinicAdmin);

    // The session of tests (Brasília), 30-minute consultations from its start: the first two hours hold the massa and
    // the rest stays free at Dra. Marina and Dra. Helena (Helena also at start+30), to book through the screens. Carla
    // never sees Dra. Marina: the E2E suite checks that a clinic patient without a consultation stays out of the
    // doctor's "Pacientes vinculados".
    private static ScenarioAppointment[] SessionAppointments(int start) =>
    [
        new("50000000-0000-0000-0000-000000000001", ClinicDemo, DoctorMarina, PatientCarlos, start, 0, ConsultationModality.Online, Consent: false),
        new("50000000-0000-0000-0000-000000000002", ClinicDemo, DoctorMarina, PatientDaniel, start, 30, ConsultationModality.InPerson),
        new("50000000-0000-0000-0000-000000000003", ClinicDemo, DoctorMarina, PatientRoberto, start + 1, 0, ConsultationModality.Online, Consent: true),
        new("50000000-0000-0000-0000-000000000004", ClinicHelena, DoctorHelena, PatientLucas, start, 0, ConsultationModality.InPerson),
        new("50000000-0000-0000-0000-000000000005", ClinicHelena, DoctorHelena, PatientBeatriz, start + 1, 0, ConsultationModality.Online, Consent: true),
        new("50000000-0000-0000-0000-000000000006", ClinicAlfa, DoctorRafael, PatientPatricia, start, 0, ConsultationModality.Online, Consent: false),
        new("50000000-0000-0000-0000-000000000007", ClinicBeta, DoctorRenata, PatientJoao, start + 1, 0, ConsultationModality.InPerson),
        new("50000000-0000-0000-0000-000000000008", ClinicDemo, DoctorBrunoDemo, PatientMariana, start, 30, ConsultationModality.Online, Consent: false),
        new("50000000-0000-0000-0000-000000000009", ClinicHelena, DoctorBrunoHelena, PatientLucas, start + 1, 30, ConsultationModality.InPerson),
        new("50000000-0000-0000-0000-000000000017", ClinicDemo, DoctorBrunoDemo, PatientSofia, start + 1, 0, ConsultationModality.Online),
        new("50000000-0000-0000-0000-000000000016", ClinicDemo, DoctorBrunoDemo, PatientCarla, start, 0, ConsultationModality.InPerson),
    ];

    // The day before: what already happened, with and without documents.
    private static readonly Guid HistoryAllSigned = Guid.Parse("50000000-0000-0000-0000-000000000010");
    private static readonly Guid HistoryCancelled = Guid.Parse("50000000-0000-0000-0000-000000000011");
    private static readonly Guid HistoryNoDocuments = Guid.Parse("50000000-0000-0000-0000-000000000012");
    private static readonly Guid HistoryDrafts = Guid.Parse("50000000-0000-0000-0000-000000000013");
    private static readonly Guid HistoryNoShow = Guid.Parse("50000000-0000-0000-0000-000000000014");
    private static readonly Guid HistoryPracticeSigned = Guid.Parse("50000000-0000-0000-0000-000000000015");

    // Documents the seed signs with the simulator; the others stay as drafts for the doctor to sign in the test.
    private static readonly string[] SignedScenarioDocuments =
    [
        "51000000-0000-0000-0000-000000000001",
        "51000000-0000-0000-0000-000000000002",
        "51000000-0000-0000-0000-000000000005",
        "51000000-0000-0000-0000-000000000006",
    ];
    private const string SignedScenarioPrescription = "52000000-0000-0000-0000-000000000001";

    // Same base id, another session: another row. Stable for the same date, so restarting the API changes nothing.
    private static Guid SessionId(string baseId, DateOnly day) =>
        new(System.Security.Cryptography.SHA256.HashData(System.Text.Encoding.UTF8.GetBytes($"{baseId}|{day:yyyy-MM-dd}"))[..16]);

    private static async Task SeedScenariosAsync(
        MedSyncDbContext db,
        IPasswordService passwords,
        string demoPassword,
        ClinicalAttachmentStorage? storage,
        CancellationToken cancellationToken)
    {
        var (day, startHour, endHour) = ScenarioSession();
        // The day before; two days before when seeded in the morning, so nothing "already happened" in the future.
        var history = day.AddDays(-1);
        if (BrazilToUtc(history, 12, 0) > DateTime.UtcNow)
            history = history.AddDays(-1);

        await SeedScenarioAccountsAsync(db, passwords, demoPassword, cancellationToken);
        await db.SaveChangesAsync(cancellationToken);
        await SeedDependentAsync(db, cancellationToken);
        await db.SaveChangesAsync(cancellationToken);

        await SeedScenarioWindowsAsync(db, day.DayOfWeek, startHour, endHour, cancellationToken);
        var clinics = await db.Clinics.AsNoTracking()
            .Where(x => x.Id == ClinicDemo || x.Id == ClinicAlfa || x.Id == ClinicBeta || x.Id == ClinicHelena)
            .ToDictionaryAsync(x => x.Id, cancellationToken);
        foreach (var item in SessionAppointments(startHour))
            await EnsureScenarioAppointmentAsync(db, clinics, item with { Id = SessionId(item.Id, day).ToString() }, day, cancellationToken);
        await SeedHistoryAsync(db, clinics, history, cancellationToken);
        await db.SaveChangesAsync(cancellationToken);

        if (storage is not null)
            await SignScenarioDocumentsAsync(db, storage, history, cancellationToken);
        await SeedQueuesAsync(db, day, cancellationToken);
        await db.SaveChangesAsync(cancellationToken);
    }

    // A child without CPF on her mother's account (ADR-0006): Mariana sees her own consultations and Sofia's.
    private static async Task SeedDependentAsync(MedSyncDbContext db, CancellationToken cancellationToken)
    {
        if (await db.Patients.AnyAsync(x => x.Id == PatientSofia, cancellationToken))
            return;

        var mother = await db.Patients.SingleAsync(x => x.Id == PatientMariana, cancellationToken);
        var child = new Patient
        {
            Id = PatientSofia,
            ClinicId = mother.ClinicId,
            UserId = mother.UserId,
            Name = "Sofia Demo",
            Email = mother.Email,
            BirthDate = new DateOnly(2018, 3, 12),
            Phone = mother.Phone,
            MotherName = mother.Name,
            GuardianName = mother.Name,
            GuardianCpf = mother.Cpf,
            GuardianRelationship = "Mãe"
        };
        FillDemoIdentification(child);
        db.Patients.Add(child);
    }

    // The session of tests: TEST_SESSION_HOURS ("17-20" by default, at least 2 hours, between 6h and 23h). It is today
    // until it ends and tomorrow after that.
    public static (DateOnly Day, int StartHour, int EndHour) ScenarioSession(DateTime? utcNow = null)
    {
        var (start, end) = (17, 20);
        var configured = Environment.GetEnvironmentVariable("TEST_SESSION_HOURS")?.Split('-');
        if (configured is [var first, var last] &&
            int.TryParse(first, out var configuredStart) &&
            int.TryParse(last, out var configuredEnd) &&
            configuredStart >= 6 && configuredEnd <= 23 && configuredEnd - configuredStart >= 2)
            (start, end) = (configuredStart, configuredEnd);
        var brazilNow = (utcNow ?? DateTime.UtcNow).AddHours(-3);
        var today = DateOnly.FromDateTime(brazilNow);
        return (brazilNow.Hour < end ? today : today.AddDays(1), start, end);
    }

    private static DateTime BrazilToUtc(DateOnly day, int hour, int minute) =>
        DateTime.SpecifyKind(day.ToDateTime(new TimeOnly(hour, minute)).AddHours(3), DateTimeKind.Utc);

    private static async Task SeedScenarioAccountsAsync(
        MedSyncDbContext db,
        IPasswordService passwords,
        string demoPassword,
        CancellationToken cancellationToken)
    {
        // A second patient for the consultório, booked online in the morning of tests.
        var beatriz = await EnsureUserAsync(db, passwords, demoPassword, BeatrizAccount, cancellationToken);
        await EnsureMembershipAsync(db, ClinicHelena, beatriz.Id, ClinicRole.Patient, cancellationToken);
        await EnsurePatientAsync(db, ClinicHelena, PatientBeatriz, beatriz, "73284519637", new DateOnly(1985, 3, 22), "(11) 99999-0404", cancellationToken);

        // A doctor who works at Clínica Demo and at the consultório: "Local de atendimento" switches between them.
        var bruno = await EnsureUserAsync(db, passwords, demoPassword, BrunoAccount, cancellationToken);
        foreach (var (clinicId, doctorId) in new[] { (ClinicDemo, DoctorBrunoDemo), (ClinicHelena, DoctorBrunoHelena) })
        {
            await EnsureMembershipAsync(db, clinicId, bruno.Id, ClinicRole.Doctor, cancellationToken);
            if (!await db.Doctors.AnyAsync(x => x.Id == doctorId || (x.ClinicId == clinicId && x.UserId == bruno.Id), cancellationToken))
                db.Doctors.Add(new Doctor
                {
                    Id = doctorId,
                    ClinicId = clinicId,
                    UserId = bruno.Id,
                    Name = bruno.Name,
                    Email = bruno.Email,
                    Crm = "CRM-SP 250001",
                    CrmUf = "SP",
                    Specialty = "Clínica geral",
                    Phone = "(11) 99999-0505"
                });
        }

        // A clinic waiting for the Médico ADM, registered without an address (the legacy shape of support sign-ups).
        if (!await db.Clinics.AnyAsync(x => x.Id == ClinicGama || x.TaxId == "52345678000100" || x.Slug == "clinica-gama", cancellationToken))
            db.Clinics.Add(new Clinic
            {
                Id = ClinicGama,
                Name = "Clínica Gama",
                Slug = "clinica-gama",
                LegalName = "Clínica Gama Saúde Ltda",
                TaxId = "52345678000100",
                Phone = "(11) 3000-0005",
                ActivationStatus = ClinicActivationStatus.Pending
            });
        var gamaAdmin = await EnsureUserAsync(db, passwords, demoPassword, GamaAdminAccount, cancellationToken);
        if (db.Clinics.Local.Any(x => x.Id == ClinicGama) || await db.Clinics.AnyAsync(x => x.Id == ClinicGama, cancellationToken))
            await EnsureMembershipAsync(db, ClinicGama, gamaAdmin.Id, ClinicRole.ClinicAdmin, cancellationToken);
    }

    // Opening hours on the weekday of the session, so the patient and the front desk can book the free times. Dr. Rafael
    // (Alfa) and Dra. Renata (Beta) stay without hours: the E2E suite relies on a doctor patients cannot see yet.
    private static async Task SeedScenarioWindowsAsync(
        MedSyncDbContext db,
        DayOfWeek weekday,
        int sessionStart,
        int sessionEnd,
        CancellationToken cancellationToken)
    {
        var windows = new (string Id, Guid ClinicId, Guid DoctorId, int StartHour, int EndHour, ConsultationModality Modality)[]
        {
            ("53000000-0000-0000-0000-000000000001", ClinicDemo, DoctorMarina, sessionStart, sessionEnd, ConsultationModality.Both),
            ("53000000-0000-0000-0000-000000000002", ClinicHelena, DoctorHelena, sessionStart, sessionEnd, ConsultationModality.Both),
            ("53000000-0000-0000-0000-000000000005", ClinicDemo, DoctorBrunoDemo, sessionStart, sessionStart + 1, ConsultationModality.Both),
            ("53000000-0000-0000-0000-000000000006", ClinicHelena, DoctorBrunoHelena, sessionStart + 1, sessionStart + 2, ConsultationModality.InPerson),
        };
        foreach (var window in windows)
        {
            // One window per weekday and hours: a later session on the same weekday finds it already there.
            var id = SessionId($"{window.Id}|{weekday}|{window.StartHour}-{window.EndHour}", DateOnly.MinValue);
            var start = new TimeOnly(window.StartHour, 0);
            var end = new TimeOnly(window.EndHour, 0);
            // Someone may already have opened that morning by hand: never stack a second window on it.
            if (await db.DoctorAvailabilitySlots.AnyAsync(
                    x => x.Id == id ||
                         (x.DoctorId == window.DoctorId && x.DayOfWeek == weekday && x.StartTime < end && start < x.EndTime),
                    cancellationToken))
                continue;
            db.DoctorAvailabilitySlots.Add(new DoctorAvailabilitySlot
            {
                Id = id,
                ClinicId = window.ClinicId,
                DoctorId = window.DoctorId,
                DayOfWeek = weekday,
                StartTime = start,
                EndTime = end,
                Modality = window.Modality
            });
        }
    }

    private static async Task<Appointment?> EnsureScenarioAppointmentAsync(
        MedSyncDbContext db,
        IReadOnlyDictionary<Guid, Clinic> clinics,
        ScenarioAppointment item,
        DateOnly day,
        CancellationToken cancellationToken,
        AppointmentStatus status = AppointmentStatus.Scheduled)
    {
        var id = Guid.Parse(item.Id);
        if (await db.Appointments.AnyAsync(x => x.Id == id, cancellationToken))
            return null;
        if (!clinics.TryGetValue(item.ClinicId, out var clinic) ||
            !await db.Doctors.AnyAsync(x => x.Id == item.DoctorId, cancellationToken) ||
            !await db.Patients.AnyAsync(x => x.Id == item.PatientId, cancellationToken))
            return null;

        var scheduledAt = BrazilToUtc(day, item.Hour, item.Minute);
        // The time was taken by hand in the meantime: keep what is there. The demo appointment does not count: it
        // moves to 10 minutes from now on every start and would take a scenario time when seeded on the day itself.
        var end = scheduledAt.AddMinutes(30);
        var demoAppointments = DemoClinics.Select(x => x.AppointmentId).ToArray();
        if (await db.Appointments.AnyAsync(
                x => x.DoctorId == item.DoctorId &&
                     !demoAppointments.Contains(x.Id) &&
                     x.Status != AppointmentStatus.Cancelled &&
                     x.ScheduledAt < end &&
                     scheduledAt < x.ScheduledAt.AddMinutes(x.DurationMinutes),
                cancellationToken))
            return null;

        var appointment = new Appointment
        {
            Id = id,
            ClinicId = item.ClinicId,
            DoctorId = item.DoctorId,
            PatientId = item.PatientId,
            ScheduledAt = scheduledAt,
            DurationMinutes = 30,
            Modality = item.Modality,
            Location = item.Modality == ConsultationModality.InPerson ? clinic.FormattedAddress() : null,
            Status = status,
            Notes = "Massa de teste."
        };
        db.Appointments.Add(appointment);
        if (item.Consent)
        {
            var patientUserId = await db.Patients.Where(x => x.Id == item.PatientId).Select(x => x.UserId).SingleAsync(cancellationToken);
            if (patientUserId is { } userId)
                db.ConsentRecords.Add(new ConsentRecord
                {
                    ClinicId = item.ClinicId,
                    AppointmentId = id,
                    PatientId = item.PatientId,
                    UserId = userId,
                    TermVersion = SecurityText.ConsentTermVersion,
                    TermHash = SecurityText.ConsentTermHash(),
                    AcceptedAt = scheduledAt.AddHours(-20)
                });
        }
        return appointment;
    }

    private static async Task SeedHistoryAsync(
        MedSyncDbContext db,
        IReadOnlyDictionary<Guid, Clinic> clinics,
        DateOnly history,
        CancellationToken cancellationToken)
    {
        var marinaUser = Guid.Parse("10000000-0000-0000-0000-000000000001");
        string Id(Guid baseId) => SessionId(baseId.ToString(), history).ToString();
        string DocumentId(string baseId) => SessionId(baseId, history).ToString();

        // 09:00 online, everything signed: the patient sees "Documentos (3)", the front desk downloads the declaration.
        if (await EnsureScenarioAppointmentAsync(db, clinics,
                new(Id(HistoryAllSigned), ClinicDemo, DoctorMarina, PatientCarlos, 9, 0, ConsultationModality.Online, Consent: true),
                history, cancellationToken, AppointmentStatus.Completed) is { } allSigned)
        {
            var (joined, ended) = (allSigned.ScheduledAt.AddMinutes(1), allSigned.ScheduledAt.AddMinutes(27));
            // Closed by the doctor: the read-only example (rule D8).
            allSigned.ClosedAt = ended.AddMinutes(5);
            allSigned.ClosedByUserId = marinaUser;
            AddCompletedRoom(db, allSigned, joined, ended, patientJoined: true);
            AddClinicalRecord(db, allSigned, marinaUser, "Paciente relata cefaleia frontal há 3 dias, sem febre. Exame por vídeo sem sinais de alerta. Conduta: analgésico simples, hidratação e retorno se piora.");
            db.Prescriptions.Add(new Prescription
            {
                Id = SessionId(SignedScenarioPrescription, history),
                ClinicId = ClinicDemo,
                AppointmentId = allSigned.Id,
                PatientId = PatientCarlos,
                DoctorId = DoctorMarina,
                CreatedByUserId = marinaUser,
                PatientLocation = "São Paulo/SP",
                Notes = "Beber bastante água.",
                Items = [new PrescriptionItem { Position = 0, MedicationName = "Dipirona monoidratada", Dosage = "500 mg", Instructions = "1 comprimido a cada 6 horas se dor ou febre", Quantity = "20 comprimidos" }]
            });
            AddDocument(db, DocumentId("51000000-0000-0000-0000-000000000001"), allSigned, marinaUser, MedicalDocumentKind.Report, "Laudo médico",
                "Atesto, para os devidos fins, que o paciente foi atendido nesta data por teleconsulta, com quadro de cefaleia " +
                "tensional, sem sinais de gravidade.\n\nRecomendo repouso relativo por 24 horas e retorno em caso de piora.",
                "São Paulo/SP", null, null);
            AddDocument(db, DocumentId("51000000-0000-0000-0000-000000000002"), allSigned, marinaUser, MedicalDocumentKind.AttendanceDeclaration,
                MedicalDocumentPdf.DeclarationTitle, "", null, joined, ended);
        }

        // 09:30 in person, cancelled by the front desk.
        await EnsureScenarioAppointmentAsync(db, clinics,
            new(Id(HistoryCancelled), ClinicDemo, DoctorMarina, PatientRoberto, 9, 30, ConsultationModality.InPerson),
            history, cancellationToken, AppointmentStatus.Cancelled);

        // 10:00 in person, concluded and nothing issued yet: the doctor sees "Emita e assine a declaração".
        if (await EnsureScenarioAppointmentAsync(db, clinics,
                new(Id(HistoryNoDocuments), ClinicDemo, DoctorMarina, PatientMariana, 10, 0, ConsultationModality.InPerson),
                history, cancellationToken, AppointmentStatus.Completed) is { } noDocuments)
            AddClinicalRecord(db, noDocuments, marinaUser, "Consulta presencial de rotina. Pressão 12x8. Sem queixas. Retorno em 6 meses.");

        // 11:00 online, only drafts: the patient must see nothing until the doctor signs.
        if (await EnsureScenarioAppointmentAsync(db, clinics,
                new(Id(HistoryDrafts), ClinicDemo, DoctorMarina, PatientDaniel, 11, 0, ConsultationModality.Online, Consent: true),
                history, cancellationToken, AppointmentStatus.Completed) is { } drafts)
        {
            var (joined, ended) = (drafts.ScheduledAt.AddMinutes(2), drafts.ScheduledAt.AddMinutes(29));
            AddCompletedRoom(db, drafts, joined, ended, patientJoined: true);
            AddClinicalRecord(db, drafts, marinaUser, "Queixa de azia pós-prandial há 2 semanas. Orientações alimentares. Inibidor de bomba por 30 dias.");
            db.Prescriptions.Add(new Prescription
            {
                Id = SessionId("52000000-0000-0000-0000-000000000002", history),
                ClinicId = ClinicDemo,
                AppointmentId = drafts.Id,
                PatientId = PatientDaniel,
                DoctorId = DoctorMarina,
                CreatedByUserId = marinaUser,
                PatientLocation = "Campinas/SP",
                Items = [new PrescriptionItem { Position = 0, MedicationName = "Omeprazol", Dosage = "20 mg", Instructions = "1 cápsula em jejum por 30 dias", Quantity = "30 cápsulas" }]
            });
            AddDocument(db, DocumentId("51000000-0000-0000-0000-000000000003"), drafts, marinaUser, MedicalDocumentKind.Report, "Relatório médico",
                "Paciente em acompanhamento por dispepsia. Solicito endoscopia digestiva alta caso os sintomas persistam após 30 dias de tratamento.",
                "Campinas/SP", null, null);
            AddDocument(db, DocumentId("51000000-0000-0000-0000-000000000004"), drafts, marinaUser, MedicalDocumentKind.AttendanceDeclaration,
                MedicalDocumentPdf.DeclarationTitle, "", null, joined, ended);
        }

        // 11:30 online, the doctor waited and the patient never came in.
        if (await EnsureScenarioAppointmentAsync(db, clinics,
                new(Id(HistoryNoShow), ClinicDemo, DoctorMarina, PatientRoberto, 11, 30, ConsultationModality.Online, Consent: true),
                history, cancellationToken, AppointmentStatus.NoShow) is { } noShow)
            AddCompletedRoom(db, noShow, null, noShow.ScheduledAt.AddMinutes(15), patientJoined: false);

        // Consultório, 10:00 in person with a signed laudo and declaration: the front desk of the practice prints it.
        var helenaUser = UserHelena;
        if (await EnsureScenarioAppointmentAsync(db, clinics,
                new(Id(HistoryPracticeSigned), ClinicHelena, DoctorHelena, PatientLucas, 10, 0, ConsultationModality.InPerson),
                history, cancellationToken, AppointmentStatus.Completed) is { } practice)
        {
            AddClinicalRecord(db, practice, helenaUser, "Avaliação cardiológica de rotina. ECG sem alterações. Liberado para atividade física.");
            AddDocument(db, DocumentId("51000000-0000-0000-0000-000000000005"), practice, helenaUser, MedicalDocumentKind.Report, "Orientações ao paciente",
                "Liberado para atividade física moderada, 3 a 5 vezes por semana.\nManter acompanhamento anual.",
                null, null, null);
            AddDocument(db, DocumentId("51000000-0000-0000-0000-000000000006"), practice, helenaUser, MedicalDocumentKind.AttendanceDeclaration,
                MedicalDocumentPdf.DeclarationTitle, "", null, practice.ScheduledAt.AddMinutes(-5), practice.ScheduledAt.AddMinutes(35));
        }
    }

    private static void AddCompletedRoom(MedSyncDbContext db, Appointment appointment, DateTime? patientJoinedAt, DateTime endedAt, bool patientJoined) =>
        db.ConsultationRooms.Add(new ConsultationRoom
        {
            ClinicId = appointment.ClinicId,
            AppointmentId = appointment.Id,
            RoomName = $"medsync-{appointment.Id:N}",
            Status = VideoSessionStatus.Completed,
            StartedAt = appointment.ScheduledAt,
            EndedAt = endedAt,
            LastActivityAt = endedAt,
            DoctorJoinedAt = appointment.ScheduledAt,
            PatientJoinedAt = patientJoined ? patientJoinedAt : null
        });

    private static void AddClinicalRecord(MedSyncDbContext db, Appointment appointment, Guid doctorUserId, string content) =>
        db.ClinicalRecords.Add(new ClinicalRecord
        {
            ClinicId = appointment.ClinicId,
            AppointmentId = appointment.Id,
            CreatedByUserId = doctorUserId,
            Content = content,
            CreatedAt = appointment.ScheduledAt.AddMinutes(30),
            UpdatedAt = appointment.ScheduledAt.AddMinutes(30)
        });

    private static void AddDocument(
        MedSyncDbContext db,
        string id,
        Appointment appointment,
        Guid doctorUserId,
        MedicalDocumentKind kind,
        string title,
        string body,
        string? patientLocation,
        DateTime? startedAt,
        DateTime? endedAt) =>
        db.MedicalDocuments.Add(new MedicalDocument
        {
            Id = Guid.Parse(id),
            ClinicId = appointment.ClinicId,
            AppointmentId = appointment.Id,
            PatientId = appointment.PatientId,
            DoctorId = appointment.DoctorId,
            CreatedByUserId = doctorUserId,
            Kind = kind,
            Title = title,
            Body = body,
            PatientLocation = patientLocation,
            AttendanceStartedAt = startedAt,
            AttendanceEndedAt = endedAt,
            CreatedAt = appointment.ScheduledAt.AddMinutes(35),
            UpdatedAt = appointment.ScheduledAt.AddMinutes(35)
        });

    // Signs the sample documents with the simulator, and signs again when the PDF file is gone (a new container
    // without the volume), so "Baixar PDF" never ends in "not found".
    private static async Task SignScenarioDocumentsAsync(
        MedSyncDbContext db,
        ClinicalAttachmentStorage storage,
        DateOnly history,
        CancellationToken cancellationToken)
    {
        // This session's documents, and the ones of the first massa (fixed ids, created before sessions existed).
        var documentIds = SignedScenarioDocuments.Select(Guid.Parse)
            .Concat(SignedScenarioDocuments.Select(x => SessionId(x, history)))
            .ToList();
        var prescriptionIds = new[] { Guid.Parse(SignedScenarioPrescription), SessionId(SignedScenarioPrescription, history) };
        var simulator = new SimulatedSignatureProvider();
        var signer = simulator.CreatePdfSigner(
            new SigningSession(simulator.Name, "seed", "seed", DateTime.UtcNow.AddMinutes(10), Simulated: true), cancellationToken);
        bool Missing(string? key) => key is null || !File.Exists(storage.GetAbsolutePath(key));

        var documents = await db.MedicalDocuments
            .Include(x => x.Appointment).ThenInclude(x => x.Doctor)
            .Include(x => x.Appointment).ThenInclude(x => x.Patient)
            .Include(x => x.Appointment).ThenInclude(x => x.Clinic)
            .Where(x => documentIds.Contains(x.Id))
            .ToListAsync(cancellationToken);
        foreach (var document in documents.Where(x => x.Status == MedicalDocumentStatus.Draft || Missing(x.SignedDocumentKey)))
        {
            var signedAt = document.SignedAt ?? document.Appointment.ScheduledAt.AddMinutes(40);
            var (key, sha256) = await ApiEndpoints.RenderAndSignMedicalDocumentAsync(storage, document, signedAt, signer, simulated: true);
            document.Status = MedicalDocumentStatus.Signed;
            document.SignedAt = signedAt;
            document.SignedDocumentKey = key;
            document.SignedDocumentSha256 = sha256;
            document.SignatureSimulated = true;
        }

        var prescriptions = await db.Prescriptions
            .Include(x => x.Items)
            .Include(x => x.Appointment).ThenInclude(x => x.Doctor)
            .Include(x => x.Appointment).ThenInclude(x => x.Patient)
            .Include(x => x.Appointment).ThenInclude(x => x.Clinic)
            .Where(x => prescriptionIds.Contains(x.Id))
            .ToListAsync(cancellationToken);
        foreach (var prescription in prescriptions.Where(x => x.Status == PrescriptionStatus.Draft || Missing(x.SignedDocumentKey)))
        {
            var signedAt = prescription.SignedAt ?? prescription.Appointment.ScheduledAt.AddMinutes(38);
            var (key, sha256) = await ApiEndpoints.RenderAndSignPrescriptionAsync(storage, prescription, signedAt, signer, simulated: true);
            prescription.Status = PrescriptionStatus.Signed;
            prescription.SignedAt = signedAt;
            prescription.SignedDocumentKey = key;
            prescription.SignedDocumentSha256 = sha256;
            prescription.SignatureSimulated = true;
        }
        await db.SaveChangesAsync(cancellationToken);
    }

    // Queues of the MedSync team: support, LGPD and monthly fees in every state. Invoice ids differ in the first 8
    // characters, which make the invoice code (the Pix identifier).
    private static async Task SeedQueuesAsync(MedSyncDbContext db, DateOnly day, CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var users = await db.Users.AsNoTracking()
            .Where(x => x.Id == UserAnaClinica || x.Id == UserHelena || x.Id == Guid.Parse("10000000-0000-0000-0000-000000000002") || x.Id == Guid.Parse("13000000-0000-0000-0000-000000000001"))
            .ToDictionaryAsync(x => x.Id, cancellationToken);

        var supportRequests = new[]
        {
            new SupportRequest
            {
                Id = Guid.Parse("57000000-0000-0000-0000-000000000001"), ClinicId = ClinicDemo, CreatedByUserId = UserAnaClinica,
                RequesterName = "Ana Clínica", RequesterEmail = "clinica.admin@medsync.dev",
                Subject = "Dúvida sobre a mensalidade de outubro",
                Description = "O valor da fatura de outubro está diferente do mês passado. Pode confirmar o plano?",
                CreatedAt = now.AddHours(-20), UpdatedAt = now.AddHours(-20)
            },
            new SupportRequest
            {
                Id = Guid.Parse("57000000-0000-0000-0000-000000000002"), ClinicId = ClinicHelena, CreatedByUserId = UserHelena,
                RequesterName = "Dra. Helena Souza", RequesterEmail = "consultorio@medsync.dev",
                Subject = "Corrigir a especialidade no cadastro",
                Description = "Minha especialidade aparece como Cardiologia; preciso incluir o RQE.",
                Status = SupportRequestStatus.InProgress, ResolutionNote = "Pedimos o número do RQE por e-mail.",
                UpdatedByUserId = UserSupport, CreatedAt = now.AddDays(-2), UpdatedAt = now.AddDays(-1)
            },
        };
        foreach (var request in supportRequests.Where(x => users.ContainsKey(x.CreatedByUserId)))
            if (!await db.SupportRequests.AnyAsync(x => x.Id == request.Id, cancellationToken))
                db.SupportRequests.Add(request);

        var privacyRequests = new[]
        {
            new PrivacyRequest
            {
                Id = Guid.Parse("58000000-0000-0000-0000-000000000001"), ClinicId = ClinicDemo,
                CreatedByUserId = Guid.Parse("10000000-0000-0000-0000-000000000002"),
                RequesterName = "Carlos Oliveira", RequesterEmail = "paciente@medsync.dev", SubjectReference = "Próprio titular",
                Type = PrivacyRequestType.Access,
                Description = "Quero uma cópia de todos os meus dados cadastrados no MedSync.",
                CreatedAt = now.AddHours(-30), UpdatedAt = now.AddHours(-30)
            },
            new PrivacyRequest
            {
                Id = Guid.Parse("58000000-0000-0000-0000-000000000002"), ClinicId = ClinicDemo,
                CreatedByUserId = Guid.Parse("13000000-0000-0000-0000-000000000001"),
                RequesterName = "Carla MedSync", RequesterEmail = "paciente2@medsync.dev", SubjectReference = "Próprio titular",
                Type = PrivacyRequestType.Correction, Status = PrivacyRequestStatus.Resolved,
                Description = "Meu telefone está errado no cadastro.",
                ResolutionNote = "Telefone corrigido pela recepção da clínica.",
                CreatedAt = now.AddDays(-5), UpdatedAt = now.AddDays(-4)
            },
        };
        foreach (var request in privacyRequests.Where(x => users.ContainsKey(x.CreatedByUserId)))
            if (!await db.PrivacyRequests.AnyAsync(x => x.Id == request.Id, cancellationToken))
                db.PrivacyRequests.Add(request);

        // Open this month, paid last month, overdue at Alfa, "já paguei" waiting for confirmation at the consultório.
        var month = new DateOnly(day.Year, day.Month, 1);
        var previous = month.AddMonths(-1);
        var invoices = new[]
        {
            new ClinicInvoice
            {
                Id = Guid.Parse("59000001-0000-0000-0000-000000000000"), ClinicId = ClinicDemo, Reference = $"{month:yyyy-MM}",
                Description = $"Mensalidade MedSync — Plano Demo — {month.ToString("MMMM/yyyy", PtBrCulture)}", Amount = 199.90m,
                DueDate = day.AddDays(10), CreatedByUserId = UserSupport
            },
            new ClinicInvoice
            {
                Id = Guid.Parse("59000002-0000-0000-0000-000000000000"), ClinicId = ClinicDemo, Reference = $"{previous:yyyy-MM}",
                Description = $"Mensalidade MedSync — Plano Demo — {previous.ToString("MMMM/yyyy", PtBrCulture)}", Amount = 199.90m,
                DueDate = previous.AddDays(9), Status = InvoiceStatus.Paid, PaidOn = previous.AddDays(8),
                PaymentMethod = InvoicePaymentMethod.Pix, PaymentNote = "Pix identificado no extrato.",
                ConfirmedAt = now.AddDays(-30), ConfirmedByUserId = UserSupport, CreatedByUserId = UserSupport
            },
            new ClinicInvoice
            {
                Id = Guid.Parse("59000003-0000-0000-0000-000000000000"), ClinicId = ClinicAlfa, Reference = $"{previous:yyyy-MM}",
                Description = $"Mensalidade MedSync — Plano Alfa — {previous.ToString("MMMM/yyyy", PtBrCulture)}", Amount = 349.90m,
                DueDate = previous.AddDays(9), CreatedByUserId = UserSupport
            },
            new ClinicInvoice
            {
                Id = Guid.Parse("59000004-0000-0000-0000-000000000000"), ClinicId = ClinicHelena, Reference = $"{month:yyyy-MM}",
                Description = $"Mensalidade MedSync — Plano Consultório — {month.ToString("MMMM/yyyy", PtBrCulture)}", Amount = 149.90m,
                DueDate = day.AddDays(5), Status = InvoiceStatus.PaymentInformed, InformedAt = now.AddHours(-3),
                InformedByUserId = UserHelena, InformedNote = "Pix enviado hoje de manhã.", CreatedByUserId = UserSupport
            },
        };
        foreach (var invoice in invoices)
        {
            // One fee per clinic and month: a fee launched by hand for that month wins.
            if (await db.ClinicInvoices.AnyAsync(
                    x => x.Id == invoice.Id ||
                         (x.ClinicId == invoice.ClinicId && x.Reference == invoice.Reference && x.Status != InvoiceStatus.Cancelled),
                    cancellationToken))
                continue;
            db.ClinicInvoices.Add(invoice);
        }
    }

    private static readonly System.Globalization.CultureInfo PtBrCulture = System.Globalization.CultureInfo.GetCultureInfo("pt-BR");

    private sealed record ScenarioAppointment(
        string Id,
        Guid ClinicId,
        Guid DoctorId,
        Guid PatientId,
        int Hour,
        int Minute,
        ConsultationModality Modality,
        bool Consent = false);
}
