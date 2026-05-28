namespace PlusgrowWms.Api.DTOs;

public class ProductStockMovementDto
{
    public int Id { get; set; }
    public int ProductId { get; set; }
    public string SkuCode { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public int QuantityChange { get; set; }
    public int QuantityBefore { get; set; }
    public int QuantityAfter { get; set; }
    public string Reason { get; set; } = string.Empty;
    public string MovementType { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public int? PerformedByUserId { get; set; }
    public string? PerformedByName { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateStockAdjustmentDto
{
    public int ProductId { get; set; }
    public string LocationCode { get; set; } = string.Empty;
    public int QuantityChange { get; set; }
    public string Reason { get; set; } = string.Empty;
    public string? Notes { get; set; }
}

public class StockAdjustmentResultDto
{
    public ProductQuantityDto Quantity { get; set; } = new();
    public ProductStockMovementDto Movement { get; set; } = new();
}

public class MoveProductStockDto
{
    public int ProductId { get; set; }
    public string SourceLocationCode { get; set; } = string.Empty;
    public string DestinationLocationCode { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public string? Reason { get; set; }
    public string? Notes { get; set; }
}

