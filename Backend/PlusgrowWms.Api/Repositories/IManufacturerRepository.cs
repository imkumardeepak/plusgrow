using PlusgrowWms.Api.DTOs;
using PlusgrowWms.Api.Models;

namespace PlusgrowWms.Api.Repositories;

public interface IManufacturerRepository
{
    Task<PagedListResult<Manufacturer>> GetPagedAsync(ListQueryDto queryDto);
    Task<Manufacturer?> GetByIdAsync(int id);
    Task AddAsync(Manufacturer manufacturer);
    Task SaveChangesAsync();
    void Update(Manufacturer manufacturer);
    void Remove(Manufacturer manufacturer);
    Task<bool> ExistsAsync(int id);
}
