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
    Task<List<TallySyncSkippedOrder>> GetSkippedOrdersAsync(bool includeResolved = false, CancellationToken ct = default);
    Task<bool> RetrySkippedOrderAsync(int id, CancellationToken ct = default);
    Task<bool> DismissSkippedOrderAsync(int id, CancellationToken ct = default);
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
                await UpsertSkippedOrderAsync(v, tallyReference, "EmptyReference", "Voucher reference is empty or NA", null, ct);
                skipped++;
                continue;
            }

            var mapResult = MapSalesOrderItems(v.Items, productsByName);
            if (mapResult.Items is null || mapResult.Items.Count == 0)
            {
                _logger.LogWarning("Tally sales order {OrderNumber} skipped because one or more products were not matched.", tallyReference);

                var unmatchedNames = mapResult.UnmatchedProducts;
                var details = $"Unmatched products: {string.Join(", ", unmatchedNames)}";
                
                await UpsertSkippedOrderAsync(v, tallyReference, "ProductNotFound", details, unmatchedNames, ct);

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
                await UpsertSkippedOrderAsync(v, tallyReference, "AlreadyExists", "Order number or reference already exists in WMS", null, ct);
                skipped++;
                continue;
            }

            try
            {
                var orderNumber = existingOrders.Count == 0
                    ? tallyReference
                    : await BuildReplacementOrderNumberAsync(tallyReference, ct);

                _context.SalesOrders.Add(CreateSalesOrder(v, mapResult.Items, orderNumber, tallyReference, now));
                added++;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error adding sales order {OrderNumber}", tallyReference);
                await UpsertSkippedOrderAsync(v, tallyReference, "Exception", ex.Message, null, ct);
                skipped++;
            }
        }

        await _context.SaveChangesAsync(ct);
        _logger.LogInformation("Tally sync done — {Added} sales orders added, {Skipped} skipped.", added, skipped);
    }

    private async Task UpsertSkippedOrderAsync(TallyERPWebApi.Model.Voucher voucher, string tallyReference, string skipReason, string details, List<string>? unmatchedProducts, CancellationToken ct)
    {
        var rawItemsJson = JsonSerializer.Serialize(voucher.Items ?? new List<TallyERPWebApi.Model.ItemDetails>());
        var unmatchedJson = unmatchedProducts != null ? JsonSerializer.Serialize(unmatchedProducts) : null;
        var today = DateTime.SpecifyKind(DateTime.Now.Date, DateTimeKind.Unspecified);

        var existing = await _context.TallySyncSkippedOrders
            .Where(x => x.TallyReference == tallyReference && x.SyncedAt >= today)
            .FirstOrDefaultAsync(ct);

        if (existing != null)
        {
            existing.PartyName = NormalizeValue(voucher.PartyName);
            existing.OrderDate = voucher.Date;
            existing.SkipReason = skipReason;
            existing.Details = details;
            existing.UnmatchedProducts = unmatchedJson;
            existing.RawItemsJson = rawItemsJson;
            existing.IsResolved = false;
            existing.SyncedAt = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified);
            _context.TallySyncSkippedOrders.Update(existing);
        }
        else
        {
            _context.TallySyncSkippedOrders.Add(new TallySyncSkippedOrder
            {
                TallyReference = string.IsNullOrWhiteSpace(tallyReference) ? "NA" : tallyReference,
                PartyName = NormalizeValue(voucher.PartyName),
                OrderDate = voucher.Date,
                SkipReason = skipReason,
                Details = details,
                UnmatchedProducts = unmatchedJson,
                RawItemsJson = rawItemsJson,
                IsResolved = false,
                SyncedAt = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified)
            });
        }
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

    public async Task<List<TallySyncSkippedOrder>> GetSkippedOrdersAsync(bool includeResolved = false, CancellationToken ct = default)
    {
        var query = _context.TallySyncSkippedOrders.AsNoTracking();
        
        if (!includeResolved)
            query = query.Where(x => !x.IsResolved);

        return await query.OrderByDescending(x => x.SyncedAt).ToListAsync(ct);
    }

    public async Task<bool> RetrySkippedOrderAsync(int id, CancellationToken ct = default)
    {
        var skipped = await _context.TallySyncSkippedOrders.FindAsync([id], ct);
        if (skipped == null || skipped.IsResolved)
            return false;

        // Deserialize the raw voucher items
        var items = string.IsNullOrEmpty(skipped.RawItemsJson) 
            ? new List<TallyERPWebApi.Model.ItemDetails>() 
            : JsonSerializer.Deserialize<List<TallyERPWebApi.Model.ItemDetails>>(skipped.RawItemsJson) ?? new List<TallyERPWebApi.Model.ItemDetails>();

        var productsByName = await GetUniqueProductsByNameAsync(ct);
        var mapResult = MapSalesOrderItems(items, productsByName);

        if (mapResult.Items is null || mapResult.Items.Count == 0)
        {
            // Still fails, update the unmatched products just in case they changed
            skipped.UnmatchedProducts = mapResult.UnmatchedProducts != null ? JsonSerializer.Serialize(mapResult.UnmatchedProducts) : null;
            skipped.SkipReason = "ProductNotFound";
            skipped.Details = $"Unmatched products: {string.Join(", ", mapResult.UnmatchedProducts ?? new List<string>())}";
            await _context.SaveChangesAsync(ct);
            throw new Exception($"Retry failed: {skipped.Details}");
        }

        var referenceKey = skipped.TallyReference.ToLower();
        var existingOrders = await _context.SalesOrders
            .AsNoTracking()
            .Where(x =>
                x.OrderNumber.ToLower() == referenceKey ||
                (x.ReferenceNumber != null && x.ReferenceNumber.ToLower() == referenceKey))
            .ToListAsync(ct);

        if (existingOrders.Count > 0)
        {
            skipped.SkipReason = "AlreadyExists";
            skipped.Details = "Order number or reference already exists in WMS";
            await _context.SaveChangesAsync(ct);
            throw new Exception("Retry failed: Already exists in WMS.");
        }

        // Reconstruct a dummy voucher for CreateSalesOrder
        var dummyVoucher = new TallyERPWebApi.Model.Voucher
        {
            Reference = skipped.TallyReference,
            PartyName = skipped.PartyName,
            Date = skipped.OrderDate,
            Items = items
        };

        var now = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified);
        var orderNumber = skipped.TallyReference; // if we get here, it doesn't exist
        
        _context.SalesOrders.Add(CreateSalesOrder(dummyVoucher, mapResult.Items, orderNumber, skipped.TallyReference, now));
        
        skipped.IsResolved = true;
        skipped.ResolvedAt = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified);

        await _context.SaveChangesAsync(ct);
        return true;
    }

    public async Task<bool> DismissSkippedOrderAsync(int id, CancellationToken ct = default)
    {
        var skipped = await _context.TallySyncSkippedOrders.FindAsync([id], ct);
        if (skipped == null || skipped.IsResolved)
            return false;

        skipped.IsResolved = true;
        skipped.ResolvedAt = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified);
        skipped.Details = "Manually dismissed";
        
        await _context.SaveChangesAsync(ct);
        return true;
    }
}
