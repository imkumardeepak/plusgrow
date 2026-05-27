using PlusgrowWms.Api.DTOs;
using PlusgrowWms.Api.Models;

namespace PlusgrowWms.Api.Repositories;

public interface IPartyRepository
{
    Task<PagedListResult<Party>> GetPagedAsync(ListQueryDto queryDto);
    Task<Party?> GetByIdAsync(int id);
    Task<Party?> GetByEmailAsync(string email);
    Task AddAsync(Party party);
    Task SaveChangesAsync();
    void Update(Party party);
    void Remove(Party party);
    Task<bool> ExistsAsync(int id);
}
