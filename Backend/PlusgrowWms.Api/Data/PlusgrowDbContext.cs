using Microsoft.EntityFrameworkCore;
using PlusgrowWms.Api.Models;

namespace PlusgrowWms.Api.Data;

public class PlusgrowDbContext : DbContext
{
    public PlusgrowDbContext(DbContextOptions<PlusgrowDbContext> options) : base(options)
    {
    }
    
    public DbSet<Importer> Importers => Set<Importer>();
    public DbSet<Manufacturer> Manufacturers => Set<Manufacturer>();
    public DbSet<Commodity> Commodities => Set<Commodity>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<User> Users => Set<User>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<RolePageAccess> RolePageAccesses => Set<RolePageAccess>();
    
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        
        // Use snake_case for all table names
        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            var tableName = entityType.GetTableName();
            entityType.SetTableName(tableName?.ToLower());
        }
        
        // Configure cascade delete for Product -> Commodity
        modelBuilder.Entity<Product>()
            .HasOne(p => p.Commodity)
            .WithMany(c => c.Products)
            .HasForeignKey(p => p.CommodityId)
            .OnDelete(DeleteBehavior.Cascade);
        
        // Configure cascade delete for Product -> Manufacturer
        modelBuilder.Entity<Product>()
            .HasOne(p => p.Manufacturer)
            .WithMany()
            .HasForeignKey(p => p.ManufacturerId)
            .OnDelete(DeleteBehavior.Cascade);
        
        // Unique indexes (use lowercase column names)
        modelBuilder.Entity<Commodity>()
            .HasIndex(c => c.Name)
            .IsUnique();
            
        modelBuilder.Entity<Product>()
            .HasIndex(p => p.Sku)
            .IsUnique();
            
        modelBuilder.Entity<User>()
            .HasIndex(u => u.Username)
            .IsUnique();
            
        modelBuilder.Entity<Role>()
            .HasIndex(r => r.Name)
            .IsUnique();
        
        // Additional indexes for performance
        modelBuilder.Entity<Product>()
            .HasIndex(p => p.CommodityId);
            
        modelBuilder.Entity<Product>()
            .HasIndex(p => p.ManufacturerId);
            
        modelBuilder.Entity<Product>()
            .HasIndex(p => p.HsnCode);
            
        modelBuilder.Entity<Product>()
            .HasIndex(p => p.Name);
            
        modelBuilder.Entity<User>()
            .HasIndex(u => u.RoleId);
            
        modelBuilder.Entity<User>()
            .HasIndex(u => u.IsActive);
            
        modelBuilder.Entity<RolePageAccess>()
            .HasIndex(rpa => new { rpa.RoleId, rpa.PageKey })
            .IsUnique();
            
        modelBuilder.Entity<Importer>()
            .HasIndex(i => i.Cin);
            
        modelBuilder.Entity<Manufacturer>()
            .HasIndex(m => m.Country);
    }
}
