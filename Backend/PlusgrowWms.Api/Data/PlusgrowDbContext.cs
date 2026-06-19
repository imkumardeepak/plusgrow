using Microsoft.AspNetCore.Http;
using System.Security.Claims;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using PlusgrowWms.Api.Models;

namespace PlusgrowWms.Api.Data;

public class PlusgrowDbContext : DbContext
{
    private readonly IHttpContextAccessor? _httpContextAccessor;

    public PlusgrowDbContext(DbContextOptions<PlusgrowDbContext> options, IHttpContextAccessor? httpContextAccessor = null) : base(options)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    protected override void ConfigureConventions(ModelConfigurationBuilder configurationBuilder)
    {
        configurationBuilder.Properties<DateTime>().HaveColumnType("timestamp without time zone");
        configurationBuilder.Properties<DateTime?>().HaveColumnType("timestamp without time zone");
    }

    public override int SaveChanges()
    {
        NormalizeDateTimeKinds();
        NormalizeStringsToUppercase();
        ProcessAuditLogs();
        return base.SaveChanges();
    }

    public override int SaveChanges(bool acceptAllChangesOnSuccess)
    {
        NormalizeDateTimeKinds();
        NormalizeStringsToUppercase();
        ProcessAuditLogs();
        return base.SaveChanges(acceptAllChangesOnSuccess);
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        NormalizeDateTimeKinds();
        NormalizeStringsToUppercase();
        ProcessAuditLogs();
        return base.SaveChangesAsync(cancellationToken);
    }

    public override Task<int> SaveChangesAsync(bool acceptAllChangesOnSuccess, CancellationToken cancellationToken = default)
    {
        NormalizeDateTimeKinds();
        NormalizeStringsToUppercase();
        ProcessAuditLogs();
        return base.SaveChangesAsync(acceptAllChangesOnSuccess, cancellationToken);
    }

    public DbSet<Importer> Importers => Set<Importer>();
    public DbSet<Manufacturer> Manufacturers => Set<Manufacturer>();
    public DbSet<Party> Parties => Set<Party>();
    public DbSet<Commodity> Commodities => Set<Commodity>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<SalesOrder> SalesOrders => Set<SalesOrder>();
    public DbSet<OutwardOrder> OutwardOrders => Set<OutwardOrder>();
    public DbSet<User> Users => Set<User>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<RolePageAccess> RolePageAccesses => Set<RolePageAccess>();
    public DbSet<Bin> Bins => Set<Bin>();
    public DbSet<Location> Locations => Set<Location>();
    public DbSet<PoInvoiceHeader> PoInvoiceHeaders => Set<PoInvoiceHeader>();
    public DbSet<PoInvoice> PoInvoices => Set<PoInvoice>();
    public DbSet<ProductQuantity> ProductQuantities => Set<ProductQuantity>();
    public DbSet<ProductStockMovement> ProductStockMovements => Set<ProductStockMovement>();
    public DbSet<ProductAllottedLocation> ProductAllottedLocations => Set<ProductAllottedLocation>();
    public DbSet<StickerPrinterConfig> StickerPrinterConfigs => Set<StickerPrinterConfig>();
    public DbSet<StockCheckReport> StockCheckReports => Set<StockCheckReport>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<PoInvoiceLocation> PoInvoiceLocations => Set<PoInvoiceLocation>();


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

        modelBuilder.Entity<SalesOrder>()
            .HasIndex(x => x.OrderNumber)
            .IsUnique();

        modelBuilder.Entity<OutwardOrder>()
            .HasIndex(x => x.SalesOrderId);

        modelBuilder.Entity<OutwardOrder>()
            .HasIndex(x => x.Status);

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

        modelBuilder.Entity<ProductQuantity>()
            .HasIndex(x => x.CurrentQuantity);

        modelBuilder.Entity<ProductAllottedLocation>()
            .HasIndex(x => x.ProductId)
            .IsUnique();

        modelBuilder.Entity<ProductAllottedLocation>()
            .HasIndex(x => x.UpdatedAt);

        modelBuilder.Entity<ProductStockMovement>()
            .HasIndex(x => x.ProductId);

        modelBuilder.Entity<ProductStockMovement>()
            .HasIndex(x => x.CreatedAt);

        modelBuilder.Entity<PoInvoiceHeader>()
            .HasIndex(x => x.InvoiceNumber);

        modelBuilder.Entity<PoInvoiceHeader>()
            .HasIndex(x => x.InvoiceDate);

        modelBuilder.Entity<PoInvoiceHeader>()
            .Property(x => x.Status)
            .HasDefaultValue("Active");

        modelBuilder.Entity<PoInvoiceHeader>()
            .HasIndex(x => x.Status);

        modelBuilder.Entity<PoInvoice>()
            .HasIndex(x => new { x.PoInvoiceHeaderId, x.ProductId });

        modelBuilder.Entity<PoInvoice>()
            .HasIndex(x => x.Printed);

        modelBuilder.Entity<PoInvoice>()
            .HasIndex(x => x.LocationAllotted);

        modelBuilder.Entity<PoInvoice>()
            .HasIndex(x => x.RemainingAllocation);

        modelBuilder.Entity<PoInvoice>()
            .HasIndex(x => new { x.ProductId, x.RemainingAllocation, x.PoInvoiceHeaderId });

        // Additional indexes for performance
        modelBuilder.Entity<Product>()
            .HasIndex(p => p.CommodityId);

        modelBuilder.Entity<Product>()
            .HasIndex(p => p.ManufacturerId);

        modelBuilder.Entity<Product>()
            .HasIndex(p => p.Name);

        modelBuilder.Entity<PoInvoice>()
            .HasOne(x => x.Header)
            .WithMany(x => x.Items)
            .HasForeignKey(x => x.PoInvoiceHeaderId)
            .OnDelete(DeleteBehavior.Cascade);

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

        modelBuilder.Entity<OutwardOrder>()
            .HasOne(x => x.SalesOrder)
            .WithMany(x => x.Items)
            .HasForeignKey(x => x.SalesOrderId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<OutwardOrder>()
            .HasOne(x => x.Product)
            .WithMany()
            .HasForeignKey(x => x.ProductId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ProductStockMovement>()
            .HasOne(x => x.Product)
            .WithMany()
            .HasForeignKey(x => x.ProductId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ProductStockMovement>()
            .HasOne(x => x.PerformedByUser)
            .WithMany()
            .HasForeignKey(x => x.PerformedByUserId)
            .OnDelete(DeleteBehavior.SetNull);

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

        modelBuilder.Entity<StockCheckReport>()
            .HasIndex(x => x.CheckType);

        modelBuilder.Entity<StockCheckReport>()
            .HasIndex(x => x.CreatedAt);

        modelBuilder.Entity<StockCheckReport>()
            .HasIndex(x => x.Status);

        modelBuilder.Entity<StockCheckReport>()
            .HasOne(x => x.PerformedByUser)
            .WithMany()
            .HasForeignKey(x => x.PerformedByUserId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<StockCheckReport>()
            .Property(x => x.Status)
            .HasDefaultValue("COMPLETED");

        modelBuilder.Entity<AuditLog>()
            .HasIndex(x => x.Action);

        modelBuilder.Entity<AuditLog>()
            .HasIndex(x => x.EntityType);

        modelBuilder.Entity<AuditLog>()
            .HasIndex(x => x.Timestamp);

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

    private void NormalizeStringsToUppercase()
    {
        var masterDataTypes = new[]
        {
            typeof(Manufacturer),
            typeof(Importer),
            typeof(Party),
            typeof(Commodity),
            typeof(Location),
            typeof(Bin),
            typeof(Product)
        };

        foreach (var entry in ChangeTracker.Entries().Where(ShouldNormalizeEntry))
        {
            if (masterDataTypes.Contains(entry.Entity.GetType()))
            {
                foreach (var property in entry.Properties)
                {
                    if (property.Metadata.ClrType == typeof(string) && property.CurrentValue is string stringValue)
                    {
                        // Keep UnitType in lowercase for Products, keep NetQuantity as is (preserve case)
                        if (entry.Entity is Product && property.Metadata.Name == "UnitType")
                        {
                            property.CurrentValue = stringValue.ToLowerInvariant();
                        }
                        else if (entry.Entity is Product && property.Metadata.Name == "NetQuantity")
                        {
                            // Do nothing, preserve casing
                        }
                        else
                        {
                            property.CurrentValue = stringValue.ToUpperInvariant();
                        }
                    }
                }
            }
        }
    }

    private void ProcessAuditLogs()
    {
        var auditEntries = new List<AuditLog>();
        var userIdClaim = _httpContextAccessor?.HttpContext?.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        int? userId = int.TryParse(userIdClaim, out var parsed) ? parsed : null;
        var username = _httpContextAccessor?.HttpContext?.User.FindFirst(ClaimTypes.GivenName)?.Value 
            ?? _httpContextAccessor?.HttpContext?.User.Identity?.Name 
            ?? "System";

        var entries = ChangeTracker.Entries()
            .Where(e => e.Entity is not AuditLog && 
                       (e.State == EntityState.Added || e.State == EntityState.Modified || e.State == EntityState.Deleted))
            .ToList();

        foreach (var entry in entries)
        {
            var auditLog = new AuditLog
            {
                UserId = userId,
                Username = username,
                EntityType = entry.Entity.GetType().Name,
                Timestamp = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified),
                Action = entry.State.ToString()
            };

            var primaryKey = entry.Properties.FirstOrDefault(p => p.Metadata.IsPrimaryKey());
            if (primaryKey != null)
            {
                auditLog.EntityId = primaryKey.CurrentValue?.ToString();
            }

            var oldValues = new Dictionary<string, object?>();
            var newValues = new Dictionary<string, object?>();

            foreach (var property in entry.Properties)
            {
                if (property.IsTemporary) continue; // Skip temporary properties for Inserts

                string propertyName = property.Metadata.Name;

                switch (entry.State)
                {
                    case EntityState.Added:
                        newValues[propertyName] = property.CurrentValue;
                        break;

                    case EntityState.Deleted:
                        oldValues[propertyName] = property.OriginalValue;
                        break;

                    case EntityState.Modified:
                        if (property.IsModified)
                        {
                            oldValues[propertyName] = property.OriginalValue;
                            newValues[propertyName] = property.CurrentValue;
                        }
                        break;
                }
            }

            if (entry.State == EntityState.Modified && oldValues.Count == 0 && newValues.Count == 0)
            {
                continue; // No actual property changes
            }

            if (oldValues.Count > 0) auditLog.OldValues = JsonSerializer.Serialize(oldValues);
            if (newValues.Count > 0) auditLog.NewValues = JsonSerializer.Serialize(newValues);

            auditEntries.Add(auditLog);
        }

        if (auditEntries.Any())
        {
            AuditLogs.AddRange(auditEntries);
        }
    }
}
