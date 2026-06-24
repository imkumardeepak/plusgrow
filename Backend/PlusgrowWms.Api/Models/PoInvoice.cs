using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PlusgrowWms.Api.Models;

[Table("po_invoices")]
public class PoInvoice
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("po_invoice_header_id")]
    public int PoInvoiceHeaderId { get; set; }

    [ForeignKey(nameof(PoInvoiceHeaderId))]
    public PoInvoiceHeader? Header { get; set; }

    [Column("product_id")]
    public int ProductId { get; set; }

    [ForeignKey(nameof(ProductId))]
    public Product? Product { get; set; }

    [Column("billed_qty")]
    public int BilledQty { get; set; }

    [Column("verified_quantity")]
    public int? VerifiedQuantity { get; set; }

    [Column("mrp")]
    public decimal? Mrp { get; set; }

    [Column("printed")]
    public bool Printed { get; set; }

    [Column("remaining_allocation")]
    public int RemainingAllocation { get; set; }

    [Column("location_allotted")]
    public bool LocationAllotted { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified);
}
