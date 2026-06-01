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

public class ProductQuantitiesController : BaseController
{
    private readonly PlusgrowDbContext _context;
    private readonly IHubContext<NotificationHub> _notificationHub;

    public ProductQuantitiesController(PlusgrowDbContext context, IHubContext<NotificationHub> notificationHub)
    {
        _context = context;
        _notificationHub = notificationHub;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<ProductQuantityDto>>>> GetProductQuantities()
    {
        var rows = await _context.ProductQuantities
            .Include(x => x.Product)
            .OrderBy(x => x.Product!.Name)
            .ToListAsync();

        return Success(rows.Select(MapQuantity).ToList());
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<ProductQuantityDto>>> CreateProductQuantity([FromBody] CreateProductQuantityDto dto)
    {
        if (!await _context.Products.AnyAsync(x => x.Id == dto.ProductId))
            return BadRequest<ProductQuantityDto>("Selected product does not exist");

        if (await _context.ProductQuantities.AnyAsync(x => x.ProductId == dto.ProductId))
            return BadRequest<ProductQuantityDto>("Quantity row already exists for this product");

        var entity = new ProductQuantity
        {
            ProductId = dto.ProductId,
            CurrentQuantity = dto.CurrentQuantity,
            UpdatedAt = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified),
        };

        _context.ProductQuantities.Add(entity);
        await _context.SaveChangesAsync();

        var created = await _context.ProductQuantities.Include(x => x.Product).FirstAsync(x => x.Id == entity.Id);
        return Success(MapQuantity(created), "Product quantity created successfully");
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<ApiResponse<ProductQuantityDto>>> UpdateProductQuantity(int id, [FromBody] UpdateProductQuantityDto dto)
    {
        if (id != dto.Id)
            return BadRequest<ProductQuantityDto>("ID mismatch");

        var entity = await _context.ProductQuantities.FindAsync(id);
        if (entity == null)
            return NotFound<ProductQuantityDto>("Product quantity not found");

        if (!await _context.Products.AnyAsync(x => x.Id == dto.ProductId))
            return BadRequest<ProductQuantityDto>("Selected product does not exist");

        var duplicate = await _context.ProductQuantities.AnyAsync(x => x.ProductId == dto.ProductId && x.Id != id);
        if (duplicate)
            return BadRequest<ProductQuantityDto>("Quantity row already exists for this product");

        entity.ProductId = dto.ProductId;
        entity.CurrentQuantity = dto.CurrentQuantity;
        entity.UpdatedAt = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified);

        await _context.SaveChangesAsync();

        var updated = await _context.ProductQuantities.Include(x => x.Product).FirstAsync(x => x.Id == entity.Id);
        return Success(MapQuantity(updated), "Product quantity updated successfully");
    }

    [HttpGet("movements")]
    public async Task<ActionResult<ApiResponse<List<ProductStockMovementDto>>>> GetMovements([FromQuery] string? search)
    {
        var query = _context.ProductStockMovements
            .Include(x => x.Product)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var normalized = search.Trim().ToLower();
            query = query.Where(x =>
                (x.Product != null && x.Product.Name.ToLower().Contains(normalized)) ||
                (x.Product != null && x.Product.Sku != null && x.Product.Sku.ToLower().Contains(normalized)) ||
                x.Reason.ToLower().Contains(normalized) ||
                (x.Notes != null && x.Notes.ToLower().Contains(normalized)) ||
                (x.PerformedByName != null && x.PerformedByName.ToLower().Contains(normalized)));
        }

        var rows = await query
            .OrderByDescending(x => x.CreatedAt)
            .Take(200)
            .ToListAsync();

        return Success(rows.Select(MapMovement).ToList());
    }

    [HttpPost("adjust")]
    public async Task<ActionResult<ApiResponse<StockAdjustmentResultDto>>> AdjustStock([FromBody] CreateStockAdjustmentDto dto)
    {
        if (dto.ProductId <= 0)
            return BadRequest<StockAdjustmentResultDto>("Product is required");

        if (dto.QuantityChange == 0)
            return BadRequest<StockAdjustmentResultDto>("Quantity change cannot be zero");

        if (string.IsNullOrWhiteSpace(dto.LocationCode))
            return BadRequest<StockAdjustmentResultDto>("Location is required");

        if (string.IsNullOrWhiteSpace(dto.Reason))
            return BadRequest<StockAdjustmentResultDto>("Reason is required");

        var product = await _context.Products.FirstOrDefaultAsync(x => x.Id == dto.ProductId);
        if (product == null)
            return NotFound<StockAdjustmentResultDto>("Selected product does not exist");

        var locationCode = dto.LocationCode.Trim();
        var location = await _context.Locations
            .FirstOrDefaultAsync(x => x.LocationCode.ToLower() == locationCode.ToLower());
        if (location == null)
            return NotFound<StockAdjustmentResultDto>("Selected location does not exist");

        locationCode = location.LocationCode;

        var quantityRow = await _context.ProductQuantities
            .Include(x => x.Product)
            .FirstOrDefaultAsync(x => x.ProductId == dto.ProductId);

        var quantityBefore = quantityRow?.CurrentQuantity ?? 0;
        var quantityAfter = quantityBefore + dto.QuantityChange;

        if (quantityAfter < 0)
            return BadRequest<StockAdjustmentResultDto>($"Cannot reduce stock below zero. Current quantity is {quantityBefore}");

        var allocationRow = await _context.ProductAllottedLocations
            .FirstOrDefaultAsync(x => x.ProductId == dto.ProductId);
        if (allocationRow == null)
        {
            allocationRow = new ProductAllottedLocation
            {
                ProductId = dto.ProductId,
                LocationJson = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase),
                UpdatedAt = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified),
            };
            _context.ProductAllottedLocations.Add(allocationRow);
        }
        else if (allocationRow.LocationJson == null)
        {
            allocationRow.LocationJson = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        }

        allocationRow.LocationJson.TryGetValue(locationCode, out var locationQuantityBefore);
        var locationQuantityAfter = locationQuantityBefore + dto.QuantityChange;
        if (locationQuantityAfter < 0)
            return BadRequest<StockAdjustmentResultDto>($"Cannot reduce {locationCode} below zero. Current location quantity is {locationQuantityBefore}");

        if (locationQuantityAfter == 0)
        {
            allocationRow.LocationJson.Remove(locationCode);
        }
        else
        {
            allocationRow.LocationJson[locationCode] = locationQuantityAfter;
        }

        allocationRow.UpdatedAt = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified);
        _context.Entry(allocationRow).Property(x => x.LocationJson).IsModified = true;

        if (quantityRow == null)
        {
            quantityRow = new ProductQuantity
            {
                ProductId = dto.ProductId,
                CurrentQuantity = quantityAfter,
                UpdatedAt = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified),
            };
            _context.ProductQuantities.Add(quantityRow);
        }
        else
        {
            quantityRow.CurrentQuantity = quantityAfter;
            quantityRow.UpdatedAt = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified);
        }

        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        int? performedByUserId = int.TryParse(userIdClaim, out var parsedUserId) ? parsedUserId : null;
        var performedByName = User.FindFirstValue(ClaimTypes.GivenName)
            ?? User.Identity?.Name
            ?? "System User";

        var movement = new ProductStockMovement
        {
            ProductId = dto.ProductId,
            QuantityChange = dto.QuantityChange,
            QuantityBefore = quantityBefore,
            QuantityAfter = quantityAfter,
            Reason = dto.Reason.Trim(),
            MovementType = dto.QuantityChange > 0 ? "increase" : "decrease",
            Notes = BuildAdjustmentNotes(locationCode, locationQuantityBefore, locationQuantityAfter, dto.Notes),
            PerformedByUserId = performedByUserId,
            PerformedByName = performedByName,
            CreatedAt = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified),
        };

        _context.ProductStockMovements.Add(movement);
        await _context.SaveChangesAsync();

        var refreshedQuantity = await _context.ProductQuantities
            .Include(x => x.Product)
            .FirstAsync(x => x.Id == quantityRow.Id);

        var refreshedMovement = await _context.ProductStockMovements
            .Include(x => x.Product)
            .FirstAsync(x => x.Id == movement.Id);

        var response = new StockAdjustmentResultDto
        {
            Quantity = MapQuantity(refreshedQuantity),
            Movement = MapMovement(refreshedMovement),
        };

        await SendNotificationAsync(new RealtimeNotificationDto
        {
            Type = "stock.adjusted",
            Title = "Stock adjusted",
            Message = $"{response.Movement.ProductName} quantity changed by {response.Movement.QuantityChange:+#;-#;0}.",
            Severity = dto.QuantityChange > 0 ? "success" : "warning",
            Data = new Dictionary<string, object?>
            {
                ["productId"] = response.Movement.ProductId,
                ["productName"] = response.Movement.ProductName,
                ["skuCode"] = response.Movement.SkuCode,
                ["quantityBefore"] = response.Movement.QuantityBefore,
                ["quantityAfter"] = response.Movement.QuantityAfter,
                ["quantityChange"] = response.Movement.QuantityChange,
                ["locationCode"] = locationCode,
                ["locationQuantityBefore"] = locationQuantityBefore,
                ["locationQuantityAfter"] = locationQuantityAfter,
                ["reason"] = response.Movement.Reason,
                ["performedByName"] = response.Movement.PerformedByName,
            },
        });

        return Success(response, "Stock adjusted successfully");
    }

    private static string BuildAdjustmentNotes(string locationCode, int locationQuantityBefore, int locationQuantityAfter, string? notes)
    {
        var locationNote = $"Location {locationCode}: {locationQuantityBefore} -> {locationQuantityAfter}";
        if (string.IsNullOrWhiteSpace(notes))
            return locationNote;

        return $"{locationNote}. {notes.Trim()}";
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult<ApiResponse>> DeleteProductQuantity(int id)
    {
        var entity = await _context.ProductQuantities.FindAsync(id);
        if (entity == null)
            return NotFound("Product quantity not found");

        _context.ProductQuantities.Remove(entity);
        await _context.SaveChangesAsync();
        return Ok("Product quantity deleted successfully");
    }

    private static ProductQuantityDto MapQuantity(ProductQuantity row)
    {
        return new ProductQuantityDto
        {
            Id = row.Id,
            ProductId = row.ProductId,
            SkuCode = row.Product?.Sku ?? string.Empty,
            ProductName = row.Product?.Name ?? string.Empty,
            Alias = row.Product?.Alias,
            CurrentQuantity = row.CurrentQuantity,
            UpdatedAt = row.UpdatedAt,
        };
    }

    private static ProductStockMovementDto MapMovement(ProductStockMovement row)
    {
        return new ProductStockMovementDto
        {
            Id = row.Id,
            ProductId = row.ProductId,
            SkuCode = row.Product?.Sku ?? string.Empty,
            ProductName = row.Product?.Name ?? string.Empty,
            QuantityChange = row.QuantityChange,
            QuantityBefore = row.QuantityBefore,
            QuantityAfter = row.QuantityAfter,
            Reason = row.Reason,
            MovementType = row.MovementType,
            Notes = row.Notes,
            PerformedByUserId = row.PerformedByUserId,
            PerformedByName = row.PerformedByName,
            CreatedAt = row.CreatedAt,
        };
    }

    private Task SendNotificationAsync(RealtimeNotificationDto notification)
    {
        return _notificationHub.Clients.All.SendAsync("ReceiveNotification", notification);
    }
}
