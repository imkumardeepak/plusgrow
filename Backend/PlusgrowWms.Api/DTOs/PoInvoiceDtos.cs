namespace PlusgrowWms.Api.DTOs;

public class PoInvoiceDto
{
    public int Id { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;
    public DateTime InvoiceDate { get; set; }
    public string PartyName { get; set; } = string.Empty;
    public int ProductId { get; set; }
    public string SkuCode { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public decimal? Mrp { get; set; }
    public int BilledQty { get; set; }
    public bool Printed { get; set; }
    public int RemainingAllocation { get; set; }
    public bool LocationAllotted { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreatePoInvoiceDto
{
    public DateTime InvoiceDate { get; set; }
    public string PartyName { get; set; } = string.Empty;
    public int ProductId { get; set; }
    public int BilledQty { get; set; }
}

public class UpdatePoInvoiceDto : CreatePoInvoiceDto
{
    public int Id { get; set; }
}

public class MarkPoInvoicesPrintedRequestDto
{
    public List<int> InvoiceIds { get; set; } = new();
}

public class MarkPoInvoicesPrintedResultDto
{
    public int UpdatedCount { get; set; }
}

public class PoInvoiceFilterDto
{
    public string? Search { get; set; }
    public string? Status { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
}

public class ProductQuantityDto
{
    public int Id { get; set; }
    public int ProductId { get; set; }
    public string SkuCode { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public int CurrentQuantity { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class CreateProductQuantityDto
{
    public int ProductId { get; set; }
    public int CurrentQuantity { get; set; }
}

public class UpdateProductQuantityDto : CreateProductQuantityDto
{
    public int Id { get; set; }
}

public class ProductAllottedLocationDto
{
    public int Id { get; set; }
    public int ProductId { get; set; }
    public string SkuCode { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public Dictionary<string, int> LocationJson { get; set; } = new();
    public DateTime UpdatedAt { get; set; }
}

public class CreateProductAllottedLocationDto
{
    public int ProductId { get; set; }
    public Dictionary<string, int> LocationJson { get; set; } = new();
}

public class UpdateProductAllottedLocationDto : CreateProductAllottedLocationDto
{
    public int Id { get; set; }
}

public class PutAwayScanAssignmentRequestDto
{
    public string ProductScanCode { get; set; } = string.Empty;
    public string LocationOrBinScanCode { get; set; } = string.Empty;
    public int Quantity { get; set; }
}

public class PutAwayScanAssignmentResultDto
{
    public int ProductId { get; set; }
    public string SkuCode { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public string ScannedLocationOrBinCode { get; set; } = string.Empty;
    public string ResolvedLocationCode { get; set; } = string.Empty;
    public int AssignedQuantity { get; set; }
    public int CurrentQuantity { get; set; }
    public int TotalAllocatedQuantity { get; set; }
    public int RemainingUnassignedQuantity { get; set; }
}
