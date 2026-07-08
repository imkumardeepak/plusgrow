using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using PlusgrowWms.Api.Data;
using PlusgrowWms.Api.DTOs;
using PlusgrowWms.Api.Models;

namespace PlusgrowWms.Api.Services
{
    public class ResellerTallySyncJob
    {
        private readonly ResellerApiClient _apiClient;
        private readonly TallyService _tallyService;
        private readonly PlusgrowDbContext _context;
        private readonly ILogger<ResellerTallySyncJob> _logger;

        public ResellerTallySyncJob(
            ResellerApiClient apiClient, 
            TallyService tallyService, 
            PlusgrowDbContext context, 
            ILogger<ResellerTallySyncJob> logger)
        {
            _apiClient = apiClient;
            _tallyService = tallyService;
            _context = context;
            _logger = logger;
        }

        public async Task SyncOrdersAsync()
        {
            _logger.LogInformation("Starting Reseller API to Tally synchronization job...");

            try
            {
                var pendingOrders = await _apiClient.GetPendingOrdersAsync();

                if (pendingOrders == null || !pendingOrders.Any())
                {
                    _logger.LogInformation("No pending orders found to sync.");
                    return;
                }

                _logger.LogInformation($"Found {pendingOrders.Count} pending orders from Reseller API.");

                foreach (var order in pendingOrders)
                {
                    try
                    {
                        var orderNo = NormalizeOrderNo(order.OrderNo);

                        if (string.IsNullOrWhiteSpace(orderNo))
                        {
                            _logger.LogWarning("Reseller API returned an order without a valid order number. Skipping.");
                            continue;
                        }

                        // Check if we already synced this order successfully
                        var existing = await _context.ResellerSyncedOrders
                            .FirstOrDefaultAsync(o => o.OrderNo == orderNo);

                        if (existing != null && existing.IsHiddenFromTallySync)
                        {
                            _logger.LogInformation($"Order {orderNo} is hidden from Tally sync. Skipping.");
                            continue;
                        }

                        if (existing != null && existing.Status == "Success")
                        {
                            _logger.LogInformation($"Order {orderNo} already synced to Tally. Skipping.");
                            continue;
                        }

                        order.OrderNo = orderNo;
                        await EnrichOrderItemsFromProductMasterAsync(order);

                        // Post to Tally
                        _logger.LogInformation($"Posting order {orderNo} to Tally as Sales Order...");
                        string tallyResponse = await _tallyService.PostSalesOrderAsync(order);
                        _logger.LogInformation($"Successfully posted order {orderNo} to Tally.");

                        // Record success
                        if (existing == null)
                        {
                            existing = new ResellerSyncedOrder
                            {
                                OrderNo = orderNo,
                                OrderDate = order.OrderDate,
                                CustomerName = order.BillingAddress?.Name ?? "Unknown"
                            };
                            _context.ResellerSyncedOrders.Add(existing);
                        }

                        existing.SyncedAt = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified);
                        existing.Status = "Success";
                        existing.ErrorMessage = null;
                    }
                    catch (Exception ex)
                    {
                        var orderNo = NormalizeOrderNo(order.OrderNo);
                        _logger.LogError(ex, $"Failed to sync order {orderNo} to Tally.");

                        var existing = await _context.ResellerSyncedOrders
                            .FirstOrDefaultAsync(o => o.OrderNo == orderNo);

                        if (existing == null)
                        {
                            existing = new ResellerSyncedOrder
                            {
                                OrderNo = orderNo,
                                OrderDate = order.OrderDate,
                                CustomerName = order.BillingAddress?.Name ?? "Unknown"
                            };
                            _context.ResellerSyncedOrders.Add(existing);
                        }

                        existing.SyncedAt = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified);
                        existing.Status = "Failed";
                        existing.ErrorMessage = ex.Message;
                    }
                    finally
                    {
                        await _context.SaveChangesAsync();
                    }
                }

                _logger.LogInformation("Reseller API to Tally synchronization job completed.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "A critical error occurred during the Reseller API to Tally synchronization job.");
                throw;
            }
        }

        private async Task EnrichOrderItemsFromProductMasterAsync(ResellerPendingOrder order)
        {
            if (order.Items.Any(item => string.IsNullOrWhiteSpace(item.Sku)))
                throw new InvalidOperationException($"Order {order.OrderNo} has one or more items without SKU.");

            var productLookup = await GetProductLookupBySkuOrAliasAsync(order.Items.Select(item => item.Sku));
            var missingSkus = order.Items
                .Select(item => item.Sku)
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .Where(sku => !productLookup.ContainsKey(NormalizeLookupKey(sku)))
                .ToList();

            if (missingSkus.Count > 0)
                throw new InvalidOperationException($"Product master not found for SKU(s): {string.Join(", ", missingSkus)}.");

            foreach (var item in order.Items)
            {
                var product = productLookup[NormalizeLookupKey(item.Sku)];
                item.StockItemName = product.Name;
                item.Unit = product.UnitType ?? string.Empty;
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
                    product.UnitType))
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

        private static string NormalizeOrderNo(string? orderNo)
        {
            return string.IsNullOrWhiteSpace(orderNo) ? string.Empty : orderNo.Trim().ToUpperInvariant();
        }

        private sealed record ProductTallyMatch(string Name, string? Sku, string? Alias, string? UnitType);
    }
}
