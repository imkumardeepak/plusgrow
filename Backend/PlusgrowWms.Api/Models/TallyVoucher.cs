using TallyERPWebApi.Model;

namespace PlusgrowWms.Api.Models;

public class TallyVoucher
{
    public int Id { get; set; }

    /// <summary>Unique REMOTEID from Tally — used for upsert.</summary>
    public string RemoteId { get; set; } = string.Empty;

    public string VoucherType { get; set; } = string.Empty;

    /// <summary>Date string as returned by Tally (e.g. "20250613").</summary>
    public string VoucherDate { get; set; } = string.Empty;

    public string PartyName { get; set; } = string.Empty;
    public string AccountType { get; set; } = string.Empty;
    public string OverallAmount { get; set; } = string.Empty;

    /// <summary>Stored as jsonb in PostgreSQL. EF Core + Npgsql handle serialization.</summary>
    public List<ItemDetails> Items { get; set; } = [];

    public DateTime SyncedAt { get; set; }
    public DateTime LastUpdatedAt { get; set; }
}
