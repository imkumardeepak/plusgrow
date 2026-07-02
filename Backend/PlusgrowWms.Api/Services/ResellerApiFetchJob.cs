using System;
using System.Linq;
using System.Threading.Tasks;
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

                foreach (var order in pendingOrders)
                {
                    try
                    {
                        var existing = await _context.ResellerSyncedOrders
                            .Include(o => o.Items)
                            .FirstOrDefaultAsync(o => o.OrderNo == order.OrderNo);

                        if (existing == null)
                        {
                            var newOrder = new ResellerSyncedOrder
                            {
                                OrderNo = order.OrderNo,
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
                                FetchedAt = DateTime.UtcNow,
                                Items = order.Items.Select(i => new ResellerSyncedOrderItem
                                {
                                    Sku = i.Sku,
                                    Quantity = i.Quantity,
                                    Rate = i.Rate
                                }).ToList()
                            };

                            _context.ResellerSyncedOrders.Add(newOrder);
                            _logger.LogInformation($"Added new order {order.OrderNo} to local database.");
                        }
                        else if (existing.Status == "Pending")
                        {
                            // Update existing pending order
                            existing.OrderDate = order.OrderDate;
                            existing.CustomerName = order.BillingAddress?.Name ?? "Cash";
                            existing.VoucherType = order.VoucherType;
                            existing.CommonCostCentre = order.CommonCostCentre;
                            existing.CompositeShippingCharges = order.CompositeShippingCharges;

                            if (order.BillingAddress != null)
                            {
                                existing.BillingAddress ??= new ResellerAddressDb();
                                existing.BillingAddress.Name = order.BillingAddress.Name;
                                existing.BillingAddress.Line1 = order.BillingAddress.Line1;
                                existing.BillingAddress.Line2 = order.BillingAddress.Line2;
                                existing.BillingAddress.City = order.BillingAddress.City;
                                existing.BillingAddress.State = order.BillingAddress.State;
                                existing.BillingAddress.Pincode = order.BillingAddress.Pincode;
                                existing.BillingAddress.ContactNo = order.BillingAddress.ContactNo;
                            }

                            if (order.ShippingAddress != null)
                            {
                                existing.ShippingAddress ??= new ResellerAddressDb();
                                existing.ShippingAddress.Name = order.ShippingAddress.Name;
                                existing.ShippingAddress.Line1 = order.ShippingAddress.Line1;
                                existing.ShippingAddress.Line2 = order.ShippingAddress.Line2;
                                existing.ShippingAddress.City = order.ShippingAddress.City;
                                existing.ShippingAddress.State = order.ShippingAddress.State;
                                existing.ShippingAddress.Pincode = order.ShippingAddress.Pincode;
                                existing.ShippingAddress.ContactNo = order.ShippingAddress.ContactNo;
                            }

                            // Update Items
                            _context.ResellerSyncedOrderItems.RemoveRange(existing.Items);
                            existing.Items = order.Items.Select(i => new ResellerSyncedOrderItem
                            {
                                Sku = i.Sku,
                                Quantity = i.Quantity,
                                Rate = i.Rate
                            }).ToList();
                            
                            _logger.LogInformation($"Updated pending order {order.OrderNo} in local database.");
                        }
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
    }
}
