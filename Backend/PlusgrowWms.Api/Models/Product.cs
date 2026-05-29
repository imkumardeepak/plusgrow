using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace PlusgrowWms.Api.Models;

[Table("products")]
public class Product
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Required]
    [MaxLength(255)]
    [Column("name")]
    public string Name { get; set; } = string.Empty;

    [MaxLength(100)]
    [Column("sku")]
    public string? Sku { get; set; }

    [MaxLength(100)]
    [Column("alias")]
    [JsonPropertyName("Alias")]
    public string? Alias { get; set; }

    [Column("commodity_id")]
    public int? CommodityId { get; set; }

    [ForeignKey(nameof(CommodityId))]
    public Commodity? Commodity { get; set; }

    [MaxLength(100)]
    [Column("country_of_origin")]
    [JsonPropertyName("CountryOfOrigin")]
    public string? CountryOfOrigin { get; set; }

    [MaxLength(50)]
    [Column("factor")]
    [JsonPropertyName("Factor")]
    public string? Factor { get; set; }

    [Column("net_quantity")]
    [JsonPropertyName("NetQuantity")]
    public string? NetQuantity
    {
        get => _netQuantity;
        set => _netQuantity = value?.Trim().ToLowerInvariant();
    }
    private string? _netQuantity;

    [MaxLength(20)]
    [Column("unit_type")]
    [JsonPropertyName("UnitType")]
    public string? UnitType
    {
        get => _unitType;
        set => _unitType = value?.Trim().ToLowerInvariant() ?? "pcs";
    }
    private string? _unitType;

    [Column("ussp")]
    [JsonPropertyName("Ussp")]
    public decimal? Ussp { get; set; }

    [Column("weight")]
    [JsonPropertyName("Weight")]
    public decimal? Weight { get; set; }

    [MaxLength(50)]
    [Column("ownership")]
    [JsonPropertyName("Ownership")]
    public string? Ownership { get; set; }

    [Column("mrp")]
    [JsonPropertyName("Mrp")]
    public decimal? Mrp { get; set; }

    [Column("best_before_months")]
    [JsonPropertyName("BestBeforeMonths")]
    public int BestBeforeMonths { get; set; } = 84;

    [Column("manufacturer_id")]
    public int? ManufacturerId { get; set; }

    [ForeignKey(nameof(ManufacturerId))]
    public Manufacturer? Manufacturer { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified);

    public void CalculateUssp()
    {
        if (Mrp.HasValue && Mrp.Value > 0 && !string.IsNullOrEmpty(Factor))
        {
            var match = System.Text.RegularExpressions.Regex.Match(Factor, @"\d+(\.\d+)?");
            if (match.Success && decimal.TryParse(match.Value, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out decimal factorValue) && factorValue > 0)
            {
                Ussp = Mrp.Value / factorValue;
                return;
            }
        }
        Ussp = 0;
    }
}
