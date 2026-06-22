using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PlusgrowWms.Api.Models;

[Table("sales_order_items")]
public class OutwardOrder
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("sales_order_id")]
    public int SalesOrderId { get; set; }

    [ForeignKey(nameof(SalesOrderId))]
    public SalesOrder? SalesOrder { get; set; }

    [Column("product_id")]
    public int ProductId { get; set; }

    [ForeignKey(nameof(ProductId))]
    public Product? Product { get; set; }

    [Column("quantity")]
    public int Quantity { get; set; }

    [Column("mrp")]
    public decimal? Mrp { get; set; }

    [Column("picked_quantity")]
    public int PickedQuantity { get; set; }

    [Column("status")]
    public string Status { get; set; } = "Open";

    [Column("picked_location_json", TypeName = "jsonb")]
    public Dictionary<string, int>? PickedLocationJson { get; set; }

    [Column("notes")]
    public string? Notes { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified);

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified);

    [Column("dispatched_at")]
    public DateTime? DispatchedAt { get; set; }

    [Column("picked_at")]
    public DateTime? PickedAt { get; set; }

    [Column("packed_at")]
    public DateTime? PackedAt { get; set; }
}
