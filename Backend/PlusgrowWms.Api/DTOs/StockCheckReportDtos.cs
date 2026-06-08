namespace PlusgrowWms.Api.DTOs;

public class StockCheckReportDto
{
    public int Id { get; set; }
    public string CheckType { get; set; } = string.Empty;
    public string ReferenceName { get; set; } = string.Empty;
    public int TotalSystemQty { get; set; }
    public int TotalScannedQty { get; set; }
    public int TotalVariance { get; set; }
    public int ItemsChecked { get; set; }
    public int ItemsWithVariance { get; set; }
    public string ItemsJson { get; set; } = "[]";
    public string Status { get; set; } = "COMPLETED";
    public string? Notes { get; set; }
    public string? PerformedByName { get; set; }
    public int? PerformedByUserId { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateStockCheckReportDto
{
    public string CheckType { get; set; } = string.Empty;
    public string ReferenceName { get; set; } = string.Empty;
    public int TotalSystemQty { get; set; }
    public int TotalScannedQty { get; set; }
    public int TotalVariance { get; set; }
    public int ItemsChecked { get; set; }
    public int ItemsWithVariance { get; set; }
    public string ItemsJson { get; set; } = "[]";
    public string? Notes { get; set; }
}
