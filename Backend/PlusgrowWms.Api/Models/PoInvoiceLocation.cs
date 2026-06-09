using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PlusgrowWms.Api.Models;

[Table("po_invoice_locations")]
public class PoInvoiceLocation
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("po_invoice_id")]
    public int PoInvoiceId { get; set; }

    [ForeignKey(nameof(PoInvoiceId))]
    public PoInvoice? PoInvoice { get; set; }

    [Column("location_code")]
    [StringLength(50)]
    public string LocationCode { get; set; } = null!;

    [Column("quantity")]
    public int Quantity { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified);
}
