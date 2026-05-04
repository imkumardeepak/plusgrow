using PlusgrowWms.Api.DTOs;
using PlusgrowWms.Api.Models;
using PlusgrowWms.Api.Repositories;

namespace PlusgrowWms.Api.Services;

public class ManufacturerService : IManufacturerService
{
    private readonly IManufacturerRepository _repository;

    public ManufacturerService(IManufacturerRepository repository)
    {
        _repository = repository;
    }

    public Task<PagedListResult<Manufacturer>> GetPagedAsync(ListQueryDto queryDto) => _repository.GetPagedAsync(queryDto);
    public Task<Manufacturer?> GetByIdAsync(int id) => _repository.GetByIdAsync(id);

    public async Task<Manufacturer> CreateAsync(Manufacturer manufacturer)
    {
        await _repository.AddAsync(manufacturer);
        await _repository.SaveChangesAsync();
        return manufacturer;
    }

    public async Task<(Manufacturer? Manufacturer, string? Error)> UpdateAsync(int id, Manufacturer manufacturer)
    {
        if (id != manufacturer.Id)
            return (null, "ID mismatch");
        if (!await _repository.ExistsAsync(id))
            return (null, "Manufacturer not found");

        _repository.Update(manufacturer);
        await _repository.SaveChangesAsync();
        return (manufacturer, null);
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var manufacturer = await _repository.GetByIdAsync(id);
        if (manufacturer == null)
            return false;

        _repository.Remove(manufacturer);
        await _repository.SaveChangesAsync();
        return true;
    }
}
