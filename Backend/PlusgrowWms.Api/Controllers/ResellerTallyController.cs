using System;
using System.Linq;
using System.Net;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PlusgrowWms.Api.Data;
using PlusgrowWms.Api.DTOs;
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
                    .Where(o => o.Status != "Success" && !o.IsHiddenFromTallySync)
                    .OrderByDescending(o => o.FetchedAt)
                    .ToListAsync();

                var productLookup = await GetProductLookupBySkuOrAliasAsync(
                    pendingOrders.SelectMany(o => o.Items).Select(i => i.Sku));
                
                var response = pendingOrders.Select(o => new
                {
                    o.OrderNo,
                    o.OrderDate,
                    CustomerName = o.CustomerName,
                    o.CompositeShippingCharges,
                    TotalItems = o.Items.Count,
                    SyncStatus = o.Status,
                    Items = o.Items.Select(i =>
                    {
                        productLookup.TryGetValue(NormalizeLookupKey(i.Sku), out var product);

                        return new
                        {
                            i.Sku,
                            i.Quantity,
                            i.Rate,
                            LineTotal = i.Quantity * i.Rate,
                            ProductName = product?.Name,
                            ProductSku = product?.Sku,
                            ProductAlias = product?.Alias,
                            UnitType = product?.UnitType,
                            Ownership = product?.Ownership,
                            Mrp = product?.Mrp,
                            ProductFound = product != null
                        };
                    }).ToList()
                });

                return Ok(new { success = true, data = response });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPatch("orders/{orderNo}/hide")]
        public async Task<IActionResult> HideOrder(string orderNo)
        {
            try
            {
                var normalizedOrderNo = NormalizeOrderNo(orderNo);

                if (string.IsNullOrWhiteSpace(normalizedOrderNo))
                {
                    return BadRequest(new { success = false, message = "Order number is required." });
                }

                var existing = await _context.ResellerSyncedOrders
                    .FirstOrDefaultAsync(o => o.OrderNo == normalizedOrderNo);

                if (existing == null)
                {
                    return NotFound(new { success = false, message = "Order not found in local database." });
                }

                existing.IsHiddenFromTallySync = true;
                await _context.SaveChangesAsync();

                return Ok(new { success = true, message = "Order hidden from Tally sync list" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost("sync/{orderNo}")]
        public async Task<IActionResult> SyncOrder(string orderNo)
        {
            try
            {
                var normalizedOrderNo = NormalizeOrderNo(orderNo);

                if (string.IsNullOrWhiteSpace(normalizedOrderNo))
                {
                    return BadRequest(new { success = false, message = "Order number is required." });
                }

                var existing = await _context.ResellerSyncedOrders
                    .Include(o => o.Items)
                    .FirstOrDefaultAsync(o => o.OrderNo == normalizedOrderNo);

                if (existing == null)
                {
                    return NotFound(new { success = false, message = "Order not found in local database." });
                }

                if (existing.Status == "Success")
                {
                    return Conflict(new { success = false, message = "Order already synced to Tally." });
                }

                if (existing.IsHiddenFromTallySync)
                {
                    return Conflict(new { success = false, message = "Order is hidden from the Tally sync list." });
                }

                if (existing.Items.Any(i => string.IsNullOrWhiteSpace(i.Sku)))
                {
                    return BadRequest(new { success = false, message = "Cannot push to Tally because one or more order items has no SKU." });
                }

                var productLookup = await GetProductLookupBySkuOrAliasAsync(existing.Items.Select(i => i.Sku));
                var missingSkus = existing.Items
                    .Select(i => i.Sku)
                    .Where(sku => !string.IsNullOrWhiteSpace(sku))
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .Where(sku => !productLookup.ContainsKey(NormalizeLookupKey(sku)))
                    .ToList();

                if (missingSkus.Count > 0)
                {
                    return BadRequest(new
                    {
                        success = false,
                        message = $"Product master not found for SKU(s): {string.Join(", ", missingSkus)}. Please add these products before pushing to Tally."
                    });
                }

                // Map local database entity back to ResellerPendingOrder DTO for TallyService
                var targetOrder = new ResellerPendingOrder
                {
                    OrderNo = existing.OrderNo,
                    OrderDate = existing.OrderDate,
                    VoucherType = existing.VoucherType,
                    CommonCostCentre = existing.CommonCostCentre,
                    CompositeShippingCharges = existing.CompositeShippingCharges,
                    BillingAddress = existing.BillingAddress != null ? new ResellerAddress
                    {
                        Name = existing.BillingAddress.Name,
                        Line1 = existing.BillingAddress.Line1,
                        Line2 = existing.BillingAddress.Line2,
                        City = existing.BillingAddress.City,
                        State = existing.BillingAddress.State,
                        Pincode = existing.BillingAddress.Pincode,
                        ContactNo = existing.BillingAddress.ContactNo
                    } : null,
                    ShippingAddress = existing.ShippingAddress != null ? new ResellerAddress
                    {
                        Name = existing.ShippingAddress.Name,
                        Line1 = existing.ShippingAddress.Line1,
                        Line2 = existing.ShippingAddress.Line2,
                        City = existing.ShippingAddress.City,
                        State = existing.ShippingAddress.State,
                        Pincode = existing.ShippingAddress.Pincode,
                        ContactNo = existing.ShippingAddress.ContactNo
                    } : null,
                    Items = existing.Items.Select(i =>
                    {
                        var product = productLookup[NormalizeLookupKey(i.Sku)];

                        return new ResellerOrderItem
                        {
                            Sku = i.Sku,
                            StockItemName = product.Name,
                            Unit = product.UnitType ?? string.Empty,
                            Quantity = i.Quantity,
                            Rate = i.Rate
                        };
                    }).ToList()
                };

                string tallyResponse = string.Empty;

                try
                {
                    // Post to Tally
                    tallyResponse = await _tallyService.PostSalesOrderAsync(targetOrder);

                    existing.SyncedAt = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified);
                    existing.Status = "Success";
                    existing.ErrorMessage = null;
                }
                catch (Exception syncEx)
                {
                    existing.SyncedAt = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified);
                    existing.Status = "Failed";
                    existing.ErrorMessage = syncEx.Message;

                    await _context.SaveChangesAsync();

                    return StatusCode(500, new
                    {
                        success = false,
                        message = BuildTallySyncFailureMessage(syncEx.Message),
                        tallyResponse = syncEx.Message
                    });
                }

                await _context.SaveChangesAsync();

                return Ok(new { success = true, message = "Successfully synced to Tally", tallyResponse });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        private async Task<Dictionary<string, ProductTallyMatch>> GetProductLookupBySkuOrAliasAsync(IEnumerable<string> skus)
        {
            var skuKeys = skus
                .Select(NormalizeLookupKey)
                .Where(key => !string.IsNullOrWhiteSpace(key))
                .ToHashSet(StringComparer.OrdinalIgnoreCase);

            if (skuKeys.Count == 0)
                return new Dictionary<string, ProductTallyMatch>(StringComparer.OrdinalIgnoreCase);

            var products = await _context.Products
                .AsNoTracking()
                .Where(product => product.Sku != null || product.Alias != null)
                .Select(product => new ProductTallyMatch(
                    product.Name,
                    product.Sku,
                    product.Alias,
                    product.UnitType,
                    product.Ownership,
                    product.Mrp))
                .ToListAsync();

            var lookup = new Dictionary<string, ProductTallyMatch>(StringComparer.OrdinalIgnoreCase);

            foreach (var product in products)
            {
                AddProductLookup(lookup, skuKeys, product.Sku, product);
            }

            foreach (var product in products)
            {
                AddProductLookup(lookup, skuKeys, product.Alias, product);
            }

            return lookup;
        }

        private static void AddProductLookup(
            Dictionary<string, ProductTallyMatch> lookup,
            HashSet<string> skuKeys,
            string? productKey,
            ProductTallyMatch product)
        {
            var normalizedKey = NormalizeLookupKey(productKey);

            if (string.IsNullOrWhiteSpace(normalizedKey) || !skuKeys.Contains(normalizedKey) || lookup.ContainsKey(normalizedKey))
                return;

            lookup[normalizedKey] = product;
        }

        private static string NormalizeLookupKey(string? value)
        {
            return string.IsNullOrWhiteSpace(value) ? string.Empty : value.Trim().ToUpperInvariant();
        }

        private static string NormalizeOrderNo(string? value)
        {
            return string.IsNullOrWhiteSpace(value) ? string.Empty : value.Trim().ToUpperInvariant();
        }

        private static string BuildTallySyncFailureMessage(string message)
        {
            var decodedMessage = WebUtility.HtmlDecode(message);

            if (!decodedMessage.Contains("SVCurrentCompany", StringComparison.OrdinalIgnoreCase))
                return message;

            var companyName = ExtractConfiguredCompanyName(decodedMessage);
            var companyLabel = string.IsNullOrWhiteSpace(companyName)
                ? "the configured Tally company"
                : $"configured Tally company '{companyName}'";

            return $"Tally could not switch to {companyLabel}. Open/select the exact company in Tally or update TallySettings:CurrentCompany.";
        }

        private static string? ExtractConfiguredCompanyName(string message)
        {
            const string marker = "SVCurrentCompany' to '";
            var markerIndex = message.IndexOf(marker, StringComparison.OrdinalIgnoreCase);

            if (markerIndex < 0)
                return null;

            var startIndex = markerIndex + marker.Length;
            var endIndex = message.IndexOf("'", startIndex, StringComparison.Ordinal);

            return endIndex > startIndex
                ? message[startIndex..endIndex]
                : null;
        }

        private sealed record ProductTallyMatch(string Name, string? Sku, string? Alias, string? UnitType, string? Ownership, decimal? Mrp);
    }
}
