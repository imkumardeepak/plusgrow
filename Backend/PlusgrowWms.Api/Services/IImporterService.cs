using PlusgrowWms.Api.DTOs;
using PlusgrowWms.Api.Models;

namespace PlusgrowWms.Api.Services;

public interface IImporterService
{
    Task<PagedListResult<Importer>> GetPagedAsync(ListQueryDto queryDto);
    Task<Importer?> GetByIdAsync(int id);
    Task<Importer> CreateAsync(Importer importer);
    Task<(Importer? Importer, string? Error)> UpdateAsync(int id, Importer importer);
    Task<bool> DeleteAsync(int id);
}
