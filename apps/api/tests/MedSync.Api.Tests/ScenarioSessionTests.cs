using MedSync.Api;

namespace MedSync.Api.Tests;

// The test data follows the session of tests: 17h to 20h (Brasília) by default, today until it ends.
public class ScenarioSessionTests
{
    [Theory]
    [InlineData("2026-11-06T17:29:00Z", "2026-11-06")] // 14:29 in Brasília: today's session
    [InlineData("2026-11-06T22:59:00Z", "2026-11-06")] // 19:59: still today
    [InlineData("2026-11-06T23:00:00Z", "2026-11-07")] // 20:00: the next one
    [InlineData("2026-11-07T02:30:00Z", "2026-11-07")] // 23:30 of the 6th in Brasília
    public void Session_is_today_until_it_ends(string utcNow, string expectedDay)
    {
        var (day, start, end) = DatabaseSeeder.ScenarioSession(DateTime.Parse(utcNow, null, System.Globalization.DateTimeStyles.AdjustToUniversal));
        Assert.Equal(DateOnly.Parse(expectedDay), day);
        Assert.Equal((17, 20), (start, end));
    }
}
