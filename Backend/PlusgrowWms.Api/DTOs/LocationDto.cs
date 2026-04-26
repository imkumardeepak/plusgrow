namespace PlusgrowWms.Api.DTOs;

public class LocationDto
{
    public int Id { get; set; }
    public string Aisle { get; set; } = string.Empty;
    public string Rack { get; set; } = string.Empty;
    public string Shelf { get; set; } = string.Empty;
    public string LocationCode { get; set; } = string.Empty;
    public List<string> Bins { get; set; } = new();
    public DateTime CreatedAt { get; set; }
}

public class CreateLocationDto
{
    public string Aisle { get; set; } = string.Empty;
    public string Rack { get; set; } = string.Empty;
    public string Shelf { get; set; } = string.Empty;
    public string LocationCode { get; set; } = string.Empty;
    public List<string> Bins { get; set; } = new();
}

public class UpdateLocationDto
{
    public int Id { get; set; }
    public string Aisle { get; set; } = string.Empty;
    public string Rack { get; set; } = string.Empty;
    public string Shelf { get; set; } = string.Empty;
    public string LocationCode { get; set; } = string.Empty;
    public List<string> Bins { get; set; } = new();
}
