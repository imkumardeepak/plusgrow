namespace PlusgrowWms.Api.DTOs;

public class ProductDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Sku { get; set; }
    public string? Alias { get; set; }
    public int? CommodityId { get; set; }
    public string? CommodityName { get; set; }
    public string? CountryOfOrigin { get; set; }
    public string? Factor { get; set; }
    public string? NetQuantity { get; set; }
    public string? UnitType { get; set; }
    public decimal? Ussp { get; set; }
    public decimal? Mrp { get; set; }
    public int BestBeforeMonths { get; set; }
    public int? ManufacturerId { get; set; }
    public string? ManufacturerName { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateProductDto
{
    public string Name { get; set; } = string.Empty;
    public string? Sku { get; set; }
    public string? Alias { get; set; }
    public int? CommodityId { get; set; }
    public string? CountryOfOrigin { get; set; }
    public string? Factor { get; set; }
    public string? NetQuantity { get; set; }
    public string? UnitType { get; set; }
    public decimal? Ussp { get; set; }
    public decimal? Mrp { get; set; }
    public int BestBeforeMonths { get; set; } = 120;
    public int? ManufacturerId { get; set; }
}

public class UpdateProductDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Sku { get; set; }
    public string? Alias { get; set; }
    public int? CommodityId { get; set; }
    public string? CountryOfOrigin { get; set; }
    public string? Factor { get; set; }
    public string? NetQuantity { get; set; }
    public string? UnitType { get; set; }
    public decimal? Ussp { get; set; }
    public decimal? Mrp { get; set; }
    public int BestBeforeMonths { get; set; }
    public int? ManufacturerId { get; set; }
}
