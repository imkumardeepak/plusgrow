using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PlusgrowWms.Api.Models;

[Table("po_invoices")]
public class PoInvoice
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("invoice_date")]
    public DateTime InvoiceDate { get; set; }

    [Required]
    [MaxLength(255)]
    [Column("party_name")]
    public string PartyName { get; set; } = string.Empty;

    [Required]
    [MaxLength(20)]
    [Column("invoice_number")]
    public string InvoiceNumber { get; set; } = string.Empty;

    [Column("product_id")]
    public int ProductId { get; set; }

    [ForeignKey(nameof(ProductId))]
    public Product? Product { get; set; }

    [Column("billed_qty")]
    public int BilledQty { get; set; }

    [Column("printed")]
    public bool Printed { get; set; }

    [Column("remaining_allocation")]
    public int RemainingAllocation { get; set; }

    [Column("location_allotted")]
    public bool LocationAllotted { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified);
}
