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
                var pendingOrders = await _context.ResellerSyncedOrders
                    .Include(o => o.Items)
                    .Where(o => o.Status != "Success")
                    .OrderByDescending(o => o.FetchedAt)
                    .ToListAsync();
                
                var response = pendingOrders.Select(o => new
                {
                    o.OrderNo,
                    o.OrderDate,
                    CustomerName = o.CustomerName,
                    o.CompositeShippingCharges,
                    TotalItems = o.Items.Count,
                    SyncStatus = o.Status
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
                var existing = await _context.ResellerSyncedOrders
                    .Include(o => o.Items)
                    .FirstOrDefaultAsync(o => o.OrderNo == orderNo);

                if (existing == null)
                {
                    return NotFound(new { success = false, message = "Order not found in local database." });
                }

                if (existing.Status == "Success")
                {
                    return Conflict(new { success = false, message = "Order already synced to Tally." });
                }

                // Map local database entity back to ResellerPendingOrder DTO for TallyService
                var targetOrder = new PlusgrowWms.Api.DTOs.ResellerPendingOrder
                {
                    OrderNo = existing.OrderNo,
                    OrderDate = existing.OrderDate,
                    VoucherType = existing.VoucherType,
                    CommonCostCentre = existing.CommonCostCentre,
                    CompositeShippingCharges = existing.CompositeShippingCharges,
                    BillingAddress = existing.BillingAddress != null ? new PlusgrowWms.Api.DTOs.ResellerAddress
                    {
                        Name = existing.BillingAddress.Name,
                        Line1 = existing.BillingAddress.Line1,
                        Line2 = existing.BillingAddress.Line2,
                        City = existing.BillingAddress.City,
                        State = existing.BillingAddress.State,
                        Pincode = existing.BillingAddress.Pincode,
                        ContactNo = existing.BillingAddress.ContactNo
                    } : null,
                    ShippingAddress = existing.ShippingAddress != null ? new PlusgrowWms.Api.DTOs.ResellerAddress
                    {
                        Name = existing.ShippingAddress.Name,
                        Line1 = existing.ShippingAddress.Line1,
                        Line2 = existing.ShippingAddress.Line2,
                        City = existing.ShippingAddress.City,
                        State = existing.ShippingAddress.State,
                        Pincode = existing.ShippingAddress.Pincode,
                        ContactNo = existing.ShippingAddress.ContactNo
                    } : null,
                    Items = existing.Items.Select(i => new PlusgrowWms.Api.DTOs.ResellerOrderItem
                    {
                        Sku = i.Sku,
                        Quantity = i.Quantity,
                        Rate = i.Rate
                    }).ToList()
                };

                string tallyResponse = string.Empty;

                try
                {
                    // Post to Tally
                    tallyResponse = await _tallyService.PostSalesOrderAsync(targetOrder);

                    existing.SyncedAt = DateTime.UtcNow;
                    existing.Status = "Success";
                    existing.ErrorMessage = null;
                }
                catch (Exception syncEx)
                {
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
