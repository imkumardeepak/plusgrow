using PlusgrowWms.Api.DTOs;
using PlusgrowWms.Api.Models;
using PlusgrowWms.Api.Repositories;

namespace PlusgrowWms.Api.Services;

public class ProductService : IProductService
{
    private readonly IProductRepository _repository;

    public ProductService(IProductRepository repository)
    {
        _repository = repository;
    }

    public Task<PagedListResult<Product>> GetPagedAsync(ListQueryDto queryDto)
    {
        return _repository.GetPagedAsync(queryDto);
    }

    public Task<List<Product>> SearchAsync(string? query)
    {
        return _repository.SearchAsync(query);
    }

    public Task<Product?> GetByIdAsync(int id)
    {
        return _repository.GetByIdWithDetailsAsync(id);
    }

    public async Task<Product> CreateAsync(Product product)
    {
        await _repository.AddAsync(product);
        await _repository.SaveChangesAsync();
        return (await _repository.GetByIdWithDetailsAsync(product.Id))!;
    }

    public async Task<(Product? Product, string? Error)> UpdateAsync(int id, Product product)
    {
        if (id != product.Id)
            return (null, "ID mismatch");

        var existing = await _repository.GetByIdAsync(id);
        if (existing == null)
            return (null, "Product not found");

        existing.Name = product.Name;
        existing.Sku = product.Sku;
        existing.Alias = product.Alias;
        existing.CommodityId = product.CommodityId;
        existing.ManufacturerId = product.ManufacturerId;
        existing.CountryOfOrigin = product.CountryOfOrigin;
        existing.Factor = product.Factor;
        existing.NetQuantity = product.NetQuantity;
        existing.UnitType = product.UnitType;
        existing.Ussp = product.Ussp;
        existing.Mrp = product.Mrp;
        existing.BestBeforeMonths = product.BestBeforeMonths;
        existing.Weight = product.Weight;
        existing.Ownership = product.Ownership;

        await _repository.SaveChangesAsync();
        return (await _repository.GetByIdWithDetailsAsync(id), null);
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var product = await _repository.GetByIdAsync(id);
        if (product == null)
            return false;

        _repository.Remove(product);
        await _repository.SaveChangesAsync();
        return true;
    }
}
