using Microsoft.EntityFrameworkCore;
using PlusgrowWms.Api.Data;
using PlusgrowWms.Api.DTOs;
using PlusgrowWms.Api.Models;

namespace PlusgrowWms.Api.Repositories;

public class ImporterRepository : IImporterRepository
{
    private readonly PlusgrowDbContext _context;

    public ImporterRepository(PlusgrowDbContext context)
    {
        _context = context;
    }

    public async Task<PagedListResult<Importer>> GetPagedAsync(ListQueryDto queryDto)
    {
        var page = Math.Max(queryDto.Page, 1);
        var pageSize = Math.Clamp(queryDto.PageSize, 1, 200);
        var query = _context.Importers.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(queryDto.Search))
        {
            var search = queryDto.Search.Trim().ToLower();
            query = query.Where(x =>
                x.Name.ToLower().Contains(search) ||
                (x.Phone != null && x.Phone.ToLower().Contains(search)) ||
                (x.Email != null && x.Email.ToLower().Contains(search)));
        }

        query = (queryDto.SortBy?.Trim().ToLowerInvariant(), queryDto.SortDirection?.Trim().ToLowerInvariant()) switch
        {
            ("createdat", "desc") => query.OrderByDescending(x => x.CreatedAt),
            ("createdat", _) => query.OrderBy(x => x.CreatedAt),
            ("name", "desc") => query.OrderByDescending(x => x.Name),
            _ => query.OrderBy(x => x.Name),
        };

        var total = await query.CountAsync();
        var items = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        return new PagedListResult<Importer> { Items = items, Page = page, PageSize = pageSize, Total = total };
    }

    public Task<Importer?> GetByIdAsync(int id) => _context.Importers.FindAsync(id).AsTask();
    public async Task AddAsync(Importer importer) => await _context.Importers.AddAsync(importer);
    public Task SaveChangesAsync() => _context.SaveChangesAsync();
    public void Update(Importer importer) => _context.Importers.Update(importer);
    public void Remove(Importer importer) => _context.Importers.Remove(importer);
    public Task<bool> ExistsAsync(int id) => _context.Importers.AnyAsync(e => e.Id == id);
}
