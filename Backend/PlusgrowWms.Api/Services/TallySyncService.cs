using Microsoft.EntityFrameworkCore;
using PlusgrowWms.Api.Data;
using PlusgrowWms.Api.Models;
using System.Globalization;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace PlusgrowWms.Api.Services;

public interface ITallySyncService
{
    Task SyncTodayVouchersAsync(CancellationToken ct = default);
}

public class TallySyncService : ITallySyncService
{
    private readonly TallyService _tallyService;
    private readonly PlusgrowDbContext _context;
    private readonly ILogger<TallySyncService> _logger;

    public TallySyncService(TallyService tallyService, PlusgrowDbContext context, ILogger<TallySyncService> logger)
    {
        _tallyService = tallyService;
        _context = context;
        _logger = logger;
    }

    public async Task SyncTodayVouchersAsync(CancellationToken ct = default)
    {
        var today = DateTime.Today;
        _logger.LogInformation("Tally sync started for {Date}", today.ToString("yyyy-MM-dd"));

        // Bail early if Tally is unreachable
        bool connected = await _tallyService.GetTestConnection();
        if (!connected)
        {
            _logger.LogWarning("Tally server unreachable — sync skipped.");
            return;
        }

        var vouchers = await _tallyService.GetVoucherByDateRangeAsync(today, today);

        int added = 0, skipped = 0;
        var now = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified);
        var productsByName = await GetUniqueProductsByNameAsync(ct);

        foreach (var v in vouchers)
        {
            var tallyReference = NormalizeKey(v.Reference);
            if (string.IsNullOrWhiteSpace(tallyReference) || tallyReference == "NA")
            {
                skipped++;
                continue;
            }

            var mapResult = MapSalesOrderItems(v.Items, productsByName);
            if (mapResult.Items is null || mapResult.Items.Count == 0)
            {
                _logger.LogWarning("Tally sales order {OrderNumber} skipped because one or more products were not matched.", tallyReference);

                // Log to audit table with unmatched product details
                var unmatchedNames = mapResult.UnmatchedProducts;
                var details = $"Tally sales order '{tallyReference}' skipped — unmatched products: {string.Join(", ", unmatchedNames)}";
                _context.AuditLogs.Add(new AuditLog
                {
                    UserId = null,
                    Username = "TallySync",
                    Action = "SyncSkipped",
                    EntityType = "SalesOrder",
                    EntityId = tallyReference,
                    Details = details,
                    Timestamp = now,
                    NewValues = JsonSerializer.Serialize(new
                    {
                        OrderNumber = tallyReference,
                        PartyName = NormalizeValue(v.PartyName),
                        Date = v.Date,
                        UnmatchedProducts = unmatchedNames,
                        TotalItems = v.Items?.Count ?? 0,
                    }),
                });

                skipped++;
                continue;
            }

            var referenceKey = tallyReference.ToLower();
            var existingOrders = await _context.SalesOrders
                .AsNoTracking()
                .Where(x =>
                    x.OrderNumber.ToLower() == referenceKey ||
                    (x.ReferenceNumber != null && x.ReferenceNumber.ToLower() == referenceKey))
                .ToListAsync(ct);

            if (existingOrders.Count > 0)
            {
                skipped++;
                continue;
            }

            var orderNumber = existingOrders.Count == 0
                ? tallyReference
                : await BuildReplacementOrderNumberAsync(tallyReference, ct);

            _context.SalesOrders.Add(CreateSalesOrder(v, mapResult.Items, orderNumber, tallyReference, now));
            added++;
        }

        await _context.SaveChangesAsync(ct);
        _logger.LogInformation("Tally sync done — {Added} sales orders added, {Skipped} skipped.", added, skipped);
    }

    private async Task<string> BuildReplacementOrderNumberAsync(string baseOrderNumber, CancellationToken ct)
    {
        var prefix = $"{baseOrderNumber}-R";
        var existingOrderNumbers = await _context.SalesOrders
            .AsNoTracking()
            .Where(x => x.OrderNumber == baseOrderNumber || x.OrderNumber.StartsWith(prefix))
            .Select(x => x.OrderNumber)
            .ToListAsync(ct);

        var used = existingOrderNumbers.ToHashSet(StringComparer.OrdinalIgnoreCase);
        for (var index = 1; index < 1000; index++)
        {
            var candidate = $"{baseOrderNumber}-R{index:000}";
            if (!used.Contains(candidate))
                return candidate;
        }

        return $"{baseOrderNumber}-R{DateTime.UtcNow:yyyyMMddHHmmss}";
    }

    private static SalesOrder CreateSalesOrder(
        TallyERPWebApi.Model.Voucher voucher,
        List<OutwardOrder> items,
        string orderNumber,
        string tallyReference,
        DateTime now)
    {
        return new SalesOrder
        {
            OrderNumber = orderNumber,
            OrderDate = ParseTallyDate(voucher.Date) ?? now.Date,
            CustomerName = NormalizeValue(voucher.PartyName),
            Status = "Open",
            Notes = "Imported from Tally",
            ReferenceNumber = tallyReference,
            CreatedAt = now,
            UpdatedAt = now,
            Items = items,
        };
    }

    private async Task<Dictionary<string, Product>> GetUniqueProductsByNameAsync(CancellationToken ct)
    {
        var products = await _context.Products
            .AsNoTracking()
            .Where(x => x.Name != "")
            .ToListAsync(ct);

        return products
            .GroupBy(x => NormalizeKey(x.Name))
            .Where(group => !string.IsNullOrWhiteSpace(group.Key) && group.Count() == 1)
            .ToDictionary(group => group.Key, group => group.First());
    }

    /// <summary>
    /// Result of mapping Tally voucher items to outward orders.
    /// Items is null when one or more products could not be matched.
    /// UnmatchedProducts contains the Tally stock item names that had no WMS product match.
    /// </summary>
    private record MapResult(List<OutwardOrder>? Items, List<string> UnmatchedProducts);

    private static MapResult MapSalesOrderItems(List<TallyERPWebApi.Model.ItemDetails>? items, Dictionary<string, Product> productsByName)
    {
        if (items is null || items.Count == 0)
            return new MapResult(null, new List<string>());

        var rows = new List<OutwardOrder>();
        var unmatched = new List<string>();

        foreach (var item in items)
        {
            var productKey = NormalizeKey(item.StockItemName);
            if (!productsByName.TryGetValue(productKey, out var product))
            {
                unmatched.Add(item.StockItemName ?? "Unknown");
                continue;
            }

            var quantity = ParseTallyQuantity(item.ActualQty);
            if (quantity <= 0)
            {
                unmatched.Add($"{item.StockItemName} (invalid qty: {item.ActualQty})");
                continue;
            }

            rows.Add(new OutwardOrder
            {
                ProductId = product.Id,
                Quantity = quantity,
                Mrp = ParseTallyRate(item.Rate) ?? product.Mrp,
                PickedQuantity = 0,
                Status = "Open",
                Notes = "Imported from Tally",
                CreatedAt = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified),
                UpdatedAt = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified),
            });
        }

        // If any items were unmatched, reject the entire order
        if (unmatched.Count > 0)
            return new MapResult(null, unmatched);

        return new MapResult(rows, new List<string>());
    }

    private static int ParseTallyQuantity(string? actualQty)
    {
        if (string.IsNullOrWhiteSpace(actualQty))
            return 0;

        var match = Regex.Match(actualQty, @"-?\d+");
        if (!match.Success)
            return 0;

        return int.TryParse(match.Value, NumberStyles.Integer, CultureInfo.InvariantCulture, out var quantity)
            ? quantity
            : 0;
    }

    private static decimal? ParseTallyRate(string? rate)
    {
        if (string.IsNullOrWhiteSpace(rate))
            return null;

        var match = Regex.Match(rate, @"-?\d+(?:\.\d+)?");
        if (!match.Success)
            return null;

        return decimal.TryParse(match.Value, NumberStyles.Number, CultureInfo.InvariantCulture, out var mrp)
            ? mrp
            : null;
    }

    private static bool IsCanceledStatus(string? status)
    {
        return string.Equals(status, "Canceled", StringComparison.OrdinalIgnoreCase);
    }

    private static DateTime? ParseTallyDate(string? date)
    {
        if (DateTime.TryParseExact(date, "yyyyMMdd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsed))
            return DateTime.SpecifyKind(parsed, DateTimeKind.Unspecified);

        return null;
    }

    private static string NormalizeKey(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? string.Empty : value.Trim().ToUpperInvariant();
    }

    private static string NormalizeValue(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? "NA" : value.Trim();
    }
}
