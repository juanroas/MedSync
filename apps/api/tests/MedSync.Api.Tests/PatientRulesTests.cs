using MedSync.Api;

namespace MedSync.Api.Tests;

public class PatientRulesTests
{
    private static readonly DateOnly Today = new(2026, 10, 31);

    [Theory]
    [InlineData("2019-01-01", true)]
    [InlineData("2008-11-01", true)]
    [InlineData("2008-10-31", false)]
    [InlineData("1990-05-14", false)]
    public void Under_18_on_the_date_is_a_minor(string birthDate, bool minor) =>
        Assert.Equal(minor, PatientRules.IsMinor(DateOnly.Parse(birthDate), Today));
}
