using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PlusgrowWms.Api.Models;

[Table("tally_sync_skipped_orders")]
public class TallySyncSkippedOrder
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("tally_reference")]
    [MaxLength(100)]
    public string TallyReference { get; set; } = string.Empty;

    [Column("party_name")]
    [MaxLength(255)]
    public string? PartyName { get; set; }

    [Column("order_date")]
    [MaxLength(50)]
    public string? OrderDate { get; set; }

    [Column("skip_reason")]
    [MaxLength(50)]
    public string SkipReason { get; set; } = string.Empty;

    [Column("details")]
    public string? Details { get; set; }

    // JSON array of unmatched product names
    [Column("unmatched_products", TypeName = "jsonb")]
    public string? UnmatchedProducts { get; set; }

    // Full raw voucher items from Tally
    [Column("raw_items_json", TypeName = "jsonb")]
    public string? RawItemsJson { get; set; }

    [Column("is_resolved")]
    public bool IsResolved { get; set; }

    [Column("synced_at")]
    public DateTime SyncedAt { get; set; } = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified);

    [Column("resolved_at")]
    public DateTime? ResolvedAt { get; set; }
}
