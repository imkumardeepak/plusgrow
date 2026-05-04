using PlusgrowWms.Api.DTOs;
using PlusgrowWms.Api.Models;

namespace PlusgrowWms.Api.Services;

public interface IManufacturerService
{
    Task<PagedListResult<Manufacturer>> GetPagedAsync(ListQueryDto queryDto);
    Task<Manufacturer?> GetByIdAsync(int id);
    Task<Manufacturer> CreateAsync(Manufacturer manufacturer);
    Task<(Manufacturer? Manufacturer, string? Error)> UpdateAsync(int id, Manufacturer manufacturer);
    Task<bool> DeleteAsync(int id);
}
