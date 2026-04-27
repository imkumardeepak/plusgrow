using Microsoft.EntityFrameworkCore;
using PlusgrowWms.Api.Data;
using PlusgrowWms.Api.Models;

namespace PlusgrowWms.Api.Repositories;

public interface IUserRepository
{
    Task<IEnumerable<User>> GetAllWithRoleAsync();
    Task<User?> GetByIdWithRoleAsync(int id);
    Task<User?> GetByUsernameAsync(string username);
    Task<User> CreateAsync(User user);
    Task UpdateAsync(User user);
    Task UpdateLastLoginAsync(User user, DateTime lastLoginAt);
    Task<bool> ChangePasswordAsync(int userId, string newPasswordHash);
}

public class UserRepository : GenericRepository<User>, IUserRepository
{
    public UserRepository(PlusgrowDbContext context) : base(context)
    {
    }

    public async Task<IEnumerable<User>> GetAllWithRoleAsync()
    {
        return await _dbSet
            .Include(u => u.Role)
            .Where(u => u.IsActive)
            .ToListAsync();
    }

    public async Task<User?> GetByIdWithRoleAsync(int id)
    {
        return await _dbSet
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Id == id);
    }

    public async Task<User?> GetByUsernameAsync(string username)
    {
        return await _dbSet
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Username == username);
    }

    public async Task<User> CreateAsync(User user)
    {
        await _dbSet.AddAsync(user);
        await _context.SaveChangesAsync();
        return user;
    }

    public async Task UpdateAsync(User user)
    {
        if (_context.Entry(user).State != EntityState.Detached)
        {
            await _context.SaveChangesAsync();
            return;
        }

        _dbSet.Update(user);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateLastLoginAsync(User user, DateTime lastLoginAt)
    {
        var normalizedLastLoginAt = DateTime.SpecifyKind(lastLoginAt, DateTimeKind.Unspecified);

        await _dbSet
            .Where(x => x.Id == user.Id)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(x => x.LastLoginAt, _ => normalizedLastLoginAt));

        var entry = _context.Entry(user);
        if (entry.State != EntityState.Detached)
        {
            entry.Property(x => x.LastLoginAt).CurrentValue = normalizedLastLoginAt;
            entry.Property(x => x.LastLoginAt).OriginalValue = normalizedLastLoginAt;
            entry.State = EntityState.Unchanged;
            return;
        }

        user.LastLoginAt = normalizedLastLoginAt;
    }

    public async Task<bool> ChangePasswordAsync(int userId, string newPasswordHash)
    {
        var user = await _dbSet.FindAsync(userId);
        if (user == null) return false;
        
        user.PasswordHash = newPasswordHash;
        await _context.SaveChangesAsync();
        return true;
    }
}
