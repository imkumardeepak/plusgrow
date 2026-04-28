using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using PlusgrowWms.Api.Models;

namespace PlusgrowWms.Api.Data;

public class PlusgrowDbContext : DbContext
{
    public PlusgrowDbContext(DbContextOptions<PlusgrowDbContext> options) : base(options)
    {
    }

    protected override void ConfigureConventions(ModelConfigurationBuilder configurationBuilder)
    {
        configurationBuilder.Properties<DateTime>().HaveColumnType("timestamp without time zone");
        configurationBuilder.Properties<DateTime?>().HaveColumnType("timestamp without time zone");
    }

    public override int SaveChanges()
    {
        NormalizeDateTimeKinds();
        return base.SaveChanges();
    }

    public override int SaveChanges(bool acceptAllChangesOnSuccess)
    {
        NormalizeDateTimeKinds();
        return base.SaveChanges(acceptAllChangesOnSuccess);
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        NormalizeDateTimeKinds();
        return base.SaveChangesAsync(cancellationToken);
    }

    public override Task<int> SaveChangesAsync(bool acceptAllChangesOnSuccess, CancellationToken cancellationToken = default)
    {
        NormalizeDateTimeKinds();
        return base.SaveChangesAsync(acceptAllChangesOnSuccess, cancellationToken);
    }

    public DbSet<Importer> Importers => Set<Importer>();
    public DbSet<Manufacturer> Manufacturers => Set<Manufacturer>();
    public DbSet<Commodity> Commodities => Set<Commodity>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<User> Users => Set<User>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<RolePageAccess> RolePageAccesses => Set<RolePageAccess>();
    public DbSet<Bin> Bins => Set<Bin>();
    public DbSet<Location> Locations => Set<Location>();
    public DbSet<PoInvoice> PoInvoices => Set<PoInvoice>();
    public DbSet<ProductQuantity> ProductQuantities => Set<ProductQuantity>();
    public DbSet<ProductAllottedLocation> ProductAllottedLocations => Set<ProductAllottedLocation>();
    public DbSet<StickerPrinterConfig> StickerPrinterConfigs => Set<StickerPrinterConfig>();


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

        modelBuilder.Entity<Bin>()
            .HasIndex(b => b.BinCode)
            .IsUnique();

        modelBuilder.Entity<Location>()
            .HasIndex(l => l.LocationCode)
            .IsUnique();

        modelBuilder.Entity<ProductQuantity>()
            .HasIndex(x => x.ProductId)
            .IsUnique();

        modelBuilder.Entity<ProductAllottedLocation>()
            .HasIndex(x => x.ProductId)
            .IsUnique();

        modelBuilder.Entity<PoInvoice>()
            .HasIndex(x => new { x.InvoiceDate, x.ProductId });

        modelBuilder.Entity<PoInvoice>()
            .HasIndex(x => x.InvoiceNumber)
            .IsUnique();


        // Additional indexes for performance
        modelBuilder.Entity<Product>()
            .HasIndex(p => p.CommodityId);

        modelBuilder.Entity<Product>()
            .HasIndex(p => p.ManufacturerId);

        modelBuilder.Entity<Product>()
            .HasIndex(p => p.Name);

        modelBuilder.Entity<PoInvoice>()
            .HasOne(x => x.Product)
            .WithMany()
            .HasForeignKey(x => x.ProductId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ProductQuantity>()
            .HasOne(x => x.Product)
            .WithMany()
            .HasForeignKey(x => x.ProductId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ProductAllottedLocation>()
            .HasOne(x => x.Product)
            .WithMany()
            .HasForeignKey(x => x.ProductId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<User>()
            .HasIndex(u => u.RoleId);

        modelBuilder.Entity<User>()
            .HasIndex(u => u.IsActive);

        modelBuilder.Entity<RolePageAccess>()
            .HasIndex(rpa => new { rpa.RoleId, rpa.PageKey })
            .IsUnique();

        modelBuilder.Entity<Manufacturer>()
            .HasIndex(m => m.Country);

        modelBuilder.Entity<StickerPrinterConfig>()
            .HasIndex(c => c.StickerSize)
            .IsUnique();
    }

    private void NormalizeDateTimeKinds()
    {
        foreach (var entry in ChangeTracker.Entries().Where(ShouldNormalizeEntry))
        {
            foreach (var property in entry.Properties)
            {
                if (property.Metadata.ClrType == typeof(DateTime) && property.CurrentValue is DateTime dateTimeValue)
                {
                    property.CurrentValue = NormalizeToTimestampWithoutTimeZone(dateTimeValue);
                    continue;
                }

                if (property.Metadata.ClrType == typeof(DateTime?) && property.CurrentValue is DateTime nullableDateTimeValue)
                {
                    property.CurrentValue = NormalizeToTimestampWithoutTimeZone(nullableDateTimeValue);
                }
            }
        }
    }

    private static bool ShouldNormalizeEntry(EntityEntry entry)
    {
        return entry.State is EntityState.Added or EntityState.Modified;
    }

    private static DateTime NormalizeToTimestampWithoutTimeZone(DateTime value)
    {
        return DateTime.SpecifyKind(value, DateTimeKind.Unspecified);
    }
}
