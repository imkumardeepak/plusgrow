using PlusgrowWms.Api.DTOs;
using PlusgrowWms.Api.Models;
using PlusgrowWms.Api.Repositories;

namespace PlusgrowWms.Api.Services;

public class ImporterService : IImporterService
{
    private readonly IImporterRepository _repository;

    public ImporterService(IImporterRepository repository)
    {
        _repository = repository;
    }

    public Task<PagedListResult<Importer>> GetPagedAsync(ListQueryDto queryDto) => _repository.GetPagedAsync(queryDto);
    public Task<Importer?> GetByIdAsync(int id) => _repository.GetByIdAsync(id);

    public async Task<Importer> CreateAsync(Importer importer)
    {
        await _repository.AddAsync(importer);
        await _repository.SaveChangesAsync();
        return importer;
    }

    public async Task<(Importer? Importer, string? Error)> UpdateAsync(int id, Importer importer)
    {
        if (id != importer.Id)
            return (null, "ID mismatch");
        if (!await _repository.ExistsAsync(id))
            return (null, "Importer not found");

        _repository.Update(importer);
        await _repository.SaveChangesAsync();
        return (importer, null);
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var importer = await _repository.GetByIdAsync(id);
        if (importer == null)
            return false;

        _repository.Remove(importer);
        await _repository.SaveChangesAsync();
        return true;
    }
}
