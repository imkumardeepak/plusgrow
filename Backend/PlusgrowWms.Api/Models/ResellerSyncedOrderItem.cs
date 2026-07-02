using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace PlusgrowWms.Api.Models
{
    public class ResellerSyncedOrderItem
    {
        public int Id { get; set; }

        public int ResellerSyncedOrderId { get; set; }
        
        [ForeignKey(nameof(ResellerSyncedOrderId))]
        [JsonIgnore]
        public ResellerSyncedOrder? Order { get; set; }

        public string Sku { get; set; } = string.Empty;

        public int Quantity { get; set; }

        [Column(TypeName = "decimal(18, 2)")]
        public decimal Rate { get; set; }
    }
}
