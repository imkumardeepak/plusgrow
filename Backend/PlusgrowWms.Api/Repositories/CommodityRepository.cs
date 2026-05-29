using Microsoft.EntityFrameworkCore;
using PlusgrowWms.Api.Data;
using PlusgrowWms.Api.DTOs;
using PlusgrowWms.Api.Models;

namespace PlusgrowWms.Api.Repositories;

public class CommodityRepository : ICommodityRepository
{
    private readonly PlusgrowDbContext _context;

    public CommodityRepository(PlusgrowDbContext context)
    {
        _context = context;
    }

    public async Task<PagedListResult<Commodity>> GetPagedAsync(ListQueryDto queryDto)
    {
        var page = Math.Max(queryDto.Page, 1);
        var pageSize = Math.Clamp(queryDto.PageSize, 1, 1000000);
        var query = _context.Commodities.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(queryDto.Search))
        {
            var search = queryDto.Search.Trim().ToLower();
            query = query.Where(x => x.Name.ToLower().Contains(search));
        }

        query = queryDto.SortDirection?.Trim().ToLowerInvariant() == "desc"
            ? query.OrderByDescending(x => x.Name)
            : query.OrderBy(x => x.Name);

        var total = await query.CountAsync();
        var items = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        return new PagedListResult<Commodity> { Items = items, Page = page, PageSize = pageSize, Total = total };
    }

    public Task<Commodity?> GetByIdAsync(int id) => _context.Commodities.FindAsync(id).AsTask();
    public async Task AddAsync(Commodity commodity) => await _context.Commodities.AddAsync(commodity);
    public Task SaveChangesAsync() => _context.SaveChangesAsync();
    public void Update(Commodity commodity) => _context.Commodities.Update(commodity);
    public void Remove(Commodity commodity) => _context.Commodities.Remove(commodity);
    public Task<bool> ExistsAsync(int id) => _context.Commodities.AnyAsync(e => e.Id == id);
}
