using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PlusgrowWms.Api.Models;

[Table("product_allotted_locations")]
public class ProductAllottedLocation
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("product_id")]
    public int ProductId { get; set; }

    [ForeignKey(nameof(ProductId))]
    public Product? Product { get; set; }

    [Column("location_json", TypeName = "jsonb")]
    public Dictionary<string, int> LocationJson { get; set; } = new();

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.Now;
}
