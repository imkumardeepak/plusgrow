using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Hangfire;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using PlusgrowWms.Api.Data;
using PlusgrowWms.Api.Models;

namespace PlusgrowWms.Api.Services
{
    public class ResellerApiFetchJob
    {
        private readonly ResellerApiClient _apiClient;
        private readonly PlusgrowDbContext _context;
        private readonly ILogger<ResellerApiFetchJob> _logger;

        public ResellerApiFetchJob(
            ResellerApiClient apiClient, 
            PlusgrowDbContext context, 
            ILogger<ResellerApiFetchJob> logger)
        {
            _apiClient = apiClient;
            _context = context;
            _logger = logger;
        }

        [DisableConcurrentExecution(timeoutInSeconds: 300)]
        public async Task FetchOrdersAsync()
        {
            _logger.LogInformation("Starting Reseller API fetch job...");

            try
            {
                var pendingOrders = await _apiClient.GetPendingOrdersAsync();

                if (pendingOrders == null || !pendingOrders.Any())
                {
                    _logger.LogInformation("No pending orders found from Reseller API.");
                    return;
                }

                _logger.LogInformation($"Found {pendingOrders.Count} pending orders from Reseller API.");

                var orderNos = pendingOrders
                    .Select(order => NormalizeOrderNo(order.OrderNo))
                    .Where(orderNo => !string.IsNullOrWhiteSpace(orderNo))
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .ToList();

                var existingOrderNos = await _context.ResellerSyncedOrders
                    .Where(o => orderNos.Contains(o.OrderNo))
                    .Select(o => o.OrderNo)
                    .ToListAsync();

                var skippedOrderNos = new HashSet<string>(existingOrderNos, StringComparer.OrdinalIgnoreCase);

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

                        if (!skippedOrderNos.Add(orderNo))
                        {
                            _logger.LogInformation($"Order {orderNo} already exists or was already received in this fetch. Skipping duplicate.");
                            continue;
                        }

                        var newOrder = new ResellerSyncedOrder
                        {
                            OrderNo = orderNo,
                            OrderDate = order.OrderDate,
                            CustomerName = order.BillingAddress?.Name ?? "Cash",
                            VoucherType = order.VoucherType,
                            CommonCostCentre = order.CommonCostCentre,
                            CompositeShippingCharges = order.CompositeShippingCharges,
                            BillingAddress = order.BillingAddress != null ? new ResellerAddressDb
                            {
                                Name = order.BillingAddress.Name,
                                Line1 = order.BillingAddress.Line1,
                                Line2 = order.BillingAddress.Line2,
                                City = order.BillingAddress.City,
                                State = order.BillingAddress.State,
                                Pincode = order.BillingAddress.Pincode,
                                ContactNo = order.BillingAddress.ContactNo
                            } : null,
                            ShippingAddress = order.ShippingAddress != null ? new ResellerAddressDb
                            {
                                Name = order.ShippingAddress.Name,
                                Line1 = order.ShippingAddress.Line1,
                                Line2 = order.ShippingAddress.Line2,
                                City = order.ShippingAddress.City,
                                State = order.ShippingAddress.State,
                                Pincode = order.ShippingAddress.Pincode,
                                ContactNo = order.ShippingAddress.ContactNo
                            } : null,
                            Status = "Pending",
                            FetchedAt = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified),
                            Items = order.Items.Select(i => new ResellerSyncedOrderItem
                            {
                                Sku = i.Sku,
                                Quantity = i.Quantity,
                                Rate = i.Rate
                            }).ToList()
                        };

                        _context.ResellerSyncedOrders.Add(newOrder);
                        _logger.LogInformation($"Added new order {orderNo} to local database.");
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, $"Failed to process order {order.OrderNo}.");
                    }
                }

                await _context.SaveChangesAsync();
                _logger.LogInformation("Reseller API fetch job completed.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "A critical error occurred during the Reseller API fetch job.");
                throw;
            }
        }

        private static string NormalizeOrderNo(string? orderNo)
        {
            return string.IsNullOrWhiteSpace(orderNo) ? string.Empty : orderNo.Trim().ToUpperInvariant();
        }
    }
}
