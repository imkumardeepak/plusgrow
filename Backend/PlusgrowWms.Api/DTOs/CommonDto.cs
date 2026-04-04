namespace PlusgrowWms.Api.DTOs;

public class ImporterDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Address { get; set; }
    public string? Cin { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateImporterDto
{
    public string Name { get; set; } = string.Empty;
    public string? Address { get; set; }
    public string? Cin { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
}

public class ManufacturerDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Country { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateManufacturerDto
{
    public string Name { get; set; } = string.Empty;
    public string? Country { get; set; }
}

public class CommodityDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
}

public class CreateCommodityDto
{
    public string Name { get; set; } = string.Empty;
}
