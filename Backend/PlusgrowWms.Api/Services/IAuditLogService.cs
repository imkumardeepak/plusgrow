namespace PlusgrowWms.Api.Services;

public interface IAuditLogService
{
    Task LogCustomActionAsync(string action, string entityType, string? entityId, string details, object? oldValues = null, object? newValues = null);
}
