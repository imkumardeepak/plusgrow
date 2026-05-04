using PlusgrowWms.Api.DTOs;
using PlusgrowWms.Api.Repositories;

namespace PlusgrowWms.Api.Services;

public class DashboardService : IDashboardService
{
    private readonly IDashboardRepository _repository;

    public DashboardService(IDashboardRepository repository)
    {
        _repository = repository;
    }

    public Task<DashboardSummaryDto> GetSummaryAsync() => _repository.GetSummaryAsync();
}
