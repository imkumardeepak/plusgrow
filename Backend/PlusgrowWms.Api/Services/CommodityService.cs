using PlusgrowWms.Api.DTOs;
using PlusgrowWms.Api.Models;
using PlusgrowWms.Api.Repositories;

namespace PlusgrowWms.Api.Services;

public class CommodityService : ICommodityService
{
    private readonly ICommodityRepository _repository;

    public CommodityService(ICommodityRepository repository)
    {
        _repository = repository;
    }

    public Task<PagedListResult<Commodity>> GetPagedAsync(ListQueryDto queryDto) => _repository.GetPagedAsync(queryDto);
    public Task<Commodity?> GetByIdAsync(int id) => _repository.GetByIdAsync(id);

    public async Task<Commodity> CreateAsync(Commodity commodity)
    {
        await _repository.AddAsync(commodity);
        await _repository.SaveChangesAsync();
        return commodity;
    }

    public async Task<(Commodity? Commodity, string? Error)> UpdateAsync(int id, Commodity commodity)
    {
        if (id != commodity.Id)
            return (null, "ID mismatch");
        if (!await _repository.ExistsAsync(id))
            return (null, "Commodity not found");

        _repository.Update(commodity);
        await _repository.SaveChangesAsync();
        return (commodity, null);
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var commodity = await _repository.GetByIdAsync(id);
        if (commodity == null)
            return false;

        _repository.Remove(commodity);
        await _repository.SaveChangesAsync();
        return true;
    }
}
