using PlusgrowWms.Api.Models;

namespace PlusgrowWms.Api.Repositories;

public interface IBinRepository
{
    Task<List<Bin>> GetAllAsync();
    Task<Bin?> GetByIdAsync(int id);
    Task AddAsync(Bin bin);
    void Remove(Bin bin);
    Task<int> CountAsync();
    Task SaveChangesAsync();
}
