using PlusgrowWms.Api.DTOs;

namespace PlusgrowWms.Api.Services;

public interface IDashboardService
{
    Task<DashboardSummaryDto> GetSummaryAsync();
}
