using Microsoft.EntityFrameworkCore;
using PlusgrowWms.Api.Data;
using PlusgrowWms.Api.DTOs;
using PlusgrowWms.Api.Models;

namespace PlusgrowWms.Api.Repositories;

public class ProductRepository : IProductRepository
{
    private readonly PlusgrowDbContext _context;

    public ProductRepository(PlusgrowDbContext context)
    {
        _context = context;
    }

    public async Task<PagedListResult<Product>> GetPagedAsync(ListQueryDto queryDto)
    {
        var page = Math.Max(queryDto.Page, 1);
        var pageSize = Math.Clamp(queryDto.PageSize, 1, 1000000);
        var query = _context.Products
            .Include(p => p.Commodity)
            .Include(p => p.Manufacturer)
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(queryDto.Search))
        {
            var search = queryDto.Search.Trim().ToLower();
            query = query.Where(p =>
                p.Name.ToLower().Contains(search) ||
                (p.Sku != null && p.Sku.ToLower().Contains(search)) ||
                (p.Manufacturer != null && p.Manufacturer.Name.ToLower().Contains(search)) ||
                (p.Commodity != null && p.Commodity.Name.ToLower().Contains(search)));
        }

        query = (queryDto.SortBy?.Trim().ToLowerInvariant(), queryDto.SortDirection?.Trim().ToLowerInvariant()) switch
        {
            ("sku", "desc") => query.OrderByDescending(p => p.Sku),
            ("sku", _) => query.OrderBy(p => p.Sku),
            ("createdat", "desc") => query.OrderByDescending(p => p.CreatedAt),
            ("createdat", _) => query.OrderBy(p => p.CreatedAt),
            ("name", "desc") => query.OrderByDescending(p => p.Name),
            _ => query.OrderBy(p => p.Name),
        };

        var total = await query.CountAsync();
        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        // Attach current stock quantity for each product
        if (items.Count > 0)
        {
            var productIds = items.Select(p => p.Id).ToList();
            var stockMap = await _context.ProductQuantities
                .AsNoTracking()
                .Where(q => productIds.Contains(q.ProductId))
                .ToDictionaryAsync(q => q.ProductId, q => q.CurrentQuantity);

            foreach (var product in items)
                product.StockQty = stockMap.GetValueOrDefault(product.Id, 0);
        }

        return new PagedListResult<Product>
        {
            Items = items,
            Page = page,
            PageSize = pageSize,
            Total = total,
        };
    }


    public Task<List<Product>> SearchAsync(string? query, int limit = 25)
    {
        var normalized = query?.Trim().ToLower();
        return _context.Products
            .Include(p => p.Commodity)
            .Include(p => p.Manufacturer)
            .AsNoTracking()
            .Where(p =>
                string.IsNullOrWhiteSpace(normalized) ||
                p.Name.ToLower().Contains(normalized) ||
                (p.Sku != null && p.Sku.ToLower().Contains(normalized)))
            .OrderBy(p => p.Name)
            .Take(Math.Clamp(limit, 1, 100))
            .ToListAsync();
    }

    public Task<Product?> GetByIdAsync(int id)
    {
        return _context.Products.FindAsync(id).AsTask();
    }

    public Task<Product?> GetByIdWithDetailsAsync(int id)
    {
        return _context.Products
            .Include(p => p.Commodity)
            .Include(p => p.Manufacturer)
            .FirstOrDefaultAsync(p => p.Id == id);
    }

    public async Task AddAsync(Product product)
    {
        await _context.Products.AddAsync(product);
    }

    public Task SaveChangesAsync()
    {
        return _context.SaveChangesAsync();
    }

    public Task<bool> ExistsAsync(int id)
    {
        return _context.Products.AnyAsync(e => e.Id == id);
    }

    public void Remove(Product product)
    {
        _context.Products.Remove(product);
    }
}
