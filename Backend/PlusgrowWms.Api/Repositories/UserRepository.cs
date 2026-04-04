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
        _dbSet.Update(user);
        await _context.SaveChangesAsync();
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
