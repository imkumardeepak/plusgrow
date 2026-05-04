namespace PlusgrowWms.Api.DTOs;

public class DashboardSummaryDto
{
    public int ProductCount { get; set; }
    public int CommodityCount { get; set; }
    public int ManufacturerCount { get; set; }
    public int ImporterCount { get; set; }
    public int BinCount { get; set; }
    public int LocationCount { get; set; }
    public int ProductQuantityCount { get; set; }
    public int SkusWithStock { get; set; }
    public int ZeroStockProducts { get; set; }
    public int TotalStockQuantity { get; set; }
    public int AllocatedQuantity { get; set; }
    public int PendingPutAwayQuantity { get; set; }
    public int PoInvoiceCount { get; set; }
    public int PendingPoInvoiceCount { get; set; }
    public int PendingStickerRows { get; set; }
    public int OutwardOrderCount { get; set; }
    public int OpenOutwardOrderCount { get; set; }
    public int PendingDispatchQuantity { get; set; }
    public int TotalOutboundQuantity { get; set; }
    public int PickedOutboundQuantity { get; set; }
    public int InventoryCoveragePercent { get; set; }
    public int LocationUtilizationPercent { get; set; }
    public int DispatchProgressPercent { get; set; }
    public List<DashboardQuantityMixDto> QuantityMix { get; set; } = new();
    public List<DashboardStockPositionDto> TopStockPositions { get; set; } = new();
    public List<DashboardDispatchQueueDto> ActiveDispatchQueue { get; set; } = new();
    public List<DashboardMovementDto> RecentStockMovements { get; set; } = new();
}

public class DashboardQuantityMixDto
{
    public string Name { get; set; } = string.Empty;
    public int Value { get; set; }
}

public class DashboardStockPositionDto
{
    public int Id { get; set; }
    public string SkuCode { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public int CurrentQuantity { get; set; }
}

public class DashboardDispatchQueueDto
{
    public int Id { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public string CustomerName { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public int PendingQuantity { get; set; }
    public string Status { get; set; } = string.Empty;
}

public class DashboardMovementDto
{
    public int Id { get; set; }
    public string SkuCode { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public int QuantityChange { get; set; }
    public int QuantityAfter { get; set; }
    public string Reason { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}
