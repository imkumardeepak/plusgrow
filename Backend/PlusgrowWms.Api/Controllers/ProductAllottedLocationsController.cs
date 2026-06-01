using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
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

        var productScan = dto.ProductScanCode.Trim();
        var locationScan = dto.LocationOrBinScanCode.Trim();

        var product = await _context.Products.FirstOrDefaultAsync(x => x.Sku == productScan)
            ?? await _context.Products.FirstOrDefaultAsync(x => x.Name == productScan);

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

        var quantityRow = await _context.ProductQuantities.FirstOrDefaultAsync(x => x.ProductId == product.Id);
        var currentQuantity = quantityRow?.CurrentQuantity ?? 0;

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
        var remainingBefore = Math.Max(currentQuantity - totalAllocatedBefore, 0);

        if (dto.Quantity > remainingBefore)
            return BadRequest<PutAwayScanAssignmentResultDto>($"Only {remainingBefore} units are available for put away");

        var locationCode = resolvedLocation.LocationCode;
        allocationRow.LocationJson.TryGetValue(locationCode, out var existingLocationQty);
        allocationRow.LocationJson[locationCode] = existingLocationQty + dto.Quantity;
        allocationRow.UpdatedAt = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified);
        _context.Entry(allocationRow).Property(x => x.LocationJson).IsModified = true;

        await ReduceInvoiceRemainingAllocation(product.Id, dto.Quantity);
        await _context.SaveChangesAsync();

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
            LocationJson = row.LocationJson,
            UpdatedAt = row.UpdatedAt,
        };
    }

    private async Task ReduceInvoiceRemainingAllocation(int productId, int assignedQuantity)
    {
        var remainingToAllocate = assignedQuantity;
        var invoices = await _context.PoInvoices
            .Include(x => x.Header)
            .Where(x => x.ProductId == productId && x.RemainingAllocation > 0)
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
            remainingToAllocate -= reduceBy;
        }
    }

    private Task SendNotificationAsync(RealtimeNotificationDto notification)
    {
        return _notificationHub.Clients.All.SendAsync("ReceiveNotification", notification);
    }
}
