namespace PlusgrowWms.Api.Helpers;

public class ProductUploadResult
{
    public bool Success { get; set; }
    public int ImportedCount { get; set; }
    public List<string> Errors { get; set; } = new();
    public List<SkippedRowInfo> SkippedRows { get; set; } = new();
}

public class SkippedRowInfo
{
    public int RowNumber { get; set; }
    public string? Sku { get; set; }
    public string? ProductName { get; set; }
    public string Reason { get; set; } = string.Empty;
}
