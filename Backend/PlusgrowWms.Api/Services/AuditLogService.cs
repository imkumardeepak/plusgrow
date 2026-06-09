using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using PlusgrowWms.Api.Data;
using PlusgrowWms.Api.Models;

namespace PlusgrowWms.Api.Services;

public class AuditLogService : IAuditLogService
{
    private readonly PlusgrowDbContext _context;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public AuditLogService(PlusgrowDbContext context, IHttpContextAccessor httpContextAccessor)
    {
        _context = context;
        _httpContextAccessor = httpContextAccessor;
    }

    public async Task LogCustomActionAsync(string action, string entityType, string? entityId, string details, object? oldValues = null, object? newValues = null)
    {
        var userIdClaim = _httpContextAccessor.HttpContext?.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        int? userId = int.TryParse(userIdClaim, out var parsed) ? parsed : null;
        var username = _httpContextAccessor.HttpContext?.User.FindFirst(ClaimTypes.GivenName)?.Value 
            ?? _httpContextAccessor.HttpContext?.User.Identity?.Name 
            ?? "System";

        var auditLog = new AuditLog
        {
            UserId = userId,
            Username = username,
            Action = action,
            EntityType = entityType,
            EntityId = entityId,
            Details = details,
            Timestamp = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified),
            OldValues = oldValues != null ? JsonSerializer.Serialize(oldValues) : null,
            NewValues = newValues != null ? JsonSerializer.Serialize(newValues) : null
        };

        _context.AuditLogs.Add(auditLog);
        await _context.SaveChangesAsync();
    }
}
