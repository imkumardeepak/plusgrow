using PlusgrowWms.Api.DTOs;
using PlusgrowWms.Api.Models;

namespace PlusgrowWms.Api.Services;

public interface ICommodityService
{
    Task<PagedListResult<Commodity>> GetPagedAsync(ListQueryDto queryDto);
    Task<Commodity?> GetByIdAsync(int id);
    Task<Commodity> CreateAsync(Commodity commodity);
    Task<(Commodity? Commodity, string? Error)> UpdateAsync(int id, Commodity commodity);
    Task<bool> DeleteAsync(int id);
}
