namespace PlusgrowWms.Api.DTOs;

public class SalesOrderDto
{
    public int Id { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public DateTime OrderDate { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public string? ReferenceNumber { get; set; }
    public string? CancelRemark { get; set; }
    public int ItemCount { get; set; }
    public int TotalQuantity { get; set; }
    public int TotalPickedQuantity { get; set; }
    public int PendingQuantity { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? DispatchedAt { get; set; }
    public List<OutwardOrderDto> Items { get; set; } = [];
}

public class CancelSalesOrderDto
{
    public string Remark { get; set; } = string.Empty;
}

public class UpdateSalesOrderDto
{
    public string? CustomerName { get; set; }
    public string? OrderDate { get; set; }  // yyyy-MM-dd
    public string? Notes { get; set; }
    public string? ReferenceNumber { get; set; }
}

public class SalesOrderFilterDto
{
    public string? Search { get; set; }
    public string? Status { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 25;
}
