namespace MedSync.Api;

// Patients under 18 (ADR-0006): CFM 2.314/2022 asks for the authorization of the patient or their legal representative,
// and a child may not have a CPF yet, so the guardian is mandatory and the CPF is not.
public static class PatientRules
{
    public static readonly string[] GuardianRelationships = ["Mãe", "Pai", "Tutor(a)", "Guardião(ã)", "Outro responsável legal"];

    public static bool IsMinor(DateOnly birthDate, DateOnly today) => birthDate.AddYears(18) > today;
}
