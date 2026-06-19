using Hangfire.Dashboard;

namespace PlusgrowWms.Api.Configuration;

/// <summary>
/// Allows unrestricted access to the Hangfire Dashboard.
/// </summary>
public class HangfireAuthorizationFilter : IDashboardAuthorizationFilter
{
    public bool Authorize(DashboardContext context) => true;
}
