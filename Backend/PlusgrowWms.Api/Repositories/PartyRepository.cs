using Microsoft.EntityFrameworkCore;
using PlusgrowWms.Api.Data;
using PlusgrowWms.Api.DTOs;
using PlusgrowWms.Api.Models;

namespace PlusgrowWms.Api.Repositories;

public class PartyRepository : IPartyRepository
{
    private readonly PlusgrowDbContext _context;

    public PartyRepository(PlusgrowDbContext context)
    {
        _context = context;
    }

    public async Task<PagedListResult<Party>> GetPagedAsync(ListQueryDto queryDto)
    {
        var page = Math.Max(queryDto.Page, 1);
        var pageSize = Math.Clamp(queryDto.PageSize, 1, 1000000);
        var query = _context.Parties.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(queryDto.Search))
        {
            var search = queryDto.Search.Trim().ToLower();
            query = query.Where(x =>
                x.Name.ToLower().Contains(search) ||
                x.Email.ToLower().Contains(search) ||
                (x.Country != null && x.Country.ToLower().Contains(search)) ||
                (x.Phone != null && x.Phone.Contains(search)) ||
                (x.Address != null && x.Address.ToLower().Contains(search)));
        }

        query = (queryDto.SortBy?.Trim().ToLowerInvariant(), queryDto.SortDirection?.Trim().ToLowerInvariant()) switch
        {
            ("email", "desc") => query.OrderByDescending(x => x.Email),
            ("email", _) => query.OrderBy(x => x.Email),
            ("country", "desc") => query.OrderByDescending(x => x.Country),
            ("country", _) => query.OrderBy(x => x.Country),
            ("createdat", "desc") => query.OrderByDescending(x => x.CreatedAt),
            ("createdat", _) => query.OrderBy(x => x.CreatedAt),
            ("name", "desc") => query.OrderByDescending(x => x.Name),
            _ => query.OrderBy(x => x.Name),
        };

        var total = await query.CountAsync();
        var items = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        return new PagedListResult<Party> { Items = items, Page = page, PageSize = pageSize, Total = total };
    }

    public Task<Party?> GetByIdAsync(int id) => _context.Parties.FindAsync(id).AsTask();
    
    public Task<Party?> GetByEmailAsync(string email) => 
        _context.Parties.FirstOrDefaultAsync(p => p.Email.ToLower() == email.ToLower());

    public async Task AddAsync(Party party) => await _context.Parties.AddAsync(party);
    
    public Task SaveChangesAsync() => _context.SaveChangesAsync();
    
    public void Update(Party party) => _context.Parties.Update(party);
    
    public void Remove(Party party) => _context.Parties.Remove(party);
    
    public Task<bool> ExistsAsync(int id) => _context.Parties.AnyAsync(e => e.Id == id);
}
