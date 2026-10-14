using System.Globalization;
using System.Security.Claims;
using MedSync.Application;
using MedSync.Domain;
using MedSync.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace MedSync.Api;

// MedSync monthly fee, by hand (14/10/2026): the MedSync team (Suporte or Médico ADM) charges a clinic, the clinic pays
// by Pix and says it paid, the team confirms after seeing the money. The clinic prints the invoice and the receipt.
// Automatic confirmation needs a bank or payment provider integration and is not part of this flow.
public static partial class ApiEndpoints
{
    private static readonly CultureInfo PtBr = CultureInfo.GetCultureInfo("pt-BR");

    private static void MapBillingEndpoints(RouteGroupBuilder protectedApi)
    {
        protectedApi.MapGet("/billing/invoices", GetClinicInvoices);
        protectedApi.MapPost("/billing/invoices", CreateClinicInvoice);
        protectedApi.MapPost("/billing/invoices/{id:guid}/inform", InformInvoicePayment);
        protectedApi.MapPost("/billing/invoices/{id:guid}/confirm", ConfirmInvoicePayment);
        protectedApi.MapPost("/billing/invoices/{id:guid}/cancel", CancelClinicInvoice);
        protectedApi.MapGet("/billing/invoices/{id:guid}/pdf", GetClinicInvoicePdf);
        protectedApi.MapGet("/billing/report/pdf", GetBillingReportPdf);
    }

    private static bool ManagesBilling(RequestContext actor) => actor.IsSupport || actor.IsMedicalAdmin;

    private static bool PaysBilling(RequestContext actor) => !actor.IsPlatformStaff && actor.HasAny(ClinicRole.ClinicAdmin);

    private sealed record PixSettings(string? Key, string Receiver, string City)
    {
        public static PixSettings From(IConfiguration configuration) => new(
            (Environment.GetEnvironmentVariable("MEDSYNC_PIX_KEY") ?? configuration["Billing:PixKey"])?.Trim() is { Length: > 0 } key ? key : null,
            Environment.GetEnvironmentVariable("MEDSYNC_PIX_RECEIVER") ?? configuration["Billing:PixReceiver"] ?? "MedSync",
            Environment.GetEnvironmentVariable("MEDSYNC_PIX_CITY") ?? configuration["Billing:PixCity"] ?? "Sao Paulo");
    }

    private static async Task<IResult> GetClinicInvoices(
        string? status,
        Guid? clinicId,
        ClaimsPrincipal principal,
        MedSyncDbContext db,
        IConfiguration configuration,
        CancellationToken cancellationToken)
    {
        var actor = RequestContext.From(principal);
        if (!ManagesBilling(actor) && !PaysBilling(actor))
            return Results.Forbid();

        var query = db.ClinicInvoices.AsNoTracking().Include(x => x.Clinic).AsQueryable();
        // A clinic sees only its own invoices; the MedSync team sees every clinic.
        if (!ManagesBilling(actor))
            query = query.Where(x => x.ClinicId == actor.ClinicId);
        else if (clinicId is not null)
            query = query.Where(x => x.ClinicId == clinicId);
        if (!string.IsNullOrWhiteSpace(status))
        {
            if (!Enum.TryParse<InvoiceStatus>(status, true, out var parsed))
                return Validation("status", "Situação inválida.");
            query = query.Where(x => x.Status == parsed);
        }

        var invoices = await query
            .OrderByDescending(x => x.Reference)
            .ThenBy(x => x.Clinic.Name)
            .Take(1000)
            .ToListAsync(cancellationToken);
        var pix = PixSettings.From(configuration);
        return Results.Ok(invoices.Select(x => ToInvoiceResponse(x, pix)).ToList());
    }

    private static async Task<IResult> CreateClinicInvoice(
        CreateClinicInvoiceRequest request,
        ClaimsPrincipal principal,
        MedSyncDbContext db,
        AuditWriter audit,
        IConfiguration configuration,
        CancellationToken cancellationToken)
    {
        var actor = RequestContext.From(principal);
        if (!ManagesBilling(actor))
        {
            audit.Add(actor, "Billing.InvoiceCreate", "Clinic", request.ClinicId, "Denied", "Só a equipe MedSync lança cobrança.");
            await db.SaveChangesAsync(cancellationToken);
            return Results.Forbid();
        }
        var clinic = await db.Clinics.SingleOrDefaultAsync(x => x.Id == request.ClinicId && !x.IsPlatform, cancellationToken);
        if (clinic is null)
            return Validation("clinicId", "Escolha a clínica.");
        if (!DateOnly.TryParseExact(request.Reference + "-01", "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var month))
            return Validation("reference", "Informe o mês de referência (AAAA-MM).");
        var amount = request.Amount ?? clinic.MonthlyFee;
        if (amount is null or <= 0 or > 100_000)
            return Validation("amount", "Informe o valor da cobrança (a clínica não tem valor de plano definido).");
        if (request.DueDate == default)
            return Validation("dueDate", "Informe o vencimento.");
        var description = string.IsNullOrWhiteSpace(request.Description)
            ? $"Mensalidade MedSync{(string.IsNullOrWhiteSpace(clinic.PlanName) ? "" : $" — {clinic.PlanName}")} — {MonthName(month)}"
            : request.Description.Trim();
        if (description.Length > 200)
            return Validation("description", "A descrição pode ter até 200 caracteres.");
        if (await db.ClinicInvoices.AnyAsync(
                x => x.ClinicId == clinic.Id && x.Reference == request.Reference && x.Status != InvoiceStatus.Cancelled,
                cancellationToken))
            return Results.Conflict(new { message = $"Já existe cobrança de {clinic.Name} para {MonthName(month)}." });

        var invoice = new ClinicInvoice
        {
            ClinicId = clinic.Id,
            Clinic = clinic,
            Reference = request.Reference,
            Description = description,
            Amount = Math.Round(amount.Value, 2),
            DueDate = request.DueDate,
            CreatedByUserId = actor.UserId
        };
        db.ClinicInvoices.Add(invoice);
        audit.Add(actor, "Billing.InvoiceCreate", "ClinicInvoice", invoice.Id);
        await db.SaveChangesAsync(cancellationToken);
        return Results.Created($"/billing/invoices/{invoice.Id}", ToInvoiceResponse(invoice, PixSettings.From(configuration)));
    }

    private static async Task<IResult> InformInvoicePayment(
        Guid id,
        InformInvoicePaymentRequest? request,
        ClaimsPrincipal principal,
        MedSyncDbContext db,
        AuditWriter audit,
        IConfiguration configuration,
        CancellationToken cancellationToken)
    {
        var actor = RequestContext.From(principal);
        if (!PaysBilling(actor))
            return Results.Forbid();
        var invoice = await db.ClinicInvoices.Include(x => x.Clinic)
            .SingleOrDefaultAsync(x => x.Id == id && x.ClinicId == actor.ClinicId, cancellationToken);
        if (invoice is null)
            return Results.NotFound();
        if (invoice.Status != InvoiceStatus.Open)
            return Results.Conflict(new { message = "Esta cobrança não está mais em aberto." });
        var note = string.IsNullOrWhiteSpace(request?.Note) ? null : request.Note.Trim();
        if (note?.Length > 300)
            return Validation("note", "A observação pode ter até 300 caracteres.");

        invoice.Status = InvoiceStatus.PaymentInformed;
        invoice.InformedAt = DateTime.UtcNow;
        invoice.InformedByUserId = actor.UserId;
        invoice.InformedNote = note;
        audit.Add(actor, "Billing.PaymentInformed", "ClinicInvoice", invoice.Id);
        await db.SaveChangesAsync(cancellationToken);
        return Results.Ok(ToInvoiceResponse(invoice, PixSettings.From(configuration)));
    }

    private static async Task<IResult> ConfirmInvoicePayment(
        Guid id,
        ConfirmInvoicePaymentRequest request,
        ClaimsPrincipal principal,
        MedSyncDbContext db,
        AuditWriter audit,
        IConfiguration configuration,
        CancellationToken cancellationToken)
    {
        var actor = RequestContext.From(principal);
        if (!ManagesBilling(actor))
        {
            audit.Add(actor, "Billing.PaymentConfirm", "ClinicInvoice", id, "Denied", "Só a equipe MedSync confirma pagamento.");
            await db.SaveChangesAsync(cancellationToken);
            return Results.Forbid();
        }
        var invoice = await db.ClinicInvoices.Include(x => x.Clinic).SingleOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (invoice is null)
            return Results.NotFound();
        if (invoice.Status is not (InvoiceStatus.Open or InvoiceStatus.PaymentInformed))
            return Results.Conflict(new { message = "Esta cobrança já foi paga ou cancelada." });
        var today = DateOnly.FromDateTime(DateTime.UtcNow.Add(BrazilOffset));
        if (request.PaidOn == default || request.PaidOn > today)
            return Validation("paidOn", "Informe a data em que o dinheiro entrou (hoje ou antes).");
        var note = string.IsNullOrWhiteSpace(request.Note) ? null : request.Note.Trim();
        if (note?.Length > 300)
            return Validation("note", "A observação pode ter até 300 caracteres.");

        invoice.Status = InvoiceStatus.Paid;
        invoice.PaidOn = request.PaidOn;
        invoice.PaymentMethod = request.Method;
        invoice.PaymentNote = note;
        invoice.ConfirmedAt = DateTime.UtcNow;
        invoice.ConfirmedByUserId = actor.UserId;
        audit.Add(actor, "Billing.PaymentConfirm", "ClinicInvoice", invoice.Id);
        await db.SaveChangesAsync(cancellationToken);
        return Results.Ok(ToInvoiceResponse(invoice, PixSettings.From(configuration)));
    }

    private static async Task<IResult> CancelClinicInvoice(
        Guid id,
        CancelInvoiceRequest request,
        ClaimsPrincipal principal,
        MedSyncDbContext db,
        AuditWriter audit,
        IConfiguration configuration,
        CancellationToken cancellationToken)
    {
        var actor = RequestContext.From(principal);
        if (!ManagesBilling(actor))
            return Results.Forbid();
        var invoice = await db.ClinicInvoices.Include(x => x.Clinic).SingleOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (invoice is null)
            return Results.NotFound();
        if (invoice.Status is not (InvoiceStatus.Open or InvoiceStatus.PaymentInformed))
            return Results.Conflict(new { message = "Cobrança paga ou já cancelada não pode ser cancelada." });
        var reason = (request.Reason ?? "").Trim();
        if (reason.Length is < 5 or > 300)
            return Validation("reason", "Explique o motivo do cancelamento (5 a 300 caracteres).");

        invoice.Status = InvoiceStatus.Cancelled;
        invoice.CancelledAt = DateTime.UtcNow;
        invoice.CancelReason = reason;
        audit.Add(actor, "Billing.InvoiceCancel", "ClinicInvoice", invoice.Id, reason: reason);
        await db.SaveChangesAsync(cancellationToken);
        return Results.Ok(ToInvoiceResponse(invoice, PixSettings.From(configuration)));
    }

    // Open or informed: the invoice with the Pix data. Paid: the receipt.
    private static async Task<IResult> GetClinicInvoicePdf(
        Guid id,
        ClaimsPrincipal principal,
        MedSyncDbContext db,
        AuditWriter audit,
        IConfiguration configuration,
        CancellationToken cancellationToken)
    {
        var actor = RequestContext.From(principal);
        if (!ManagesBilling(actor) && !PaysBilling(actor))
            return Results.Forbid();
        var managesBilling = ManagesBilling(actor);
        var invoice = await db.ClinicInvoices.AsNoTracking().Include(x => x.Clinic)
            .SingleOrDefaultAsync(x => x.Id == id && (managesBilling || x.ClinicId == actor.ClinicId), cancellationToken);
        if (invoice is null)
            return Results.NotFound();
        if (invoice.Status == InvoiceStatus.Cancelled)
            return Results.Conflict(new { message = "Cobrança cancelada não gera documento." });

        var pix = PixSettings.From(configuration);
        var response = ToInvoiceResponse(invoice, pix);
        var paid = invoice.Status == InvoiceStatus.Paid;
        audit.Add(actor, paid ? "Billing.ReceiptPdf" : "Billing.InvoicePdf", "ClinicInvoice", invoice.Id);
        await db.SaveChangesAsync(cancellationToken);
        var pdf = paid
            ? BillingPdf.Receipt(response, invoice.Clinic, pix.Receiver, DateTime.UtcNow)
            : BillingPdf.Invoice(response, invoice.Clinic, pix.Receiver, DateTime.UtcNow);
        return Results.File(pdf, "application/pdf", $"{(paid ? "recibo" : "fatura")}-{invoice.Code}.pdf");
    }

    // Financial report of the MedSync team: what was charged, received, informed and is still open, by month.
    private static async Task<IResult> GetBillingReportPdf(
        string? from,
        string? to,
        ClaimsPrincipal principal,
        MedSyncDbContext db,
        AuditWriter audit,
        IConfiguration configuration,
        CancellationToken cancellationToken)
    {
        var actor = RequestContext.From(principal);
        if (!ManagesBilling(actor))
        {
            audit.Add(actor, "Billing.Report", "ClinicInvoice", null, "Denied", "Só a equipe MedSync vê o relatório financeiro.");
            await db.SaveChangesAsync(cancellationToken);
            return Results.Forbid();
        }
        var today = DateOnly.FromDateTime(DateTime.UtcNow.Add(BrazilOffset));
        var start = string.IsNullOrWhiteSpace(from) ? $"{today:yyyy}-01" : from.Trim();
        var end = string.IsNullOrWhiteSpace(to) ? $"{today:yyyy-MM}" : to.Trim();
        if (!IsReference(start) || !IsReference(end) || string.CompareOrdinal(end, start) < 0)
            return Validation("period", "Informe os meses no formato AAAA-MM, do mais antigo para o mais recente.");

        var invoices = await db.ClinicInvoices.AsNoTracking().Include(x => x.Clinic)
            .Where(x => string.Compare(x.Reference, start) >= 0 && string.Compare(x.Reference, end) <= 0)
            .OrderBy(x => x.Reference)
            .ThenBy(x => x.Clinic.Name)
            .ToListAsync(cancellationToken);
        var pix = PixSettings.From(configuration);
        var generatedBy = await db.Users.AsNoTracking().Where(x => x.Id == actor.UserId).Select(x => x.Name).SingleAsync(cancellationToken);
        audit.Add(actor, "Billing.Report", "ClinicInvoice", null, reason: $"{start} a {end}");
        await db.SaveChangesAsync(cancellationToken);
        var pdf = BillingPdf.Report(invoices.Select(x => ToInvoiceResponse(x, pix)).ToList(), start, end, generatedBy, DateTime.UtcNow);
        return Results.File(pdf, "application/pdf", $"relatorio-financeiro-{start}-a-{end}.pdf");
    }

    private static bool IsReference(string value) =>
        DateOnly.TryParseExact(value + "-01", "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out _);

    internal static string MonthName(DateOnly month) => month.ToString("MMMM/yyyy", PtBr);

    internal static string ReferenceName(string reference) =>
        DateOnly.TryParseExact(reference + "-01", "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var month)
            ? MonthName(month)
            : reference;

    private static ClinicInvoiceResponse ToInvoiceResponse(ClinicInvoice invoice, PixSettings pix)
    {
        var payable = invoice.Status is InvoiceStatus.Open or InvoiceStatus.PaymentInformed;
        var today = DateOnly.FromDateTime(DateTime.UtcNow.Add(BrazilOffset));
        var pixCode = payable && pix.Key is not null
            ? PixPayload.Build(pix.Key, pix.Receiver, pix.City, invoice.Amount, invoice.Code)
            : null;
        return new ClinicInvoiceResponse(
            invoice.Id,
            invoice.Code,
            invoice.ClinicId,
            invoice.Clinic.Name,
            invoice.Clinic.IsPrivatePractice,
            invoice.Reference,
            invoice.Description,
            invoice.Amount,
            invoice.DueDate,
            invoice.Status,
            invoice.Status == InvoiceStatus.Open && invoice.DueDate < today,
            invoice.CreatedAt,
            invoice.InformedAt,
            invoice.InformedNote,
            invoice.PaidOn,
            invoice.PaymentMethod,
            invoice.PaymentNote,
            invoice.CancelledAt,
            invoice.CancelReason,
            pixCode,
            payable ? pix.Key : null,
            payable && pix.Key is not null ? pix.Receiver : null);
    }
}
