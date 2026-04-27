using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PlusgrowWms.Api.Models;

[Table("locations")]
public class Location
{
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
}
