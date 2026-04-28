namespace PlusgrowWms.Api.Models;

public class StickerPrinterConfig
{
	public int Id { get; set; }
	public string StickerSize { get; set; } = string.Empty; // 50x50, 60x60, 75x75
	public string PrinterIp { get; set; } = string.Empty;
	public int PrinterPort { get; set; } = 9100;
	public bool IsActive { get; set; } = true;
	public DateTime CreatedAt { get; set; } = DateTime.Now;
	public DateTime? UpdatedAt { get; set; }
}
