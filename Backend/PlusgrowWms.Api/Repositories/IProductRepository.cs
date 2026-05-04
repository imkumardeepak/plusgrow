using PlusgrowWms.Api.DTOs;
using PlusgrowWms.Api.Models;

namespace PlusgrowWms.Api.Repositories;

public interface IProductRepository
{
    Task<PagedListResult<Product>> GetPagedAsync(ListQueryDto queryDto);
    Task<List<Product>> SearchAsync(string? query, int limit = 25);
    Task<Product?> GetByIdAsync(int id);
    Task<Product?> GetByIdWithDetailsAsync(int id);
    Task AddAsync(Product product);
    Task SaveChangesAsync();
    Task<bool> ExistsAsync(int id);
    void Remove(Product product);
}
