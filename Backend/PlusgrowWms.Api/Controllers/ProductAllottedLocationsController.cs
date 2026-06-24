using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using System.Security.Claims;
using PlusgrowWms.Api.Data;
using PlusgrowWms.Api.DTOs;
using PlusgrowWms.Api.Helpers;
using PlusgrowWms.Api.Hubs;
using PlusgrowWms.Api.Models;

namespace PlusgrowWms.Api.Controllers;

public class ProductAllottedLocationsController : BaseController
{
    private readonly PlusgrowDbContext _context;
    private readonly IHubContext<NotificationHub> _notificationHub;

    public ProductAllottedLocationsController(PlusgrowDbContext context, IHubContext<NotificationHub> notificationHub)
    {
        _context = context;
        _notificationHub = notificationHub;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<ProductAllottedLocationDto>>>> GetProductAllottedLocations()
    {
        var rows = await _context.ProductAllottedLocations
            .Include(x => x.Product)
            .OrderBy(x => x.Product!.Name)
            .ToListAsync();

        return Success(rows.Select(MapLocation).ToList());
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<ProductAllottedLocationDto>>> CreateProductAllottedLocation([FromBody] CreateProductAllottedLocationDto dto)
    {
        if (!await _context.Products.AnyAsync(x => x.Id == dto.ProductId))
            return BadRequest<ProductAllottedLocationDto>("Selected product does not exist");

        if (await _context.ProductAllottedLocations.AnyAsync(x => x.ProductId == dto.ProductId))
            return BadRequest<ProductAllottedLocationDto>("Allotted location row already exists for this product");

        var entity = new ProductAllottedLocation
        {
            ProductId = dto.ProductId,
            LocationJson = dto.LocationJson,
            UpdatedAt = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified),
        };

        _context.ProductAllottedLocations.Add(entity);
        await _context.SaveChangesAsync();

        var created = await _context.ProductAllottedLocations.Include(x => x.Product).FirstAsync(x => x.Id == entity.Id);
        var response = MapLocation(created);
        await SendNotificationAsync(new RealtimeNotificationDto
        {
            Type = "product_location.created",
            Title = "Location allotted",
            Message = $"{response.ProductName} location allotment was created.",
            Severity = "success",
            Data = new Dictionary<string, object?>
            {
                ["productId"] = response.ProductId,
                ["productName"] = response.ProductName,
                ["skuCode"] = response.SkuCode,
            },
        });

        return Success(response, "Product allotted location created successfully");
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<ApiResponse<ProductAllottedLocationDto>>> UpdateProductAllottedLocation(int id, [FromBody] UpdateProductAllottedLocationDto dto)
    {
        if (id != dto.Id)
            return BadRequest<ProductAllottedLocationDto>("ID mismatch");

        var entity = await _context.ProductAllottedLocations.FindAsync(id);
        if (entity == null)
            return NotFound<ProductAllottedLocationDto>("Product allotted location not found");

        if (!await _context.Products.AnyAsync(x => x.Id == dto.ProductId))
            return BadRequest<ProductAllottedLocationDto>("Selected product does not exist");

        var duplicate = await _context.ProductAllottedLocations.AnyAsync(x => x.ProductId == dto.ProductId && x.Id != id);
        if (duplicate)
            return BadRequest<ProductAllottedLocationDto>("Allotted location row already exists for this product");

        entity.ProductId = dto.ProductId;
        entity.LocationJson = dto.LocationJson ?? new Dictionary<string, int>();
        entity.UpdatedAt = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified);
        _context.Entry(entity).Property(x => x.LocationJson).IsModified = true;

        await _context.SaveChangesAsync();

        var updated = await _context.ProductAllottedLocations.Include(x => x.Product).FirstAsync(x => x.Id == entity.Id);
        var response = MapLocation(updated);
        await SendNotificationAsync(new RealtimeNotificationDto
        {
            Type = "product_location.updated",
            Title = "Location allotment updated",
            Message = $"{response.ProductName} location allotment was updated.",
            Severity = "info",
            Data = new Dictionary<string, object?>
            {
                ["productId"] = response.ProductId,
                ["productName"] = response.ProductName,
                ["skuCode"] = response.SkuCode,
            },
        });

        return Success(response, "Product allotted location updated successfully");
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult<ApiResponse>> DeleteProductAllottedLocation(int id)
    {
        var entity = await _context.ProductAllottedLocations.FindAsync(id);
        if (entity == null)
            return NotFound("Product allotted location not found");

        _context.ProductAllottedLocations.Remove(entity);
        await _context.SaveChangesAsync();
        return Ok("Product allotted location deleted successfully");
    }

    [HttpPost("assign-scan")]
    public async Task<ActionResult<ApiResponse<PutAwayScanAssignmentResultDto>>> AssignByScan([FromBody] PutAwayScanAssignmentRequestDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.ProductScanCode))
            return BadRequest<PutAwayScanAssignmentResultDto>("Product scan code is required");

        if (string.IsNullOrWhiteSpace(dto.LocationOrBinScanCode))
            return BadRequest<PutAwayScanAssignmentResultDto>("Location or bin scan code is required");

        if (dto.Quantity <= 0)
            return BadRequest<PutAwayScanAssignmentResultDto>("Quantity must be greater than zero");

        var productScan = NormalizeScanCode(dto.ProductScanCode);
        var locationScan = dto.LocationOrBinScanCode.Trim();

        var product = await _context.Products.FirstOrDefaultAsync(x => x.Sku != null && x.Sku.ToLower() == productScan.ToLower())
            ?? await _context.Products.FirstOrDefaultAsync(x => x.Alias != null && x.Alias.ToLower() == productScan.ToLower())
            ?? await _context.Products.FirstOrDefaultAsync(x => x.CartonQr != null && x.CartonQr.ToLower() == productScan.ToLower())
            ?? await _context.Products.FirstOrDefaultAsync(x => x.Name.ToLower() == productScan.ToLower());

        if (product == null)
            return NotFound<PutAwayScanAssignmentResultDto>("Scanned product was not found");

        var locations = await _context.Locations.OrderBy(x => x.LocationCode).ToListAsync();
        var resolvedLocation = locations.FirstOrDefault(x => x.LocationCode.Equals(locationScan, StringComparison.OrdinalIgnoreCase));
        if (resolvedLocation == null)
        {
            resolvedLocation = locations.FirstOrDefault(x => x.Bins.Any(bin => bin.Equals(locationScan, StringComparison.OrdinalIgnoreCase)));
        }

        if (resolvedLocation == null)
            return NotFound<PutAwayScanAssignmentResultDto>("Scanned location or bin was not found");

        await using var transaction = await _context.Database.BeginTransactionAsync();
        await _context.LockProductAsync(product.Id);

        var quantityRow = await _context.ProductQuantities.FirstOrDefaultAsync(x => x.ProductId == product.Id);
        var currentQuantity = quantityRow?.CurrentQuantity ?? 0;
        var activeInwardRemainingQuantity = await _context.PoInvoices
            .Include(x => x.Header)
            .Where(x => x.ProductId == product.Id && x.RemainingAllocation > 0 && x.Header != null && x.Header.Status != "Canceled")
            .SumAsync(x => (int?)x.RemainingAllocation) ?? 0;
        var verifiedRemainingQuantity = await GetVerifiedRemainingQuantityAsync(product.Id);

        var allocationRow = await _context.ProductAllottedLocations.FirstOrDefaultAsync(x => x.ProductId == product.Id);
        if (allocationRow == null)
        {
            allocationRow = new ProductAllottedLocation
            {
                ProductId = product.Id,
                LocationJson = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase),
                UpdatedAt = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified),
            };
            _context.ProductAllottedLocations.Add(allocationRow);
        }
        else if (allocationRow.LocationJson == null)
        {
            allocationRow.LocationJson = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        }

        var totalAllocatedBefore = allocationRow.LocationJson.Values.Sum();
        var remainingBefore = Math.Max(Math.Min(currentQuantity - totalAllocatedBefore, Math.Min(activeInwardRemainingQuantity, verifiedRemainingQuantity)), 0);

        if (activeInwardRemainingQuantity <= 0)
            return BadRequest<PutAwayScanAssignmentResultDto>("No active inward stock is available for put-away. Canceled inward entries cannot be put away.");

        if (verifiedRemainingQuantity <= 0)
            return BadRequest<PutAwayScanAssignmentResultDto>("No inward verified stock is available for put-away. Complete inward verification first.");

        if (dto.Quantity > remainingBefore)
            return BadRequest<PutAwayScanAssignmentResultDto>($"Only {remainingBefore} units are available for put away");

        var locationCode = resolvedLocation.LocationCode;
        allocationRow.LocationJson.TryGetValue(locationCode, out var existingLocationQty);
        allocationRow.LocationJson[locationCode] = existingLocationQty + dto.Quantity;
        allocationRow.UpdatedAt = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified);
        _context.Entry(allocationRow).Property(x => x.LocationJson).IsModified = true;

        await ReduceInvoiceRemainingAllocation(product.Id, dto.Quantity, locationCode);
        await _context.SaveChangesAsync();
        await transaction.CommitAsync();

        var totalAllocatedAfter = allocationRow.LocationJson.Values.Sum();

        var response = new PutAwayScanAssignmentResultDto
        {
            ProductId = product.Id,
            SkuCode = product.Sku ?? string.Empty,
            ProductName = product.Name,
            ScannedLocationOrBinCode = locationScan,
            ResolvedLocationCode = locationCode,
            AssignedQuantity = dto.Quantity,
            CurrentQuantity = currentQuantity,
            TotalAllocatedQuantity = totalAllocatedAfter,
            RemainingUnassignedQuantity = Math.Max(currentQuantity - totalAllocatedAfter, 0),
        };
        await SendNotificationAsync(new RealtimeNotificationDto
        {
            Type = "putaway.assigned",
            Title = "Location allotted",
            Message = $"{response.AssignedQuantity} units of {response.ProductName} allotted to {response.ResolvedLocationCode}.",
            Severity = "success",
            Data = new Dictionary<string, object?>
            {
                ["productId"] = response.ProductId,
                ["productName"] = response.ProductName,
                ["skuCode"] = response.SkuCode,
                ["locationCode"] = response.ResolvedLocationCode,
                ["assignedQuantity"] = response.AssignedQuantity,
                ["remainingUnassignedQuantity"] = response.RemainingUnassignedQuantity,
            },
        });

        return Success(response, "Put-away assignment saved successfully");
    }

    [HttpPost("move")]
    public async Task<ActionResult<ApiResponse<ProductAllottedLocationDto>>> MoveStock([FromBody] MoveProductStockDto dto)
    {
        if (dto.ProductId <= 0)
            return BadRequest<ProductAllottedLocationDto>("Product is required");

        if (string.IsNullOrWhiteSpace(dto.SourceLocationCode))
            return BadRequest<ProductAllottedLocationDto>("Source location is required");

        if (string.IsNullOrWhiteSpace(dto.DestinationLocationCode))
            return BadRequest<ProductAllottedLocationDto>("Destination location is required");

        if (dto.Quantity <= 0)
            return BadRequest<ProductAllottedLocationDto>("Quantity must be greater than zero");

        var product = await _context.Products.FirstOrDefaultAsync(x => x.Id == dto.ProductId);
        if (product == null)
            return NotFound<ProductAllottedLocationDto>("Selected product does not exist");

        await using var transaction = await _context.Database.BeginTransactionAsync();
        await _context.LockProductAsync(dto.ProductId);

        var srcInput = dto.SourceLocationCode.Trim();
        var destInput = dto.DestinationLocationCode.Trim();

        var locationsList = await _context.Locations.ToListAsync();

        var resolvedSource = locationsList.FirstOrDefault(x => x.LocationCode.Equals(srcInput, StringComparison.OrdinalIgnoreCase))
            ?? locationsList.FirstOrDefault(x => x.Bins.Any(bin => bin.Equals(srcInput, StringComparison.OrdinalIgnoreCase)));

        var resolvedDestination = locationsList.FirstOrDefault(x => x.LocationCode.Equals(destInput, StringComparison.OrdinalIgnoreCase))
            ?? locationsList.FirstOrDefault(x => x.Bins.Any(bin => bin.Equals(destInput, StringComparison.OrdinalIgnoreCase)));

        if (resolvedSource == null)
            return NotFound<ProductAllottedLocationDto>("Source location or bin was not found");

        if (resolvedDestination == null)
            return NotFound<ProductAllottedLocationDto>("Destination location or bin was not found");

        var sourceCode = resolvedSource.LocationCode;
        var destinationCode = resolvedDestination.LocationCode;

        if (sourceCode.Equals(destinationCode, StringComparison.OrdinalIgnoreCase))
            return BadRequest<ProductAllottedLocationDto>("Source and destination locations cannot be the same");

        var allocationRow = await _context.ProductAllottedLocations
            .FirstOrDefaultAsync(x => x.ProductId == dto.ProductId);

        if (allocationRow == null || allocationRow.LocationJson == null)
            return BadRequest<ProductAllottedLocationDto>("No stock allocation found for this product");

        var caseInsensitiveJson = new Dictionary<string, int>(allocationRow.LocationJson, StringComparer.OrdinalIgnoreCase);

        if (!caseInsensitiveJson.TryGetValue(sourceCode, out var sourceQty) || sourceQty <= 0)
            return BadRequest<ProductAllottedLocationDto>($"Product has no stock at source location {sourceCode}");

        if (sourceQty < dto.Quantity)
            return BadRequest<ProductAllottedLocationDto>($"Insufficient stock at source location {sourceCode}. Current stock is {sourceQty} units.");

        // Relocate
        caseInsensitiveJson[sourceCode] = sourceQty - dto.Quantity;
        if (caseInsensitiveJson[sourceCode] == 0)
        {
            caseInsensitiveJson.Remove(sourceCode);
        }

        caseInsensitiveJson.TryGetValue(destinationCode, out var destQty);
        caseInsensitiveJson[destinationCode] = destQty + dto.Quantity;

        // Copy back to entity
        allocationRow.LocationJson = new Dictionary<string, int>(caseInsensitiveJson);
        allocationRow.UpdatedAt = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified);
        _context.Entry(allocationRow).Property(x => x.LocationJson).IsModified = true;

        // Track stock movement
        var quantityRow = await _context.ProductQuantities
            .FirstOrDefaultAsync(x => x.ProductId == dto.ProductId);
        var currentQty = quantityRow?.CurrentQuantity ?? 0;

        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        int? performedByUserId = int.TryParse(userIdClaim, out var parsedUserId) ? parsedUserId : null;
        var performedByName = User.FindFirst(ClaimTypes.GivenName)?.Value
            ?? User.Identity?.Name
            ?? "System User";

        var movement = new ProductStockMovement
        {
            ProductId = dto.ProductId,
            QuantityChange = 0,
            QuantityBefore = currentQty,
            QuantityAfter = currentQty,
            Reason = string.IsNullOrWhiteSpace(dto.Reason) ? "Relocation" : dto.Reason.Trim(),
            MovementType = "move",
            Notes = $"Moved {dto.Quantity} units from {sourceCode} to {destinationCode}." +
                    (string.IsNullOrWhiteSpace(dto.Notes) ? "" : $" {dto.Notes.Trim()}"),
            PerformedByUserId = performedByUserId,
            PerformedByName = performedByName,
            CreatedAt = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified),
        };

        _context.ProductStockMovements.Add(movement);
        await _context.SaveChangesAsync();
        await transaction.CommitAsync();

        var updated = await _context.ProductAllottedLocations
            .Include(x => x.Product)
            .FirstAsync(x => x.Id == allocationRow.Id);

        var response = MapLocation(updated);

        await SendNotificationAsync(new RealtimeNotificationDto
        {
            Type = "product_location.moved",
            Title = "Stock relocated",
            Message = $"{dto.Quantity} units of {product.Name} moved from {sourceCode} to {destinationCode}.",
            Severity = "info",
            Data = new Dictionary<string, object?>
            {
                ["productId"] = product.Id,
                ["productName"] = product.Name,
                ["skuCode"] = product.Sku,
                ["sourceLocationCode"] = sourceCode,
                ["destinationLocationCode"] = destinationCode,
                ["quantity"] = dto.Quantity,
            },
        });

        return Success(response, $"Successfully relocated {dto.Quantity} units to {destinationCode}");
    }

    private static ProductAllottedLocationDto MapLocation(ProductAllottedLocation row)
    {
        return new ProductAllottedLocationDto
        {
            Id = row.Id,
            ProductId = row.ProductId,
            SkuCode = row.Product?.Sku ?? string.Empty,
            ProductName = row.Product?.Name ?? string.Empty,
            Alias = row.Product?.Alias,
            LocationJson = row.LocationJson,
            UpdatedAt = row.UpdatedAt,
        };
    }

    private async Task ReduceInvoiceRemainingAllocation(int productId, int assignedQuantity, string locationCode)
    {
        var remainingToAllocate = assignedQuantity;
        var invoices = await _context.PoInvoices
            .Include(x => x.Header)
            .Where(x => x.ProductId == productId && x.RemainingAllocation > 0 && x.Header != null && x.Header.Status != "Canceled")
            .OrderBy(x => x.Header!.InvoiceDate)
            .ThenBy(x => x.Id)
            .ToListAsync();

        foreach (var invoice in invoices)
        {
            if (remainingToAllocate <= 0)
                break;

            var reduceBy = Math.Min(invoice.RemainingAllocation, remainingToAllocate);
            invoice.RemainingAllocation -= reduceBy;
            invoice.LocationAllotted = invoice.RemainingAllocation <= 0;

            var invoiceLocation = await _context.PoInvoiceLocations
                .FirstOrDefaultAsync(x => x.PoInvoiceId == invoice.Id && x.LocationCode == locationCode);

            if (invoiceLocation == null)
            {
                invoiceLocation = new PoInvoiceLocation
                {
                    PoInvoiceId = invoice.Id,
                    LocationCode = locationCode,
                    Quantity = reduceBy
                };
                _context.PoInvoiceLocations.Add(invoiceLocation);
            }
            else
            {
                invoiceLocation.Quantity += reduceBy;
            }

            remainingToAllocate -= reduceBy;
        }
    }

    private async Task<int> GetVerifiedRemainingQuantityAsync(int productId)
    {
        var invoices = await _context.PoInvoices
            .Include(x => x.Header)
            .Include(x => x.Product)
            .Where(x => x.ProductId == productId && x.Header != null && x.Header.Status != "Canceled")
            .ToListAsync();

        if (invoices.Count == 0)
            return 0;

        var reports = await _context.StockCheckReports
            .AsNoTracking()
            .Where(x => x.CheckType == "INWARD_VERIFY" && x.Status == "COMPLETED")
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync();

        var verifiedQty = 0;
        foreach (var invoice in invoices)
        {
            if (invoice.VerifiedQuantity.HasValue)
            {
                verifiedQty += invoice.VerifiedQuantity.Value;
                continue;
            }

            var matchingReport = reports.FirstOrDefault(report => IsVerificationForInvoice(report, invoice));
            if (matchingReport == null)
                continue;

            verifiedQty += GetVerifiedQuantityForSku(matchingReport.ItemsJson, invoice.Product?.Sku);
        }

        var alreadyPutAwayQty = invoices.Sum(invoice =>
            Math.Max((invoice.VerifiedQuantity ?? invoice.BilledQty) - invoice.RemainingAllocation, 0));
        return Math.Max(verifiedQty - alreadyPutAwayQty, 0);
    }

    private static bool IsVerificationForInvoice(StockCheckReport report, PoInvoice invoice)
    {
        if (invoice.Header == null)
            return false;

        if (!string.IsNullOrWhiteSpace(report.Notes))
        {
            try
            {
                using var notes = JsonDocument.Parse(report.Notes);
                var root = notes.RootElement;
                var referenceName = root.TryGetProperty("referenceName", out var referenceElement) ? referenceElement.GetString() : null;
                var partyName = root.TryGetProperty("partyName", out var partyElement) ? partyElement.GetString() : null;
                var invoiceDate = root.TryGetProperty("invoiceDate", out var dateElement) ? dateElement.GetString() : null;
                return string.Equals(referenceName, invoice.Header.InvoiceNumber, StringComparison.OrdinalIgnoreCase)
                    && string.Equals(partyName, invoice.Header.PartyName, StringComparison.OrdinalIgnoreCase)
                    && NormalizeDateText(invoiceDate) == NormalizeDateText(invoice.Header.InvoiceDate.ToString("yyyy-MM-dd"));
            }
            catch
            {
                // Fall through to legacy reference matching.
            }
        }

        return report.ReferenceName.StartsWith($"{invoice.Header.InvoiceNumber} - {invoice.Header.PartyName}", StringComparison.OrdinalIgnoreCase);
    }

    private static int GetVerifiedQuantityForSku(string itemsJson, string? sku)
    {
        if (string.IsNullOrWhiteSpace(itemsJson) || string.IsNullOrWhiteSpace(sku))
            return 0;

        try
        {
            using var document = JsonDocument.Parse(itemsJson);
            if (document.RootElement.ValueKind != JsonValueKind.Array)
                return 0;

            var normalizedSku = sku.Trim().ToUpperInvariant();
            var total = 0;
            foreach (var item in document.RootElement.EnumerateArray())
            {
                var itemSku = item.TryGetProperty("sku", out var skuElement) ? skuElement.GetString() : null;
                var isUnexpected = item.TryGetProperty("isUnexpected", out var unexpectedElement) && unexpectedElement.GetBoolean();
                if (isUnexpected || !string.Equals(itemSku?.Trim(), normalizedSku, StringComparison.OrdinalIgnoreCase))
                    continue;

                total += item.TryGetProperty("scannedQty", out var qtyElement) && qtyElement.TryGetInt32(out var qty) ? qty : 0;
            }
            return total;
        }
        catch
        {
            return 0;
        }
    }

    private static string NormalizeDateText(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return string.Empty;

        return DateTime.TryParse(value, out var parsed) ? parsed.ToString("yyyy-MM-dd") : value.Trim();
    }

    private static string NormalizeScanCode(string value)
    {
        return value.Trim().Split('#')[0].Trim();
    }

    private Task SendNotificationAsync(RealtimeNotificationDto notification)
    {
        return _notificationHub.Clients.All.SendAsync("ReceiveNotification", notification);
    }
}
