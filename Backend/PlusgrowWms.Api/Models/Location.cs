using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PlusgrowWms.Api.Models;

[Table("locations")]
public class Location
{
    public const string DefaultAisle = "0";
    public const string DefaultRack = "0";
    public const string DefaultShelf = "0";
    public const string DefaultLocationCode = "0-0-0";

    [Key]
    [Column("id")]
    public int Id { get; set; }
    
    [Required]
    [MaxLength(5)]
    [Column("aisle")]
    public string Aisle { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(5)]
    [Column("rack")]
    public string Rack { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(5)]
    [Column("shelf")]
    public string Shelf { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(20)]
    [Column("location_code")]
    public string LocationCode { get; set; } = string.Empty;
    
    [Column("bins", TypeName = "jsonb")]
    public List<string> Bins { get; set; } = new();
    
    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified);

    public static Location CreateDefault()
    {
        return new Location
        {
            Aisle = DefaultAisle,
            Rack = DefaultRack,
            Shelf = DefaultShelf,
            LocationCode = DefaultLocationCode,
            Bins = new List<string>(),
            CreatedAt = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified),
        };
    }
}
