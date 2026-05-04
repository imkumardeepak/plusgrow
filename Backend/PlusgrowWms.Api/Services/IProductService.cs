using PlusgrowWms.Api.DTOs;
using PlusgrowWms.Api.Models;

namespace PlusgrowWms.Api.Services;

public interface IProductService
{
    Task<PagedListResult<Product>> GetPagedAsync(ListQueryDto queryDto);
    Task<List<Product>> SearchAsync(string? query);
    Task<Product?> GetByIdAsync(int id);
    Task<Product> CreateAsync(Product product);
    Task<(Product? Product, string? Error)> UpdateAsync(int id, Product product);
    Task<bool> DeleteAsync(int id);
}
