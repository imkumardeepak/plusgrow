using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PlusgrowWms.Api.Models;

[Table("product_stock_movements")]
public class ProductStockMovement
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("product_id")]
    public int ProductId { get; set; }

    [ForeignKey(nameof(ProductId))]
    public Product? Product { get; set; }

    [Column("quantity_change")]
    public int QuantityChange { get; set; }

    [Column("quantity_before")]
    public int QuantityBefore { get; set; }

    [Column("quantity_after")]
    public int QuantityAfter { get; set; }

    [Column("reason")]
    public string Reason { get; set; } = string.Empty;

    [Column("movement_type")]
    public string MovementType { get; set; } = string.Empty;

    [Column("notes")]
    public string? Notes { get; set; }

    [Column("performed_by_user_id")]
    public int? PerformedByUserId { get; set; }

    [ForeignKey(nameof(PerformedByUserId))]
    public User? PerformedByUser { get; set; }

    [Column("performed_by_name")]
    public string? PerformedByName { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified);
}
