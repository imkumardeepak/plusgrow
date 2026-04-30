namespace PlusgrowWms.Api.DTOs;

public class OutwardOrderDto
{
    public int Id { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public DateTime OrderDate { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public int ProductId { get; set; }
    public string SkuCode { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public int PickedQuantity { get; set; }
    public int PendingQuantity { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? CartonId { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? DispatchedAt { get; set; }
}

public class OutwardOrderFilterDto
{
    public string? Search { get; set; }
    public string? Status { get; set; }
}

public class CreateOutwardOrderDto
{
    public DateTime OrderDate { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public int ProductId { get; set; }
    public int Quantity { get; set; }
    public string? Notes { get; set; }
}

public class UpdateOutwardPickingDto
{
    public int Quantity { get; set; } = 1;
    public string? SkuCode { get; set; }
    public string? LocationCode { get; set; }
}

public class DispatchOutwardOrderDto
{
    public string? CartonId { get; set; }
}
