using Microsoft.EntityFrameworkCore;
using PlusgrowWms.Api.Data;
using PlusgrowWms.Api.Models;

namespace PlusgrowWms.Api.Repositories;
public interface IRoleRepository
{
    Task<IEnumerable<Role>> GetAllWithDetailsAsync();
    Task<Role?> GetByIdWithAccessAsync(int id);
    Task<Role?> GetByNameAsync(string name);
    Task<Role> CreateAsync(Role role);
    Task UpdateAsync(Role role);
    Task DeleteAsync(int id);
    Task UpdatePageAccessAsync(int roleId, List<RolePageAccess> accesses);
}

public class RoleRepository : GenericRepository<Role>, IRoleRepository
{
    public RoleRepository(PlusgrowDbContext context) : base(context)
    {
    }

    public async Task<IEnumerable<Role>> GetAllWithDetailsAsync()
    {
        return await _dbSet
            .Include(r => r.Users)
            .Where(r => r.IsActive)
            .ToListAsync();
    }

    public async Task<Role?> GetByIdWithAccessAsync(int id)
    {
        return await _dbSet
            .Include(r => r.RolePageAccesses)
            .FirstOrDefaultAsync(r => r.Id == id);
    }

    public async Task<Role?> GetByNameAsync(string name)
    {
        return await _dbSet.FirstOrDefaultAsync(r => r.Name == name);
    }

    public async Task<Role> CreateAsync(Role role)
    {
        await _dbSet.AddAsync(role);
        await _context.SaveChangesAsync();
        return role;
    }

    public async Task UpdateAsync(Role role)
    {
        _dbSet.Update(role);
        await _context.SaveChangesAsync();
    }

    public async Task UpdatePageAccessAsync(int roleId, List<RolePageAccess> accesses)
    {
        var existing = await _dbSet
            .Include(r => r.RolePageAccesses)
            .FirstOrDefaultAsync(r => r.Id == roleId);
            
        if (existing != null)
        {
            _context.RolePageAccesses.RemoveRange(existing.RolePageAccesses);
            existing.RolePageAccesses = accesses;
            await _context.SaveChangesAsync();
        }
    }
}
