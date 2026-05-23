namespace PlusgrowWms.Api.DTOs;

public class PackingCartonDto
{
    public int Id { get; set; }
    public int OutwardOrderId { get; set; }
    public string CartonNumber { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class CreatePackingCartonDto
{
    public int OutwardOrderId { get; set; }
}

public class PackItemDto
{
    public string? SkuCode { get; set; }
}

public class UpdateCartonStatusDto
{
    public string Status { get; set; } = string.Empty;
}
