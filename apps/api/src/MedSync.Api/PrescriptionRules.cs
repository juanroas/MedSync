using MedSync.Domain;

namespace MedSync.Api;

// When a prescription may be signed electronically or issued on paper (rule D6, .agents/rules/medical-documents.md).
// RDC Anvisa 1.000/2025: electronic controlled and antimicrobial prescriptions need an SNCR number; paper ones do not.
// Decided with the medical lead (2026-10-13):
// - Controle especial: never signed electronically before the SNCR integration; in person, printed and signed by hand.
// - Antimicrobial: electronic only during Anvisa's 30-day grace (until SNCR_ELECTRONIC_GRACE_UNTIL); in person, paper.
// - Any prescription can be issued outside the MedSync signature (2026-10-13 product decision: the patient must not
//   wait on a platform outage). In person the doctor signs by hand; in telemedicine the doctor signs the PDF with
//   their own ICP-Brasil certificate (CFM 2.314 art. 13) and sends it, e.g. by WhatsApp.
public static class PrescriptionRules
{
    public static readonly DateOnly SncrGraceUntil =
        DateOnly.TryParse(Environment.GetEnvironmentVariable("SNCR_ELECTRONIC_GRACE_UNTIL"), out var configured)
            ? configured
            : new DateOnly(2026, 10, 29);

    public static DateOnly BrazilToday() => DateOnly.FromDateTime(DateTime.UtcNow.AddHours(-3));

    // Every modality has a way out of the MedSync signature (see the header).
    public static bool CanIssueOutside(ConsultationModality modality) => true;

    // Telemedicine documents name where the patient is (CFM 2.314 art. 13), whichever way they are signed.
    public static List<string> OutsideBlockers(ConsultationModality modality, string? patientLocation) =>
        modality == ConsultationModality.Online && string.IsNullOrWhiteSpace(patientLocation)
            ? ["informe onde o paciente está durante a consulta"]
            : [];

    // What stops an electronic (ICP-Brasil) signature, on top of the data every prescription needs.
    public static List<string> ElectronicBlockers(
        PrescriptionKind kind,
        ConsultationModality modality,
        string? patientLocation,
        DateOnly today,
        DateOnly sncrGraceUntil)
    {
        var blockers = new List<string>();
        var paperHint = modality == ConsultationModality.InPerson
            ? " (nesta consulta presencial, use \"Imprimir para assinar à mão\")"
            : " (por telemedicina, emita num sistema integrado ao SNCR ou use \"Emitir para assinar fora do MedSync\")";
        if (kind == PrescriptionKind.ControlledSpecial)
            blockers.Add("receita de controle especial eletrônica precisa do número do SNCR da Anvisa, que o MedSync ainda não emite" + paperHint);
        if (kind == PrescriptionKind.Antimicrobial && today > sncrGraceUntil)
            blockers.Add($"desde {sncrGraceUntil.AddDays(1):dd/MM/yyyy} a receita eletrônica de antimicrobiano precisa do número do SNCR da Anvisa, que o MedSync ainda não emite" + paperHint);
        if (modality == ConsultationModality.Online && string.IsNullOrWhiteSpace(patientLocation))
            blockers.Add("informe onde o paciente está durante a consulta");
        return blockers;
    }
}
