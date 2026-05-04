using PlusgrowWms.Api.DTOs;
using PlusgrowWms.Api.Models;

namespace PlusgrowWms.Api.Repositories;

public interface IImporterRepository
{
    Task<PagedListResult<Importer>> GetPagedAsync(ListQueryDto queryDto);
    Task<Importer?> GetByIdAsync(int id);
    Task AddAsync(Importer importer);
    Task SaveChangesAsync();
    void Update(Importer importer);
    void Remove(Importer importer);
    Task<bool> ExistsAsync(int id);
}
