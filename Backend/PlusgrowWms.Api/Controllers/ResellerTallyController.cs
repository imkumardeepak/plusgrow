using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PlusgrowWms.Api.Data;
using PlusgrowWms.Api.Models;
using PlusgrowWms.Api.Services;

namespace PlusgrowWms.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize] // Require user login
    public class ResellerTallyController : ControllerBase
    {
        private readonly ResellerApiClient _apiClient;
        private readonly TallyService _tallyService;
        private readonly PlusgrowDbContext _context;

        public ResellerTallyController(
            ResellerApiClient apiClient, 
            TallyService tallyService,
            PlusgrowDbContext context)
        {
            _apiClient = apiClient;
            _tallyService = tallyService;
            _context = context;
        }

        [HttpGet("pending")]
        public async Task<IActionResult> GetPendingOrders()
        {
            try
            {
                var pendingOrders = await _apiClient.GetPendingOrdersAsync();
                
                // For manual UI sync, we might want to know if it's already synced in DB
                var orderNos = pendingOrders.Select(o => o.OrderNo).ToList();
                var existingSyncs = await _context.ResellerSyncedOrders
                    .Where(o => orderNos.Contains(o.OrderNo))
                    .ToDictionaryAsync(o => o.OrderNo, o => o.Status);

                var response = pendingOrders.Select(o => new
                {
                    o.OrderNo,
                    o.OrderDate,
                    CustomerName = o.BillingAddress?.Name ?? "Cash",
                    o.CompositeShippingCharges,
                    TotalItems = o.Items.Count,
                    SyncStatus = existingSyncs.ContainsKey(o.OrderNo) ? existingSyncs[o.OrderNo] : "Pending"
                });

                return Ok(new { success = true, data = response });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost("sync/{orderNo}")]
        public async Task<IActionResult> SyncOrder(long orderNo)
        {
            try
            {
                // Fetch all pending to find the specific order
                // (In a real app, you might have an endpoint to fetch a single order, but we only have GetPendingOrders)
                var pendingOrders = await _apiClient.GetPendingOrdersAsync();
                var targetOrder = pendingOrders.FirstOrDefault(o => o.OrderNo == orderNo);

                if (targetOrder == null)
                {
                    return NotFound(new { success = false, message = "Order not found in pending list." });
                }

                string tallyResponse = string.Empty;
                var existing = await _context.ResellerSyncedOrders.FirstOrDefaultAsync(o => o.OrderNo == orderNo);

                try
                {
                    // Post to Tally
                    tallyResponse = await _tallyService.PostSalesOrderAsync(targetOrder);

                    if (existing == null)
                    {
                        existing = new ResellerSyncedOrder
                        {
                            OrderNo = targetOrder.OrderNo,
                            OrderDate = targetOrder.OrderDate,
                            CustomerName = targetOrder.BillingAddress?.Name ?? "Unknown"
                        };
                        _context.ResellerSyncedOrders.Add(existing);
                    }

                    existing.SyncedAt = DateTime.UtcNow;
                    existing.Status = "Success";
                    existing.ErrorMessage = null;
                }
                catch (Exception syncEx)
                {
                    if (existing == null)
                    {
                        existing = new ResellerSyncedOrder
                        {
                            OrderNo = targetOrder.OrderNo,
                            OrderDate = targetOrder.OrderDate,
                            CustomerName = targetOrder.BillingAddress?.Name ?? "Unknown"
                        };
                        _context.ResellerSyncedOrders.Add(existing);
                    }

                    existing.SyncedAt = DateTime.UtcNow;
                    existing.Status = "Failed";
                    existing.ErrorMessage = syncEx.Message;

                    await _context.SaveChangesAsync();

                    return StatusCode(500, new { success = false, message = syncEx.Message, tallyResponse = syncEx.Message });
                }

                await _context.SaveChangesAsync();

                return Ok(new { success = true, message = "Successfully synced to Tally", tallyResponse });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }
    }
}
