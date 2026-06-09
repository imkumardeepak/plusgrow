using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PlusgrowWms.Api.Data;
using PlusgrowWms.Api.Helpers;
using PlusgrowWms.Api.Models;

namespace PlusgrowWms.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AuditLogsController : BaseController
{
    private readonly PlusgrowDbContext _context;

    public AuditLogsController(PlusgrowDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<AuditLog>>>> GetAuditLogs(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        [FromQuery] string? actionType = null,
        [FromQuery] string? entityType = null,
        [FromQuery] string? username = null,
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null)
    {
        var query = _context.AuditLogs.AsQueryable();

        if (!string.IsNullOrEmpty(actionType))
        {
            query = query.Where(a => a.Action.ToLower() == actionType.ToLower());
        }

        if (!string.IsNullOrEmpty(entityType))
        {
            query = query.Where(a => a.EntityType.ToLower() == entityType.ToLower());
        }

        if (!string.IsNullOrEmpty(username))
        {
            query = query.Where(a => a.Username != null && a.Username.ToLower().Contains(username.ToLower()));
        }

        if (startDate.HasValue)
        {
            query = query.Where(a => a.Timestamp >= startDate.Value);
        }

        if (endDate.HasValue)
        {
            query = query.Where(a => a.Timestamp <= endDate.Value);
        }

        var total = await query.CountAsync();
        var logs = await query
            .OrderByDescending(a => a.Timestamp)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Success(logs, page, pageSize, total);
    }
}
