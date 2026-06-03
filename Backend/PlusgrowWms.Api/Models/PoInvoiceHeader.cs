using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PlusgrowWms.Api.Models;

[Table("po_invoice_headers")]
public class PoInvoiceHeader
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Required]
    [MaxLength(50)]
    [Column("invoice_number")]
    public string InvoiceNumber { get; set; } = string.Empty;

    [Column("invoice_date")]
    public DateTime InvoiceDate { get; set; }

    [Required]
    [MaxLength(255)]
    [Column("party_name")]
    public string PartyName { get; set; } = string.Empty;

    [Column("status")]
    public string Status { get; set; } = "Active";

    [Column("cancel_remark")]
    public string? CancelRemark { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified);

    public ICollection<PoInvoice> Items { get; set; } = new List<PoInvoice>();
}
