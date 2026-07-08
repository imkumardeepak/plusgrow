using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using PlusgrowWms.Api.Data;
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
                        // Check if we already synced this order successfully
                        var existing = await _context.ResellerSyncedOrders
                            .FirstOrDefaultAsync(o => o.OrderNo == order.OrderNo);

                        if (existing != null && existing.Status == "Success")
                        {
                            _logger.LogInformation($"Order {order.OrderNo} already synced to Tally. Skipping.");
                            continue;
                        }

                        // Post to Tally
                        _logger.LogInformation($"Posting order {order.OrderNo} to Tally as Sales Order...");
                        string tallyResponse = await _tallyService.PostSalesOrderAsync(order);
                        _logger.LogInformation($"Successfully posted order {order.OrderNo} to Tally.");

                        // Record success
                        if (existing == null)
                        {
                            existing = new ResellerSyncedOrder
                            {
                                OrderNo = order.OrderNo,
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
                        _logger.LogError(ex, $"Failed to sync order {order.OrderNo} to Tally.");

                        var existing = await _context.ResellerSyncedOrders
                            .FirstOrDefaultAsync(o => o.OrderNo == order.OrderNo);

                        if (existing == null)
                        {
                            existing = new ResellerSyncedOrder
                            {
                                OrderNo = order.OrderNo,
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
    }
}
