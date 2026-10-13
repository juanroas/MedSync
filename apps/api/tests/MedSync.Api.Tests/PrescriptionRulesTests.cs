using MedSync.Api;
using MedSync.Domain;
using Xunit;

namespace MedSync.Api.Tests;

// Rule D6 as decided with the medical lead: SNCR for electronic controlled/antimicrobial; issuing outside the platform signature is always possible.
public class PrescriptionRulesTests
{
    private static readonly DateOnly Grace = new(2026, 10, 29);

    [Fact]
    public void Controlled_special_is_never_signed_electronically_and_points_to_paper_in_person()
    {
        var online = PrescriptionRules.ElectronicBlockers(PrescriptionKind.ControlledSpecial, ConsultationModality.Online, "São Paulo/SP", new(2026, 10, 1), Grace);
        var inPerson = PrescriptionRules.ElectronicBlockers(PrescriptionKind.ControlledSpecial, ConsultationModality.InPerson, null, new(2026, 10, 1), Grace);
        Assert.Single(online);
        Assert.DoesNotContain("Imprimir para assinar", online[0]);
        Assert.Single(inPerson);
        Assert.Contains("Imprimir para assinar à mão", inPerson[0]);
    }

    [Theory]
    [InlineData(2026, 10, 29, 0)]
    [InlineData(2026, 10, 30, 1)]
    public void Antimicrobial_is_signed_electronically_only_during_the_grace_period(int year, int month, int day, int blockers)
    {
        var result = PrescriptionRules.ElectronicBlockers(PrescriptionKind.Antimicrobial, ConsultationModality.Online, "São Paulo/SP", new(year, month, day), Grace);
        Assert.Equal(blockers, result.Count);
    }

    [Fact]
    public void Patient_location_is_asked_only_in_telemedicine()
    {
        Assert.Single(PrescriptionRules.ElectronicBlockers(PrescriptionKind.Simple, ConsultationModality.Online, null, new(2026, 10, 1), Grace));
        Assert.Empty(PrescriptionRules.ElectronicBlockers(PrescriptionKind.Simple, ConsultationModality.InPerson, null, new(2026, 10, 1), Grace));
    }

    [Fact]
    public void Every_modality_can_issue_outside_the_platform_signature()
    {
        Assert.True(PrescriptionRules.CanIssueOutside(ConsultationModality.InPerson));
        Assert.True(PrescriptionRules.CanIssueOutside(ConsultationModality.Online));
        // Telemedicine still names where the patient is, however it is signed.
        Assert.Single(PrescriptionRules.OutsideBlockers(ConsultationModality.Online, null));
        Assert.Empty(PrescriptionRules.OutsideBlockers(ConsultationModality.InPerson, null));
    }
}
