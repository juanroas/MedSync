using MedSync.Api;

namespace MedSync.Api.Tests;

// The test data follows the session of tests: 19h to 22h (Brasília) by default, today until it ends.
public class ScenarioSessionTests
{
    [Theory]
    [InlineData("2026-11-06T17:29:00Z", "2026-11-06")] // 14:29 in Brasília: today's session
    [InlineData("2026-11-07T00:59:00Z", "2026-11-06")] // 21:59: still today
    [InlineData("2026-11-07T01:00:00Z", "2026-11-07")] // 22:00: the next one
    [InlineData("2026-11-07T02:30:00Z", "2026-11-07")] // 23:30 of the 6th in Brasília
    public void Session_is_today_until_it_ends(string utcNow, string expectedDay)
    {
        var (day, start, end) = DatabaseSeeder.ScenarioSession(DateTime.Parse(utcNow, null, System.Globalization.DateTimeStyles.AdjustToUniversal));
        Assert.Equal(DateOnly.Parse(expectedDay), day);
        Assert.Equal((19, 22), (start, end));
    }
}
