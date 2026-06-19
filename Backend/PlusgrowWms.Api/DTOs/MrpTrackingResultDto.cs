namespace PlusgrowWms.Api.DTOs;

public class MrpTrackingResultDto
{
    public int Id { get; set; }
    public int PoInvoiceId { get; set; }
    public int ProductId { get; set; }
    public string? ProductName { get; set; }
    public string? Sku { get; set; }
    public string? Alias { get; set; }
    public string? InvoiceNumber { get; set; }
    public DateTime? InvoiceDate { get; set; }
    public decimal? Mrp { get; set; }
    public string? LocationCode { get; set; }
    public int Quantity { get; set; }
}

public class MrpWiseStockSummaryDto
{
    public int ProductId { get; set; }
    public string? ProductName { get; set; }
    public string? Sku { get; set; }
    public string? Alias { get; set; }
    public string? InvoiceNumber { get; set; }
    public DateTime? InvoiceDate { get; set; }
    public string? PartyName { get; set; }
    public decimal? Mrp { get; set; }
    public int BilledQty { get; set; }
    public int Quantity { get; set; }
}

public class MrpChangeDto
{
    public int ProductId { get; set; }
    public string? ProductName { get; set; }
    public string? Sku { get; set; }
    public string? Alias { get; set; }
    public decimal? BaseMrp { get; set; }
    public decimal? InwardMrp { get; set; }
    public decimal? Difference { get; set; }
    public decimal? ChangePercent { get; set; }
    public string? InvoiceNumber { get; set; }
    public DateTime? InvoiceDate { get; set; }
    public string? PartyName { get; set; }
    public int BilledQty { get; set; }
}
