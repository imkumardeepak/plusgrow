using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PlusgrowWms.Api.Models;

[Table("stock_check_reports")]
public class StockCheckReport
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("check_type")]
    [MaxLength(50)]
    public string CheckType { get; set; } = string.Empty;

    [Column("reference_name")]
    [MaxLength(255)]
    public string ReferenceName { get; set; } = string.Empty;

    [Column("total_system_qty")]
    public int TotalSystemQty { get; set; }

    [Column("total_scanned_qty")]
    public int TotalScannedQty { get; set; }

    [Column("total_variance")]
    public int TotalVariance { get; set; }

    [Column("items_checked")]
    public int ItemsChecked { get; set; }

    [Column("items_with_variance")]
    public int ItemsWithVariance { get; set; }

    [Column("items_json", TypeName = "jsonb")]
    public string ItemsJson { get; set; } = "[]";

    [Column("status")]
    [MaxLength(20)]
    public string Status { get; set; } = "COMPLETED";

    [Column("notes")]
    public string? Notes { get; set; }

    [Column("performed_by_name")]
    [MaxLength(255)]
    public string? PerformedByName { get; set; }

    [Column("performed_by_user_id")]
    public int? PerformedByUserId { get; set; }

    [ForeignKey(nameof(PerformedByUserId))]
    public User? PerformedByUser { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified);
}
