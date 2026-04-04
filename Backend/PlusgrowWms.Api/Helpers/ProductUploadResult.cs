namespace PlusgrowWms.Api.Helpers;

public class ProductUploadResult
{
    public bool Success { get; set; }
    public int ImportedCount { get; set; }
    public List<string> Errors { get; set; } = new();
}
