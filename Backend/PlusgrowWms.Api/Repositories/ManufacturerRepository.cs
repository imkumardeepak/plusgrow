using Microsoft.EntityFrameworkCore;
using PlusgrowWms.Api.Data;
using PlusgrowWms.Api.DTOs;
using PlusgrowWms.Api.Models;

namespace PlusgrowWms.Api.Repositories;

public class ManufacturerRepository : IManufacturerRepository
{
    private readonly PlusgrowDbContext _context;

    public ManufacturerRepository(PlusgrowDbContext context)
    {
        _context = context;
    }

    public async Task<PagedListResult<Manufacturer>> GetPagedAsync(ListQueryDto queryDto)
    {
        var page = Math.Max(queryDto.Page, 1);
        var pageSize = Math.Clamp(queryDto.PageSize, 1, 200);
        var query = _context.Manufacturers.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(queryDto.Search))
        {
            var search = queryDto.Search.Trim().ToLower();
            query = query.Where(x =>
                x.Name.ToLower().Contains(search) ||
                (x.Country != null && x.Country.ToLower().Contains(search)));
        }

        query = (queryDto.SortBy?.Trim().ToLowerInvariant(), queryDto.SortDirection?.Trim().ToLowerInvariant()) switch
        {
            ("country", "desc") => query.OrderByDescending(x => x.Country),
            ("country", _) => query.OrderBy(x => x.Country),
            ("createdat", "desc") => query.OrderByDescending(x => x.CreatedAt),
            ("createdat", _) => query.OrderBy(x => x.CreatedAt),
            ("name", "desc") => query.OrderByDescending(x => x.Name),
            _ => query.OrderBy(x => x.Name),
        };

        var total = await query.CountAsync();
        var items = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        return new PagedListResult<Manufacturer> { Items = items, Page = page, PageSize = pageSize, Total = total };
    }

    public Task<Manufacturer?> GetByIdAsync(int id) => _context.Manufacturers.FindAsync(id).AsTask();
    public async Task AddAsync(Manufacturer manufacturer) => await _context.Manufacturers.AddAsync(manufacturer);
    public Task SaveChangesAsync() => _context.SaveChangesAsync();
    public void Update(Manufacturer manufacturer) => _context.Manufacturers.Update(manufacturer);
    public void Remove(Manufacturer manufacturer) => _context.Manufacturers.Remove(manufacturer);
    public Task<bool> ExistsAsync(int id) => _context.Manufacturers.AnyAsync(e => e.Id == id);
}
