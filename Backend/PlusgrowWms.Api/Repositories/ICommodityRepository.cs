using PlusgrowWms.Api.DTOs;
using PlusgrowWms.Api.Models;

namespace PlusgrowWms.Api.Repositories;

public interface ICommodityRepository
{
    Task<PagedListResult<Commodity>> GetPagedAsync(ListQueryDto queryDto);
    Task<Commodity?> GetByIdAsync(int id);
    Task AddAsync(Commodity commodity);
    Task SaveChangesAsync();
    void Update(Commodity commodity);
    void Remove(Commodity commodity);
    Task<bool> ExistsAsync(int id);
}
