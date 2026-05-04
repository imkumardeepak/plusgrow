using Microsoft.EntityFrameworkCore;
using PlusgrowWms.Api.Data;
using PlusgrowWms.Api.DTOs;

namespace PlusgrowWms.Api.Repositories;

public class DashboardRepository : IDashboardRepository
{
    private readonly PlusgrowDbContext _context;

    public DashboardRepository(PlusgrowDbContext context)
    {
        _context = context;
    }

    public async Task<DashboardSummaryDto> GetSummaryAsync()
    {
        var productCount = await _context.Products.AsNoTracking().CountAsync();
        var commodityCount = await _context.Commodities.AsNoTracking().CountAsync();
        var manufacturerCount = await _context.Manufacturers.AsNoTracking().CountAsync();
        var importerCount = await _context.Importers.AsNoTracking().CountAsync();
        var binCount = await _context.Bins.AsNoTracking().CountAsync();
        var locationCount = await _context.Locations.AsNoTracking().CountAsync();
        var quantityCount = await _context.ProductQuantities.AsNoTracking().CountAsync();
        var skusWithStock = await _context.ProductQuantities.AsNoTracking().CountAsync(x => x.CurrentQuantity > 0);
        var totalStock = await _context.ProductQuantities.AsNoTracking().SumAsync(x => (int?)x.CurrentQuantity) ?? 0;
        var poInvoiceCount = await _context.PoInvoices.AsNoTracking().CountAsync();
        var pendingPoCount = await _context.PoInvoices.AsNoTracking().CountAsync(x => !x.Printed || !x.LocationAllotted);
        var pendingStickerRows = await _context.PoInvoices.AsNoTracking().CountAsync(x => !x.Printed);
        var pendingPutAway = await _context.PoInvoices.AsNoTracking().SumAsync(x => (int?)x.RemainingAllocation) ?? 0;
        var outwardCount = await _context.OutwardOrders.AsNoTracking().CountAsync();
        var openOutwardCount = await _context.OutwardOrders.AsNoTracking().CountAsync(x => x.Status != "Dispatched");
        var pendingDispatch = await _context.OutwardOrders
            .AsNoTracking()
            .Where(x => x.Status != "Dispatched")
            .SumAsync(x => (int?)(x.Quantity - x.PickedQuantity)) ?? 0;
        var totalOutbound = await _context.OutwardOrders.AsNoTracking().SumAsync(x => (int?)x.Quantity) ?? 0;
        var pickedOutbound = await _context.OutwardOrders.AsNoTracking().SumAsync(x => (int?)x.PickedQuantity) ?? 0;

        var topStockPositions = await _context.ProductQuantities
            .AsNoTracking()
            .Include(x => x.Product)
            .OrderByDescending(x => x.CurrentQuantity)
            .Take(6)
            .Select(x => new DashboardStockPositionDto
            {
                Id = x.Id,
                SkuCode = x.Product != null ? x.Product.Sku ?? string.Empty : string.Empty,
                ProductName = x.Product != null ? x.Product.Name : string.Empty,
                CurrentQuantity = x.CurrentQuantity,
            })
            .ToListAsync();

        var activeDispatchQueue = await _context.OutwardOrders
            .AsNoTracking()
            .Include(x => x.Product)
            .Where(x => x.Status != "Dispatched")
            .OrderBy(x => x.OrderDate)
            .ThenBy(x => x.Id)
            .Take(8)
            .Select(x => new DashboardDispatchQueueDto
            {
                Id = x.Id,
                OrderNumber = x.OrderNumber,
                CustomerName = x.CustomerName,
                ProductName = x.Product != null ? x.Product.Name : string.Empty,
                PendingQuantity = Math.Max(x.Quantity - x.PickedQuantity, 0),
                Status = x.Status,
            })
            .ToListAsync();

        var recentMovements = await _context.ProductStockMovements
            .AsNoTracking()
            .Include(x => x.Product)
            .OrderByDescending(x => x.CreatedAt)
            .Take(8)
            .Select(x => new DashboardMovementDto
            {
                Id = x.Id,
                SkuCode = x.Product != null ? x.Product.Sku ?? string.Empty : string.Empty,
                ProductName = x.Product != null ? x.Product.Name : string.Empty,
                QuantityChange = x.QuantityChange,
                QuantityAfter = x.QuantityAfter,
                Reason = x.Reason,
                CreatedAt = x.CreatedAt,
            })
            .ToListAsync();

        var allocatedQuantity = await GetAllocatedQuantityAsync();
        var allottedLocationCount = await GetAllottedLocationCountAsync();

        var response = new DashboardSummaryDto
        {
            ProductCount = productCount,
            CommodityCount = commodityCount,
            ManufacturerCount = manufacturerCount,
            ImporterCount = importerCount,
            BinCount = binCount,
            LocationCount = locationCount,
            ProductQuantityCount = quantityCount,
            SkusWithStock = skusWithStock,
            ZeroStockProducts = Math.Max(productCount - skusWithStock, 0),
            TotalStockQuantity = totalStock,
            AllocatedQuantity = allocatedQuantity,
            PendingPutAwayQuantity = pendingPutAway,
            PoInvoiceCount = poInvoiceCount,
            PendingPoInvoiceCount = pendingPoCount,
            PendingStickerRows = pendingStickerRows,
            OutwardOrderCount = outwardCount,
            OpenOutwardOrderCount = openOutwardCount,
            PendingDispatchQuantity = pendingDispatch,
            TotalOutboundQuantity = totalOutbound,
            PickedOutboundQuantity = pickedOutbound,
            InventoryCoveragePercent = productCount > 0 ? (int)Math.Round((decimal)quantityCount / productCount * 100) : 0,
            LocationUtilizationPercent = locationCount > 0 ? (int)Math.Round((decimal)allottedLocationCount / locationCount * 100) : 0,
            DispatchProgressPercent = totalOutbound > 0 ? (int)Math.Round((decimal)pickedOutbound / totalOutbound * 100) : 0,
            TopStockPositions = topStockPositions,
            ActiveDispatchQueue = activeDispatchQueue,
            RecentStockMovements = recentMovements,
        };

        response.QuantityMix = new List<DashboardQuantityMixDto>
        {
            new() { Name = "Stock", Value = totalStock },
            new() { Name = "Allocated", Value = allocatedQuantity },
            new() { Name = "Put Away", Value = pendingPutAway },
            new() { Name = "Dispatch", Value = pendingDispatch },
        };

        return response;
    }

    private async Task<int> GetAllocatedQuantityAsync()
    {
        var rows = await _context.ProductAllottedLocations
            .AsNoTracking()
            .Select(x => x.LocationJson)
            .ToListAsync();

        return rows.Sum(locationJson => locationJson?.Values.Sum() ?? 0);
    }

    private Task<int> GetAllottedLocationCountAsync()
    {
        return _context.ProductAllottedLocations.AsNoTracking().CountAsync();
    }
}
