using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PlusgrowWms.Api.Models;

[Table("packing_cartons")]
public class PackingCarton
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("outward_order_id")]
    public int OutwardOrderId { get; set; }

    [ForeignKey(nameof(OutwardOrderId))]
    public OutwardOrder? OutwardOrder { get; set; }

    [Column("carton_number")]
    public string CartonNumber { get; set; } = string.Empty;

    [Column("quantity")]
    public int Quantity { get; set; }

    [Column("status")]
    public string Status { get; set; } = "Open"; // Open, Ready, Dispatched

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified);

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified);
}
