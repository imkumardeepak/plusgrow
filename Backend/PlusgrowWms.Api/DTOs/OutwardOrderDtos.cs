namespace PlusgrowWms.Api.DTOs;

public class OutwardOrderDto
{
    public int Id { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public string? ReferenceNumber { get; set; }
    public int SalesOrderId { get; set; }
    public string SalesOrderStatus { get; set; } = string.Empty;
    public string? SalesOrderNotes { get; set; }
    public DateTime SalesOrderCreatedAt { get; set; }
    public DateTime SalesOrderUpdatedAt { get; set; }
    public DateTime? SalesOrderDispatchedAt { get; set; }
    public DateTime OrderDate { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public int ProductId { get; set; }
    public string SkuCode { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public string? Ownership { get; set; }
    public string? Alias { get; set; }
    public string? CartonQr { get; set; }
    public int? CartonPerItem { get; set; }
    public int Quantity { get; set; }
    public decimal? Mrp { get; set; }
    public int PickedQuantity { get; set; }
    public int PackedQuantity { get; set; }
    public int PendingQuantity { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? DispatchedAt { get; set; }
    public DateTime? PickedAt { get; set; }
    public DateTime? PackedAt { get; set; }
    public string? TrackingNumber { get; set; }
}

public class OutwardOrderFilterDto
{
    public string? Search { get; set; }
    public string? Status { get; set; }
    public string? FromDate { get; set; }
    public string? ToDate { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 25;
}

public class QuickSaleProductDto
{
    public int ProductId { get; set; }
    public string SkuCode { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public string? Alias { get; set; }
    public int TotalQuantity { get; set; }
    public int OrderCount { get; set; }
    public int CustomerCount { get; set; }
    public int CurrentQuantity { get; set; }
    public DateTime? LastSaleAt { get; set; }
}

public class CreateOutwardOrderDto
{
    public DateTime OrderDate { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public string? ReferenceNumber { get; set; }
    public int? ProductId { get; set; }
    public int? Quantity { get; set; }
    public string? Notes { get; set; }
    public List<CreateOutwardOrderItemDto>? Items { get; set; }
}

public class CreateOutwardOrderItemDto
{
    public int ProductId { get; set; }
    public int Quantity { get; set; }
    public decimal? Mrp { get; set; }
}

public class UpdateOutwardPickingDto
{
    public int Quantity { get; set; } = 1;
    public string? SkuCode { get; set; }
    public string? LocationCode { get; set; }
    public decimal? Mrp { get; set; }
    public string? ImportDate { get; set; }
    public bool MrpMismatchConfirmed { get; set; }
}

public class DirectOutwardPickDto
{
    public int ProductId { get; set; }
    public int Quantity { get; set; } = 1;
    public string? SkuCode { get; set; }
    public string LocationCode { get; set; } = string.Empty;
    public decimal? Mrp { get; set; }
    public string? ImportDate { get; set; }
    public string Remark { get; set; } = string.Empty;
    public string? CustomerName { get; set; }
}

public class BulkDirectOutwardPickItemDto
{
    public int ProductId { get; set; }
    public int Quantity { get; set; } = 1;
    public string? SkuCode { get; set; }
    public string LocationCode { get; set; } = string.Empty;
    public decimal? Mrp { get; set; }
    public string? ImportDate { get; set; }
}

public class BulkDirectOutwardPickDto
{
    public List<BulkDirectOutwardPickItemDto> Items { get; set; } = [];
    public string Remark { get; set; } = string.Empty;
    public string? CustomerName { get; set; }
}

public class DispatchOutwardOrderDto
{
    public string? TrackingNumber { get; set; }
}

public class UpdatePackingQuantityDto
{
    public int Quantity { get; set; } = 1;
}

public class DispatchSalesOrderResultDto
{
    public int SalesOrderId { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public int DispatchedItemCount { get; set; }
    public List<OutwardOrderDto> Items { get; set; } = [];
}

public class DispatchSalesOrderDto
{
    public string? TrackingNumber { get; set; }
}

public class ConsolidatedPickDto
{
    public List<int> SalesOrderIds { get; set; } = [];
    public int ProductId { get; set; }
    public int Quantity { get; set; } = 1;
    public string? SkuCode { get; set; }
    public string LocationCode { get; set; } = string.Empty;
    public decimal? Mrp { get; set; }
    public string? ImportDate { get; set; }
}

public class ConsolidatedPickAllocationDto
{
    public int OrderItemId { get; set; }
    public int SalesOrderId { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public string CustomerName { get; set; } = string.Empty;
    public int AllocatedQuantity { get; set; }
    public int PickedQuantity { get; set; }
    public int Quantity { get; set; }
    public int PendingQuantity { get; set; }
    public string Status { get; set; } = string.Empty;
}

public class ConsolidatedPickResultDto
{
    public int ProductId { get; set; }
    public string SkuCode { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public string LocationCode { get; set; } = string.Empty;
    public int RequestedQuantity { get; set; }
    public int PickedQuantity { get; set; }
    public List<ConsolidatedPickAllocationDto> Allocations { get; set; } = [];
    public List<OutwardOrderDto> UpdatedItems { get; set; } = [];
}

public class ConsolidatedShortPickDto
{
    public List<int> SalesOrderIds { get; set; } = [];
    public int ProductId { get; set; }
    public string Remark { get; set; } = string.Empty;
}

public class ConsolidatedShortPickResultDto
{
    public int ProductId { get; set; }
    public List<OutwardOrderDto> UpdatedItems { get; set; } = [];
}
