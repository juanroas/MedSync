using System.Globalization;
using System.Security.Claims;
using System.Text;
using MedSync.Application;
using MedSync.Domain;
using MedSync.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace MedSync.Api;

// Reports (14/10/2026): agenda production of the clinic or consultório, the doctor's own production, the LGPD report
// of who accessed a patient's data, and the attendance declaration. None carries clinical content (rule C5): names,
// dates, outcomes and counts only. Prescription counts appear only in the doctor's own report.
public static partial class ApiEndpoints
{
    private static readonly TimeSpan BrazilOffset = TimeSpan.FromHours(-3);
    private const int ReportMaxDays = 366;
    private const int ReportMaxItems = 2000;

    private static void MapReportEndpoints(RouteGroupBuilder protectedApi)
    {
        protectedApi.MapGet("/reports/appointments", GetAppointmentReport);
        protectedApi.MapGet("/reports/appointments/pdf", GetAppointmentReportPdf);
        protectedApi.MapGet("/reports/appointments/csv", GetAppointmentReportCsv);
        protectedApi.MapGet("/me/data-access-report", GetMyDataAccessReport);
        // POST so the CPF never travels in the URL.
        protectedApi.MapPost("/privacy/data-access-report", CreateDataAccessReport);
        protectedApi.MapGet("/appointments/{id:guid}/attendance-declaration", GetAttendanceDeclaration);
    }

    private static async Task<IResult> GetAppointmentReport(
        string? from,
        string? to,
        Guid? doctorId,
        string? modality,
        ClaimsPrincipal principal,
        MedSyncDbContext db,
        AuditWriter audit,
        CancellationToken cancellationToken)
    {
        var actor = RequestContext.From(principal);
        var (error, report) = await BuildAppointmentReportAsync(actor, from, to, doctorId, modality, db, audit, cancellationToken);
        return error ?? Results.Ok(report);
    }

    private static async Task<IResult> GetAppointmentReportPdf(
        string? from,
        string? to,
        Guid? doctorId,
        string? modality,
        ClaimsPrincipal principal,
        MedSyncDbContext db,
        AuditWriter audit,
        CancellationToken cancellationToken)
    {
        var actor = RequestContext.From(principal);
        var (error, report) = await BuildAppointmentReportAsync(actor, from, to, doctorId, modality, db, audit, cancellationToken);
        if (error is not null)
            return error;
        var generatedBy = await db.Users.AsNoTracking().Where(x => x.Id == actor.UserId).Select(x => x.Name).SingleAsync(cancellationToken);
        return Results.File(ReportPdf.Appointments(report!, generatedBy), "application/pdf", $"atendimentos-{report!.From:yyyy-MM-dd}-a-{report.To:yyyy-MM-dd}.pdf");
    }

    private static async Task<IResult> GetAppointmentReportCsv(
        string? from,
        string? to,
        Guid? doctorId,
        string? modality,
        ClaimsPrincipal principal,
        MedSyncDbContext db,
        AuditWriter audit,
        CancellationToken cancellationToken)
    {
        var actor = RequestContext.From(principal);
        var (error, report) = await BuildAppointmentReportAsync(actor, from, to, doctorId, modality, db, audit, cancellationToken);
        if (error is not null)
            return error;
        return Results.File(AppointmentReportCsv(report!), "text/csv; charset=utf-8", $"atendimentos-{report!.From:yyyy-MM-dd}-a-{report.To:yyyy-MM-dd}.csv");
    }

    private static async Task<(IResult? Error, AppointmentReportResponse? Report)> BuildAppointmentReportAsync(
        RequestContext actor,
        string? from,
        string? to,
        Guid? doctorId,
        string? modality,
        MedSyncDbContext db,
        AuditWriter audit,
        CancellationToken cancellationToken)
    {
        // Clinic staff (ADM, Recepção, consultório owner) see the whole clinic; a doctor sees only their own care.
        var seesClinic = !actor.IsPlatformStaff && actor.HasAny(AccessRules.ViewAllAppointments);
        var isDoctor = !actor.IsPlatformStaff && actor.HasAny(ClinicRole.Doctor);
        if (!seesClinic && !isDoctor)
        {
            audit.Add(actor, "Report.Appointments", "Clinic", actor.ClinicId, "Denied", "Perfil sem relatório de atendimentos.");
            await db.SaveChangesAsync(cancellationToken);
            return (Results.Forbid(), null);
        }

        var today = DateOnly.FromDateTime(DateTime.UtcNow.Add(BrazilOffset));
        var parsedFrom = ParseReportDate(from);
        var parsedTo = ParseReportDate(to);
        if ((!string.IsNullOrWhiteSpace(from) && parsedFrom is null) || (!string.IsNullOrWhiteSpace(to) && parsedTo is null))
            return (Validation("period", "Informe as datas no formato AAAA-MM-DD."), null);
        var start = parsedFrom ?? new DateOnly(today.Year, today.Month, 1);
        var end = parsedTo ?? start.AddMonths(1).AddDays(-1);
        if (end < start)
            return (Validation("period", "A data final precisa ser igual ou depois da inicial."), null);
        if (end.DayNumber - start.DayNumber + 1 > ReportMaxDays)
            return (Validation("period", "O período pode ter até 366 dias."), null);

        ConsultationModality? modalityFilter = null;
        if (!string.IsNullOrWhiteSpace(modality))
        {
            if (!Enum.TryParse<ConsultationModality>(modality, true, out var parsed) || parsed == ConsultationModality.Both)
                return (Validation("modality", "Modalidade deve ser Online ou InPerson."), null);
            modalityFilter = parsed;
        }

        var ownDoctorId = isDoctor
            ? await db.Doctors.AsNoTracking()
                .Where(x => x.ClinicId == actor.ClinicId && x.UserId == actor.UserId)
                .Select(x => (Guid?)x.Id)
                .FirstOrDefaultAsync(cancellationToken)
            : null;
        if (!seesClinic)
        {
            if (ownDoctorId is null || (doctorId is not null && doctorId != ownDoctorId))
            {
                audit.Add(actor, "Report.Appointments", "Doctor", doctorId, "Denied", "Médico só vê a própria produção.");
                await db.SaveChangesAsync(cancellationToken);
                return (Results.Forbid(), null);
            }
            doctorId = ownDoctorId;
        }

        string? doctorFilter = null;
        if (doctorId is not null)
        {
            doctorFilter = await db.Doctors.AsNoTracking()
                .Where(x => x.Id == doctorId && x.ClinicId == actor.ClinicId)
                .Select(x => x.Name)
                .SingleOrDefaultAsync(cancellationToken);
            if (doctorFilter is null)
                return (Results.NotFound(), null);
        }

        var fromUtc = start.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc) - BrazilOffset;
        var toUtc = end.AddDays(1).ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc) - BrazilOffset;
        var query = db.Appointments.AsNoTracking()
            .Where(x => x.ClinicId == actor.ClinicId && x.ScheduledAt >= fromUtc && x.ScheduledAt < toUtc);
        if (doctorId is not null)
            query = query.Where(x => x.DoctorId == doctorId);
        if (modalityFilter is not null)
            query = query.Where(x => x.Modality == modalityFilter);
        var rows = await query
            .OrderBy(x => x.ScheduledAt)
            .Select(x => new
            {
                x.Id,
                x.ScheduledAt,
                x.DurationMinutes,
                x.Status,
                x.Modality,
                x.DoctorId,
                DoctorName = x.Doctor.Name,
                PatientName = x.Patient.SocialName != null && x.Patient.SocialName != "" ? x.Patient.SocialName : x.Patient.Name
            })
            .ToListAsync(cancellationToken);

        var now = DateTime.UtcNow;
        var items = rows
            .Select(x => new AppointmentReportItem(
                x.Id,
                x.ScheduledAt,
                x.DurationMinutes,
                x.PatientName,
                x.DoctorId,
                x.DoctorName,
                x.Modality,
                ReportOutcome(x.Status, x.ScheduledAt, x.DurationMinutes, now)))
            .ToList();
        var byDoctor = items
            .GroupBy(x => (x.DoctorId, x.DoctorName))
            .Select(x => new AppointmentReportDoctorRow(x.Key.DoctorId, x.Key.DoctorName, ReportTotals(x)))
            .OrderBy(x => x.DoctorName)
            .ToList();

        PrescriptionReportTotals? prescriptions = null;
        if (ownDoctorId is not null && (doctorId is null || doctorId == ownDoctorId))
        {
            var issued = await db.Prescriptions.AsNoTracking()
                .Where(x => x.DoctorId == ownDoctorId && x.Status != PrescriptionStatus.Cancelled)
                .Where(x => modalityFilter == null || x.Appointment.Modality == modalityFilter)
                .Select(x => new { x.Kind, x.Status, IssuedAt = x.SignedAt ?? x.IssuedOnPaperAt ?? x.CreatedAt })
                .Where(x => x.IssuedAt >= fromUtc && x.IssuedAt < toUtc)
                .ToListAsync(cancellationToken);
            prescriptions = new PrescriptionReportTotals(
                issued.Count,
                issued.Count(x => x.Status == PrescriptionStatus.Signed),
                issued.Count(x => x.Status == PrescriptionStatus.IssuedOnPaper),
                issued.Count(x => x.Status == PrescriptionStatus.Draft),
                issued.Count(x => x.Kind == PrescriptionKind.Simple),
                issued.Count(x => x.Kind == PrescriptionKind.Antimicrobial),
                issued.Count(x => x.Kind == PrescriptionKind.ControlledSpecial));
        }

        var clinicName = await db.Clinics.AsNoTracking().Where(x => x.Id == actor.ClinicId).Select(x => x.Name).SingleAsync(cancellationToken);
        audit.Add(actor, "Report.Appointments", "Clinic", actor.ClinicId, reason: $"{start:yyyy-MM-dd} a {end:yyyy-MM-dd}");
        await db.SaveChangesAsync(cancellationToken);
        return (null, new AppointmentReportResponse(
            clinicName,
            start,
            end,
            seesClinic ? "clinic" : "own",
            doctorFilter,
            modalityFilter,
            ReportTotals(items),
            byDoctor,
            items.Take(ReportMaxItems).ToList(),
            items.Count > ReportMaxItems,
            prescriptions,
            now));
    }

    private static DateOnly? ParseReportDate(string? value) =>
        DateOnly.TryParseExact(value?.Trim(), "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var date)
            ? date
            : null;

    // Same reading as the agenda: a consultation whose time (+15 min of tolerance) passed without being concluded was
    // not held.
    internal static string ReportOutcome(AppointmentStatus status, DateTime scheduledAtUtc, int durationMinutes, DateTime nowUtc) =>
        status switch
        {
            AppointmentStatus.Completed => "Completed",
            AppointmentStatus.NoShow => "NoShow",
            AppointmentStatus.Cancelled => "Cancelled",
            _ when nowUtc > scheduledAtUtc.AddMinutes(durationMinutes + 15) => "NotHeld",
            _ => "Upcoming"
        };

    internal static string ReportOutcomeLabel(string outcome) => outcome switch
    {
        "Completed" => "Realizada",
        "NoShow" => "Paciente faltou",
        "NotHeld" => "Não realizada",
        "Cancelled" => "Cancelada",
        _ => "A realizar"
    };

    private static AppointmentReportTotals ReportTotals(IEnumerable<AppointmentReportItem> source)
    {
        var items = source.ToList();
        var active = items.Where(x => x.Outcome != "Cancelled").ToList();
        return new AppointmentReportTotals(
            items.Count,
            items.Count(x => x.Outcome == "Completed"),
            items.Count(x => x.Outcome == "NoShow"),
            items.Count(x => x.Outcome == "NotHeld"),
            items.Count(x => x.Outcome == "Cancelled"),
            items.Count(x => x.Outcome == "Upcoming"),
            active.Count(x => x.Modality == ConsultationModality.Online),
            active.Count(x => x.Modality == ConsultationModality.InPerson));
    }

    // Semicolon-separated with BOM, so Excel in Portuguese opens it with accents and columns right.
    internal static byte[] AppointmentReportCsv(AppointmentReportResponse report)
    {
        var csv = new StringBuilder();
        csv.AppendLine("Data;Horário;Paciente;Médico;Modalidade;Situação");
        foreach (var item in report.Items)
        {
            var local = item.ScheduledAt.Add(BrazilOffset);
            csv.AppendLine(string.Join(';',
                local.ToString("dd/MM/yyyy", CultureInfo.InvariantCulture),
                local.ToString("HH:mm", CultureInfo.InvariantCulture),
                CsvCell(item.PatientName),
                CsvCell(item.DoctorName),
                item.Modality == ConsultationModality.InPerson ? "Presencial" : "Online",
                ReportOutcomeLabel(item.Outcome)));
        }
        return [.. Encoding.UTF8.GetPreamble(), .. Encoding.UTF8.GetBytes(csv.ToString())];
    }

    // Quotes the cell and neutralizes formulas (=, +, -, @) so a name never runs as a spreadsheet command.
    internal static string CsvCell(string value)
    {
        var text = value.Replace("\"", "\"\"");
        if (text.Length > 0 && "=+-@\t\r".Contains(text[0]))
            text = "'" + text;
        return $"\"{text}\"";
    }

    private static async Task<IResult> GetMyDataAccessReport(
        ClaimsPrincipal principal,
        MedSyncDbContext db,
        AuditWriter audit,
        CancellationToken cancellationToken)
    {
        var actor = RequestContext.From(principal);
        if (!actor.HasAny(ClinicRole.Patient))
        {
            audit.Add(actor, "Privacy.DataAccessReport", "User", actor.UserId, "Denied", "Só o titular baixa o próprio relatório.");
            await db.SaveChangesAsync(cancellationToken);
            return Results.Forbid();
        }

        var patients = await db.Patients.AsNoTracking().Where(x => x.UserId == actor.UserId).ToListAsync(cancellationToken);
        if (patients.Count == 0)
            return Results.NotFound();
        // The titular's own actions are left out: the report answers "who else touched my data".
        var entries = await DataAccessEntriesAsync(db, patients, actor.UserId, cancellationToken);
        audit.Add(actor, "Privacy.DataAccessReport", "Patient", patients[0].Id);
        await db.SaveChangesAsync(cancellationToken);
        var pdf = ReportPdf.DataAccess(patients[0].Name, patients[0].Cpf, entries, "o próprio titular", DateTime.UtcNow);
        return Results.File(pdf, "application/pdf", "acessos-aos-meus-dados.pdf");
    }

    // The DPO answers a titular's request that arrived by another channel (LGPD art. 18 and 19).
    private static async Task<IResult> CreateDataAccessReport(
        DataAccessReportRequest request,
        ClaimsPrincipal principal,
        MedSyncDbContext db,
        AuditWriter audit,
        CancellationToken cancellationToken)
    {
        var actor = RequestContext.From(principal);
        if (!actor.IsDpo)
        {
            audit.Add(actor, "Privacy.DataAccessReport", "Patient", null, "Denied", "Só o DPO gera o relatório de outro titular.");
            await db.SaveChangesAsync(cancellationToken);
            return Results.Forbid();
        }
        var cpf = DigitsOnly(request.Cpf ?? "");
        if (!IsValidCpf(cpf))
            return Validation("cpf", "Informe o CPF completo do titular.");

        var patients = await db.Patients.AsNoTracking().Where(x => x.Cpf == cpf).ToListAsync(cancellationToken);
        if (patients.Count == 0)
            return Results.NotFound(new { message = "Nenhum paciente com este CPF no MedSync." });
        var entries = await DataAccessEntriesAsync(db, patients, null, cancellationToken);
        audit.Add(actor, "Privacy.DataAccessReport", "Patient", patients[0].Id);
        await db.SaveChangesAsync(cancellationToken);
        var dpoName = await db.Users.AsNoTracking().Where(x => x.Id == actor.UserId).Select(x => x.Name).SingleAsync(cancellationToken);
        var pdf = ReportPdf.DataAccess(patients[0].Name, patients[0].Cpf, entries, $"{dpoName} (DPO MedSync)", DateTime.UtcNow);
        return Results.File(pdf, "application/pdf", "relatorio-de-acessos-titular.pdf");
    }

    private static async Task<IReadOnlyList<DataAccessEntry>> DataAccessEntriesAsync(
        MedSyncDbContext db,
        IReadOnlyList<Patient> patients,
        Guid? excludeUserId,
        CancellationToken cancellationToken)
    {
        var patientIds = patients.Select(x => x.Id).ToList();
        var appointmentIds = await db.Appointments.AsNoTracking()
            .Where(x => patientIds.Contains(x.PatientId)).Select(x => x.Id).ToListAsync(cancellationToken);
        var prescriptionIds = await db.Prescriptions.AsNoTracking()
            .Where(x => patientIds.Contains(x.PatientId)).Select(x => x.Id).ToListAsync(cancellationToken);
        var grantIds = await db.ClinicalAccessGrants.AsNoTracking()
            .Where(x => patientIds.Contains(x.PatientId)).Select(x => x.Id).ToListAsync(cancellationToken);
        var patientKeys = patientIds.Select(x => x.ToString()).ToList();
        var appointmentKeys = appointmentIds.Select(x => x.ToString()).ToList();
        var prescriptionKeys = prescriptionIds.Select(x => x.ToString()).ToList();
        var grantKeys = grantIds.Select(x => x.ToString()).ToList();

        var events = await db.AuditEvents.AsNoTracking()
            .Where(x => x.ResourceId != null && (
                (x.ResourceType == "Patient" && patientKeys.Contains(x.ResourceId)) ||
                (x.ResourceType == "Appointment" && appointmentKeys.Contains(x.ResourceId)) ||
                (x.ResourceType == "Prescription" && prescriptionKeys.Contains(x.ResourceId)) ||
                (x.ResourceType == "ClinicalAccessGrant" && grantKeys.Contains(x.ResourceId))))
            .Where(x => excludeUserId == null || x.ActorUserId != excludeUserId)
            .OrderByDescending(x => x.CreatedAt)
            .Take(ReportMaxItems)
            .ToListAsync(cancellationToken);

        var actorIds = events.Where(x => x.ActorUserId != null).Select(x => x.ActorUserId!.Value).Distinct().ToList();
        var names = await db.Users.AsNoTracking()
            .Where(x => actorIds.Contains(x.Id))
            .ToDictionaryAsync(x => x.Id, x => x.Name, cancellationToken);
        var memberships = await db.ClinicMemberships.AsNoTracking()
            .Where(x => actorIds.Contains(x.UserId))
            .Select(x => new { x.UserId, x.ClinicId, x.Role })
            .ToListAsync(cancellationToken);
        var clinicIds = events.Where(x => x.ClinicId != null).Select(x => x.ClinicId!.Value).Distinct().ToList();
        var clinics = await db.Clinics.AsNoTracking()
            .Where(x => clinicIds.Contains(x.Id))
            .ToDictionaryAsync(x => x.Id, x => x.Name, cancellationToken);
        var patientUserIds = patients.Where(x => x.UserId != null).Select(x => x.UserId!.Value).ToHashSet();

        var entries = events.Select(item =>
        {
            var who = item.ActorUserId is { } id && names.TryGetValue(id, out var name) ? name : "Sistema MedSync";
            var profile = item.ActorUserId is { } actorId
                ? patientUserIds.Contains(actorId)
                    ? "Titular"
                    : string.Join(" / ", memberships
                        .Where(x => x.UserId == actorId && x.ClinicId == item.ClinicId)
                        .Select(x => RoleLabel(x.Role))
                        .Distinct())
                : "";
            var place = item.ClinicId is { } clinicId && clinics.TryGetValue(clinicId, out var clinicName) ? clinicName : "";
            return new DataAccessEntry(
                item.CreatedAt,
                who,
                string.IsNullOrEmpty(profile) ? "—" : profile,
                AuditActionLabel(item.Action),
                item.Result == "Denied" ? "Negado" : "Permitido",
                place);
        }).ToList();

        // The same person repeating the same action in the same minute (opening a screen that loads several parts)
        // becomes one line with the count, so the titular reads who did what instead of a wall of repeats.
        var merged = new List<DataAccessEntry>();
        var repeats = 1;
        for (var i = 0; i < entries.Count; i++)
        {
            var next = i + 1 < entries.Count ? entries[i + 1] : null;
            if (next is not null && SameAccess(entries[i], next))
            {
                repeats++;
                continue;
            }
            merged.Add(repeats > 1 ? entries[i] with { Action = $"{entries[i].Action} ({repeats} vezes)" } : entries[i]);
            repeats = 1;
        }
        return merged;
    }

    private static bool SameAccess(DataAccessEntry a, DataAccessEntry b) =>
        a.Actor == b.Actor && a.Profile == b.Profile && a.Action == b.Action && a.Result == b.Result && a.Place == b.Place &&
        a.AtUtc.ToString("yyyyMMddHHmm") == b.AtUtc.ToString("yyyyMMddHHmm");

    internal static string RoleLabel(ClinicRole role) => role switch
    {
        ClinicRole.Patient => "Paciente",
        ClinicRole.Doctor => "Médico",
        ClinicRole.ClinicAdmin => "ADM da clínica",
        ClinicRole.Receptionist => "Recepção",
        ClinicRole.MedicalDirector => "Médico ADM MedSync",
        ClinicRole.Support => "Suporte MedSync",
        ClinicRole.DataProtectionOfficer => "DPO MedSync",
        _ => role.ToString()
    };

    // Plain words for the titular; the technical name stays in the audit trail.
    internal static string AuditActionLabel(string action) => action switch
    {
        "Patient.Create" => "Cadastrou o paciente",
        "Patient.Update" => "Alterou o cadastro",
        "Appointment.Create" => "Agendou consulta",
        "Appointment.Request" => "Solicitou consulta",
        "Appointment.Read" => "Abriu os dados da consulta",
        "Appointment.Cancel" => "Cancelou consulta",
        "Appointment.AttendanceDeclaration" => "Emitiu declaração de comparecimento",
        "Consent.Accept" => "Aceitou o termo de telemedicina",
        "Consultation.Start" => "Iniciou a consulta",
        "Consultation.End" => "Concluiu a consulta",
        "Consultation.NoShow" => "Registrou que o paciente faltou",
        "Video.TokenIssued" => "Entrou na sala de vídeo",
        "ClinicalRecord.Read" => "Leu o prontuário da consulta",
        "ClinicalRecord.Save" => "Registrou no prontuário",
        "ClinicalRecord.History" => "Consultou o histórico clínico",
        "ClinicalRecord.ReadByGrant" => "Leu o prontuário com justificativa",
        "ClinicalAccess.Grant" => "Abriu acesso ao prontuário com justificativa",
        "ClinicalAccess.PatientLookup" => "Buscou o paciente pelo CPF (acesso com justificativa)",
        "ClinicalRecordAttachment.Upload" => "Enviou anexo ao prontuário",
        "ClinicalRecordAttachment.List" => "Listou os anexos do prontuário",
        "ClinicalRecordAttachment.Download" => "Baixou anexo do prontuário",
        "ClinicalRecordAttachment.Delete" => "Excluiu anexo do prontuário",
        "Prescription.Create" => "Criou receita",
        "Prescription.List" => "Consultou as receitas da consulta",
        "Prescription.View" => "Abriu receita",
        "Prescription.Update" => "Editou receita",
        "Prescription.SignStart" => "Iniciou a assinatura de receita",
        "Prescription.Sign" => "Assinou receita",
        "Prescription.IssuePaper" => "Emitiu receita para assinar fora do MedSync",
        "Prescription.DownloadPdf" => "Baixou o PDF da receita",
        "Prescription.DeleteDraft" => "Excluiu rascunho de receita",
        "Prescription.MedicationsInUse" => "Consultou as medicações em uso",
        "Privacy.DataAccessReport" => "Gerou o relatório de acessos (LGPD)",
        _ => action
    };

    private static async Task<IResult> GetAttendanceDeclaration(
        Guid id,
        ClaimsPrincipal principal,
        MedSyncDbContext db,
        AuditWriter audit,
        CancellationToken cancellationToken)
    {
        var actor = RequestContext.From(principal);
        var appointment = await db.Appointments.AsNoTracking()
            .Include(x => x.Patient)
            .Include(x => x.Doctor)
            .Include(x => x.Clinic)
            .Include(x => x.ConsultationRoom)
            .SingleOrDefaultAsync(x => x.Id == id && x.ClinicId == actor.ClinicId, cancellationToken);
        if (appointment is null)
            return Results.NotFound();
        var isStaff = !actor.IsPlatformStaff && actor.HasAny(AccessRules.ManageAppointments);
        if (!IsPatient(actor, appointment) && !IsAssignedDoctor(actor, appointment) && !isStaff)
        {
            audit.Add(actor, "Appointment.AttendanceDeclaration", "Appointment", appointment.Id, "Denied", "Perfil sem acesso à declaração.");
            await db.SaveChangesAsync(cancellationToken);
            return Results.Forbid();
        }
        if (appointment.Status != AppointmentStatus.Completed)
            return Results.Conflict(new { message = "A declaração de comparecimento sai depois que a consulta é concluída." });

        // Online: from when the patient entered the room until the doctor closed it; in person: the booked time.
        var room = appointment.ConsultationRoom;
        var startedAt = room?.PatientJoinedAt ?? room?.StartedAt ?? appointment.ScheduledAt;
        var endedAt = room?.EndedAt ?? appointment.ScheduledAt.AddMinutes(appointment.DurationMinutes);
        if (endedAt <= startedAt)
            endedAt = startedAt.AddMinutes(appointment.DurationMinutes);

        var clinic = appointment.Clinic;
        var data = new AttendanceDeclarationData(
            appointment.Id,
            clinic.Name,
            clinic.LegalName,
            clinic.TaxId,
            clinic.FormattedAddress(),
            clinic.Phone,
            clinic.AddressCity,
            appointment.Patient.Name,
            string.IsNullOrWhiteSpace(appointment.Patient.SocialName) ? null : appointment.Patient.SocialName,
            appointment.Patient.Cpf,
            appointment.Doctor.Name,
            PrescriptionPdf.FormatCrm(appointment.Doctor.Crm, appointment.Doctor.CrmUf),
            appointment.Modality == ConsultationModality.InPerson,
            startedAt,
            endedAt,
            DateTime.UtcNow);
        audit.Add(actor, "Appointment.AttendanceDeclaration", "Appointment", appointment.Id);
        await db.SaveChangesAsync(cancellationToken);
        return Results.File(
            ReportPdf.AttendanceDeclaration(data),
            "application/pdf",
            $"declaracao-de-comparecimento-{startedAt.Add(BrazilOffset):yyyy-MM-dd}.pdf");
    }
}
