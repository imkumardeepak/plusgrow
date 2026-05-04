using Microsoft.EntityFrameworkCore;
using PlusgrowWms.Api.Data;
using PlusgrowWms.Api.Models;

namespace PlusgrowWms.Api.Repositories;

public class BinRepository : IBinRepository
{
    private readonly PlusgrowDbContext _context;

    public BinRepository(PlusgrowDbContext context)
    {
        _context = context;
    }

    public Task<List<Bin>> GetAllAsync()
    {
        return _context.Bins.OrderBy(b => b.BinCode).ToListAsync();
    }

    public Task<Bin?> GetByIdAsync(int id)
    {
        return _context.Bins.FindAsync(id).AsTask();
    }

    public Task AddAsync(Bin bin)
    {
        return _context.Bins.AddAsync(bin).AsTask();
    }

    public void Remove(Bin bin)
    {
        _context.Bins.Remove(bin);
    }

    public Task<int> CountAsync()
    {
        return _context.Bins.CountAsync();
    }

    public Task SaveChangesAsync()
    {
        return _context.SaveChangesAsync();
    }
}
