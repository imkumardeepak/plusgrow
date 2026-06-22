using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PlusgrowWms.Api.Models;

[Table("sales_orders")]
public class SalesOrder
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("order_number")]
    public string OrderNumber { get; set; } = string.Empty;

    [Column("order_date")]
    public DateTime OrderDate { get; set; }

    [Column("customer_name")]
    public string CustomerName { get; set; } = string.Empty;

    [Column("status")]
    public string Status { get; set; } = "Open";

    [Column("notes")]
    public string? Notes { get; set; }

    [Column("reference_number")]
    public string? ReferenceNumber { get; set; }

    [Column("cancel_remark")]
    public string? CancelRemark { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified);

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified);

    [Column("dispatched_at")]
    public DateTime? DispatchedAt { get; set; }

    [Column("tracking_number")]
    public string? TrackingNumber { get; set; }

    public ICollection<OutwardOrder> Items { get; set; } = [];
}
