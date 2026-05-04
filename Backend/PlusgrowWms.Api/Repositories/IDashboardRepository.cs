using PlusgrowWms.Api.DTOs;

namespace PlusgrowWms.Api.Repositories;

public interface IDashboardRepository
{
    Task<DashboardSummaryDto> GetSummaryAsync();
}
