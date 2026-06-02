namespace PlusgrowWms.Api.DTOs;

public class StickerPreviewRequest
{
    public int ProductId { get; set; }
    public int? ManufacturerId { get; set; }
    public int? ImporterId { get; set; }
    public string Size { get; set; } = "50x50"; // 25x25, 38x38, 50x50, 60x60, 75x75
    public string Type { get; set; } = "Combined"; // Combined, Separate, Manufacture
    public string MonthYear { get; set; } = string.Empty;
    public string BatchNumber { get; set; } = string.Empty;
    public string Note { get; set; } = string.Empty;
    public int Quantity { get; set; } = 1;
}

public class StickerTemplateDto
{
    public string Name { get; set; } = string.Empty;
    public string Size { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
}

public class PrintJobRequest
{
    public List<StickerPrintItem> Items { get; set; } = new();
    public string PrinterIp { get; set; } = "192.168.10.151";
}

public class StickerPrintItem
{
    public StickerPreviewRequest Config { get; set; } = new();
    public int Quantity { get; set; } = 1;
}
