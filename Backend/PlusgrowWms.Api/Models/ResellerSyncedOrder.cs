using System;

namespace PlusgrowWms.Api.Models
{
    public class ResellerSyncedOrder
    {
        public int Id { get; set; }
        
        // The original order number from the Reseller API
        public long OrderNo { get; set; }
        
        public string OrderDate { get; set; } = string.Empty;
        
        public string CustomerName { get; set; } = string.Empty;
        
        public DateTime SyncedAt { get; set; } = DateTime.UtcNow;
        
        public string Status { get; set; } = "Success"; // Or "Failed"
        
        public string? ErrorMessage { get; set; }
    }
}
