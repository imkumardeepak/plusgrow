using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace PlusgrowWms.Api.Models
{
    [Owned]
    public class ResellerAddressDb
    {
        public string Name { get; set; } = string.Empty;
        public string Line1 { get; set; } = string.Empty;
        public string Line2 { get; set; } = string.Empty;
        public string City { get; set; } = string.Empty;
        public string State { get; set; } = string.Empty;
        public long Pincode { get; set; }
        public long ContactNo { get; set; }
    }

    public class ResellerSyncedOrder
    {
        public int Id { get; set; }
        
        // The original order number from the Reseller API
        public string OrderNo { get; set; } = string.Empty;
        
        public string OrderDate { get; set; } = string.Empty;
        
        public string CustomerName { get; set; } = string.Empty;

        // --- New API fields ---
        public string VoucherType { get; set; } = string.Empty;
        public string CommonCostCentre { get; set; } = string.Empty;
        
        public ResellerAddressDb? BillingAddress { get; set; }
        public ResellerAddressDb? ShippingAddress { get; set; }
        
        [Column(TypeName = "decimal(18, 2)")]
        public decimal CompositeShippingCharges { get; set; }
        
        public List<ResellerSyncedOrderItem> Items { get; set; } = new List<ResellerSyncedOrderItem>();
        // ----------------------

        // Tracking fields
        public DateTime FetchedAt { get; set; } = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified);

        public DateTime? SyncedAt { get; set; }

        public bool IsHiddenFromTallySync { get; set; } = false;
        
        public string Status { get; set; } = "Pending"; // "Pending", "Success", "Failed"
        
        public string? ErrorMessage { get; set; }
    }
}
