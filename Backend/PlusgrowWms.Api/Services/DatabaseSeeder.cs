using Microsoft.EntityFrameworkCore;
using PlusgrowWms.Api.Data;
using PlusgrowWms.Api.Models;

namespace PlusgrowWms.Api.Services;

public interface IDatabaseSeeder
{
    Task SeedAsync();
}

public class DatabaseSeeder : IDatabaseSeeder
{
    private readonly PlusgrowDbContext _context;
    private readonly ILogger<DatabaseSeeder> _logger;

    public DatabaseSeeder(PlusgrowDbContext context, ILogger<DatabaseSeeder> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task SeedAsync()
    {
        try
        {
            // Ensure database is created
            await _context.Database.EnsureCreatedAsync();

            // Seed Roles
            await SeedRolesAsync();

            // Seed Superadmin User
            await SeedSuperadminAsync();

            _logger.LogInformation("Database seeding completed successfully");
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Database seeding encountered an issue - this may be expected if data already exists");
            // Don't throw - allow app to continue even if seeding fails
        }
    }

    private async Task SeedRolesAsync()
    {
        var defaultRoles = new Dictionary<string, string>
        {
            ["Superadmin"] = "Full system access with all permissions",
            ["Admin"] = "Administrative access for user and operations management",
            ["Manager"] = "Warehouse management access",
            ["Warehouse Operator"] = "Operational warehouse access",
            ["Viewer"] = "Read-only access",
            ["Party"] = "Party access role",
        };

        foreach (var item in defaultRoles)
        {
            var role = await _context.Roles.FirstOrDefaultAsync(r => r.Name == item.Key);
            if (role == null)
            {
                role = new Role
                {
                    Name = item.Key,
                    Description = item.Value,
                    IsActive = true,
                    CreatedAt = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified)
                };
                _context.Roles.Add(role);
                _logger.LogInformation("Created {RoleName} role", item.Key);
            }

            else
            {
                _logger.LogInformation("{RoleName} role already exists with ID: {Id}", item.Key, role.Id);
            }
        }

        await _context.SaveChangesAsync();
    }

    private async Task SeedSuperadminAsync()
    {
        // Check if superadmin user exists
        var superadminExists = await _context.Users.AnyAsync(u => u.Username == "superadmin");
        if (!superadminExists)
        {
            // Get Superadmin role - create if not exists
            var superadminRole = await _context.Roles.FirstOrDefaultAsync(r => r.Name == "Superadmin");
            if (superadminRole == null)
            {
                superadminRole = new Role
                {
                    Name = "Superadmin",
                    Description = "Full system access with all permissions",
                    IsActive = true,
                    CreatedAt = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified)
                };
                _context.Roles.Add(superadminRole);
                await _context.SaveChangesAsync();
            }
            
            var superadmin = new User
            {
                Username = "superadmin",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Super@Admin@2024", workFactor: 12),
                FullName = "System Superadmin",
                Email = "superadmin@plusgrow.com",
                Phone = "+91-9999999999",
                RoleId = superadminRole.Id,
                IsActive = true,
                CreatedAt = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified)
            };

            _context.Users.Add(superadmin);
            await _context.SaveChangesAsync();
            
            _logger.LogInformation("Created superadmin user with credentials: superadmin / Super@Admin@2024");
            
            // Seed role page access for Superadmin
            await SeedSuperadminPageAccessAsync(superadminRole.Id);
        }
        else
        {
            _logger.LogInformation("Superadmin user already exists");
            
            // Still ensure page access is seeded
            var superadminRole = await _context.Roles.FirstOrDefaultAsync(r => r.Name == "Superadmin");
            if (superadminRole != null)
            {
                await SeedSuperadminPageAccessAsync(superadminRole.Id);
            }
        }
    }

    private async Task SeedSuperadminPageAccessAsync(int roleId)
    {
        var pages = new[]
        {
            "dashboard", "inward", "sticker", "receiving", "putaway",
            "outward", "packing", "dispatch", "importers", "manufacturers", "parties",
            "commodities", "bins", "locations", "mpd", "products",
            "sticker-printer-config", "stock-check", "stock-movement",
            "warehouse-map", "role-master", "user-master", "profile"
        };

        foreach (var page in pages)
        {
            var exists = await _context.RolePageAccesses
                .AnyAsync(rpa => rpa.RoleId == roleId && rpa.PageKey == page);

            if (!exists)
            {
                var access = new RolePageAccess
                {
                    RoleId = roleId,
                    PageKey = page,
                    CanView = true,
                    CanCreate = true,
                    CanEdit = true,
                    CanDelete = true,
                    CreatedAt = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified)
                };
                _context.RolePageAccesses.Add(access);
            }
        }

        await _context.SaveChangesAsync();
        _logger.LogInformation("Granted full page access to Superadmin role");
    }
}
