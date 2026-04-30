namespace PlusgrowWms.Api.DTOs;

public class RealtimeNotificationDto
{
    public string Type { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string Severity { get; set; } = "info";
    public DateTime CreatedAt { get; set; } = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified);
    public Dictionary<string, object?> Data { get; set; } = new();
}
