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

public class OutwardOrdersController : BaseController
{
    private readonly PlusgrowDbContext _context;
    private readonly IHubContext<NotificationHub> _notificationHub;

    public OutwardOrdersController(PlusgrowDbContext context, IHubContext<NotificationHub> notificationHub)
    {
        _context = context;
        _notificationHub = notificationHub;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<OutwardOrderDto>>>> GetOrders([FromQuery] OutwardOrderFilterDto filter)
    {
        var page = Math.Max(filter.Page, 1);
        var pageSize = Math.Clamp(filter.PageSize, 1, 200);
        var query = _context.OutwardOrders
            .Include(x => x.Product)
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var search = filter.Search.Trim().ToLower();
            query = query.Where(x =>
                x.OrderNumber.ToLower().Contains(search) ||
                x.CustomerName.ToLower().Contains(search) ||
                x.Status.ToLower().Contains(search) ||
                (x.Product != null && x.Product.Name.ToLower().Contains(search)) ||
                (x.Product != null && x.Product.Sku != null && x.Product.Sku.ToLower().Contains(search)));
        }

        if (!string.IsNullOrWhiteSpace(filter.Status) && !string.Equals(filter.Status, "all", StringComparison.OrdinalIgnoreCase))
        {
            var status = filter.Status.Trim().ToLowerInvariant();
            query = query.Where(x => x.Status.ToLower() == status);
        }

        var total = await query.CountAsync();
        var rows = await query
            .OrderByDescending(x => x.OrderDate)
            .ThenByDescending(x => x.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Success(rows.Select(MapOrder).ToList(), page, pageSize, total);
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<OutwardOrderDto>>> CreateOrder([FromBody] CreateOutwardOrderDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.CustomerName))
            return BadRequest<OutwardOrderDto>("Customer name is required");

        if (dto.ProductId <= 0)
            return BadRequest<OutwardOrderDto>("Product is required");

        if (dto.Quantity <= 0)
            return BadRequest<OutwardOrderDto>("Quantity must be greater than zero");

        var product = await _context.Products.FirstOrDefaultAsync(x => x.Id == dto.ProductId);
        if (product == null)
            return BadRequest<OutwardOrderDto>("Selected product does not exist");

        var order = new OutwardOrder
        {
            OrderNumber = await GenerateOrderNumberAsync(),
            OrderDate = DateTime.SpecifyKind(dto.OrderDate.Date, DateTimeKind.Unspecified),
            CustomerName = dto.CustomerName.Trim(),
            ProductId = dto.ProductId,
            Quantity = dto.Quantity,
            PickedQuantity = 0,
            Status = "Open",
            Notes = string.IsNullOrWhiteSpace(dto.Notes) ? null : dto.Notes.Trim(),
            CreatedAt = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified),
            UpdatedAt = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified),
        };

        _context.OutwardOrders.Add(order);
        await _context.SaveChangesAsync();

        var created = await _context.OutwardOrders.Include(x => x.Product).FirstAsync(x => x.Id == order.Id);
        var response = MapOrder(created);

        await SendNotificationAsync(new RealtimeNotificationDto
        {
            Type = "outward.created",
            Title = "Outward order created",
            Message = $"{response.OrderNumber} created for {response.CustomerName}.",
            Severity = "info",
            Data = new Dictionary<string, object?>
            {
                ["orderId"] = response.Id,
                ["orderNumber"] = response.OrderNumber,
                ["customerName"] = response.CustomerName,
                ["skuCode"] = response.SkuCode,
                ["quantity"] = response.Quantity,
            },
        });

        return Success(response, "Outward order created successfully");
    }

    [HttpPost("{id}/pick")]
    public async Task<ActionResult<ApiResponse<OutwardOrderDto>>> PickOrder(int id, [FromBody] UpdateOutwardPickingDto dto)
    {
        var order = await _context.OutwardOrders.Include(x => x.Product).FirstOrDefaultAsync(x => x.Id == id);
        if (order == null)
            return NotFound<OutwardOrderDto>("Outward order not found");

        if (order.Status == "Dispatched")
            return BadRequest<OutwardOrderDto>("Dispatched orders cannot be picked");

        var pickQty = dto.Quantity <= 0 ? 1 : dto.Quantity;
        var nextPicked = Math.Min(order.Quantity, order.PickedQuantity + pickQty);
        if (nextPicked == order.PickedQuantity)
            return BadRequest<OutwardOrderDto>("Order is already fully picked");

        var expectedSku = order.Product?.Sku?.Trim();
        if (!string.IsNullOrWhiteSpace(expectedSku) && !string.IsNullOrWhiteSpace(dto.SkuCode))
        {
            if (!string.Equals(expectedSku, dto.SkuCode.Trim(), StringComparison.OrdinalIgnoreCase))
                return BadRequest<OutwardOrderDto>($"Scanned SKU {dto.SkuCode.Trim()} does not match {expectedSku}");
        }

        if (string.IsNullOrWhiteSpace(dto.LocationCode))
            return BadRequest<OutwardOrderDto>("Location scan is required");

        var resolvedLocationCode = await ResolveLocationCodeAsync(dto.LocationCode.Trim());
        if (string.IsNullOrWhiteSpace(resolvedLocationCode))
            return BadRequest<OutwardOrderDto>($"Scanned location {dto.LocationCode.Trim()} was not found");

        var reduceLocationResult = await ReduceAllocatedLocationAsync(order.ProductId, resolvedLocationCode, pickQty);
        if (!reduceLocationResult.Success)
            return BadRequest<OutwardOrderDto>(reduceLocationResult.Message!);

        order.PickedQuantity = nextPicked;
        order.Status = order.PickedQuantity >= order.Quantity ? "Packed" : "Picking";
        order.UpdatedAt = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified);
        order.CartonId ??= BuildCartonId(order);

        await _context.SaveChangesAsync();
        var response = MapOrder(order);

        if (order.Status == "Packed")
        {
            await SendNotificationAsync(new RealtimeNotificationDto
            {
                Type = "outward.packed",
                Title = "Order packed",
                Message = $"{response.OrderNumber} is ready for dispatch.",
                Severity = "success",
                Data = new Dictionary<string, object?>
                {
                    ["orderId"] = response.Id,
                    ["orderNumber"] = response.OrderNumber,
                    ["customerName"] = response.CustomerName,
                    ["locationCode"] = resolvedLocationCode,
                },
            });
        }

        return Success(response, "Picking progress updated successfully");
    }

    [HttpPost("direct-pick")]
    public async Task<ActionResult<ApiResponse<OutwardOrderDto>>> DirectPick([FromBody] DirectOutwardPickDto dto)
    {
        if (dto.ProductId <= 0)
            return BadRequest<OutwardOrderDto>("Product is required");

        var pickQty = dto.Quantity <= 0 ? 1 : dto.Quantity;

        if (string.IsNullOrWhiteSpace(dto.LocationCode))
            return BadRequest<OutwardOrderDto>("Location scan is required");

        if (string.IsNullOrWhiteSpace(dto.Remark))
            return BadRequest<OutwardOrderDto>("Remark is required for direct outward picking");

        var product = await _context.Products.FirstOrDefaultAsync(x => x.Id == dto.ProductId);
        if (product == null)
            return BadRequest<OutwardOrderDto>("Selected product does not exist");

        var expectedSku = product.Sku?.Trim();
        if (!string.IsNullOrWhiteSpace(expectedSku) && !string.IsNullOrWhiteSpace(dto.SkuCode))
        {
            if (!string.Equals(expectedSku, dto.SkuCode.Trim(), StringComparison.OrdinalIgnoreCase))
                return BadRequest<OutwardOrderDto>($"Scanned SKU {dto.SkuCode.Trim()} does not match {expectedSku}");
        }

        var resolvedLocationCode = await ResolveLocationCodeAsync(dto.LocationCode.Trim());
        if (string.IsNullOrWhiteSpace(resolvedLocationCode))
            return BadRequest<OutwardOrderDto>($"Scanned location {dto.LocationCode.Trim()} was not found");

        var reduceLocationResult = await ReduceAllocatedLocationAsync(product.Id, resolvedLocationCode, pickQty);
        if (!reduceLocationResult.Success)
            return BadRequest<OutwardOrderDto>(reduceLocationResult.Message!);

        var now = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified);
        var order = new OutwardOrder
        {
            OrderNumber = await GenerateDirectOrderNumberAsync(),
            OrderDate = now.Date,
            CustomerName = string.IsNullOrWhiteSpace(dto.CustomerName) ? "Direct Outward" : dto.CustomerName.Trim(),
            ProductId = product.Id,
            Product = product,
            Quantity = pickQty,
            PickedQuantity = pickQty,
            Status = "Packed",
            Notes = $"Direct outward pick. Remark: {dto.Remark.Trim()}",
            CreatedAt = now,
            UpdatedAt = now,
        };
        order.CartonId = BuildCartonId(order);

        _context.OutwardOrders.Add(order);
        await _context.SaveChangesAsync();

        var response = MapOrder(order);
        await SendNotificationAsync(new RealtimeNotificationDto
        {
            Type = "outward.direct-picked",
            Title = "Direct outward picked",
            Message = $"{response.OrderNumber} picked without sales order and is ready for packing.",
            Severity = "success",
            Data = new Dictionary<string, object?>
            {
                ["orderId"] = response.Id,
                ["orderNumber"] = response.OrderNumber,
                ["skuCode"] = response.SkuCode,
                ["quantity"] = response.Quantity,
                ["locationCode"] = resolvedLocationCode,
                ["remark"] = dto.Remark.Trim(),
            },
        });

        return Success(response, "Direct outward picked successfully and moved to packing");
    }

    [HttpPost("{id}/dispatch")]
    public async Task<ActionResult<ApiResponse<OutwardOrderDto>>> DispatchOrder(int id, [FromBody] DispatchOutwardOrderDto dto)
    {
        var order = await _context.OutwardOrders.Include(x => x.Product).FirstOrDefaultAsync(x => x.Id == id);
        if (order == null)
            return NotFound<OutwardOrderDto>("Outward order not found");

        if (order.Status == "Dispatched")
            return BadRequest<OutwardOrderDto>("Order is already dispatched");

        if (order.PickedQuantity < order.Quantity)
            return BadRequest<OutwardOrderDto>("Order must be fully picked before dispatch");

        var quantityRow = await _context.ProductQuantities.FirstOrDefaultAsync(x => x.ProductId == order.ProductId);
        var currentQuantity = quantityRow?.CurrentQuantity ?? 0;
        if (currentQuantity < order.Quantity)
            return BadRequest<OutwardOrderDto>($"Only {currentQuantity} units are available in stock");

        if (quantityRow == null)
            return BadRequest<OutwardOrderDto>("Product quantity row does not exist");

        quantityRow.CurrentQuantity -= order.Quantity;
        quantityRow.UpdatedAt = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified);

        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        int? performedByUserId = int.TryParse(userIdClaim, out var parsedUserId) ? parsedUserId : null;
        var performedByName = User.FindFirstValue(ClaimTypes.GivenName)
            ?? User.Identity?.Name
            ?? "System User";

        var movement = new ProductStockMovement
        {
            ProductId = order.ProductId,
            QuantityChange = -order.Quantity,
            QuantityBefore = currentQuantity,
            QuantityAfter = quantityRow.CurrentQuantity,
            Reason = "Outward Dispatch",
            MovementType = "dispatch",
            Notes = $"Outward order {order.OrderNumber} dispatched",
            PerformedByUserId = performedByUserId,
            PerformedByName = performedByName,
            CreatedAt = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified),
        };

        _context.ProductStockMovements.Add(movement);

        order.Status = "Dispatched";
        order.CartonId = string.IsNullOrWhiteSpace(dto.CartonId) ? (order.CartonId ?? BuildCartonId(order)) : dto.CartonId.Trim();
        order.DispatchedAt = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified);
        order.UpdatedAt = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified);

        await _context.SaveChangesAsync();
        var response = MapOrder(order);

        await SendNotificationAsync(new RealtimeNotificationDto
        {
            Type = "outward.dispatched",
            Title = "Order dispatched",
            Message = $"{response.OrderNumber} dispatched for {response.CustomerName}.",
            Severity = "success",
            Data = new Dictionary<string, object?>
            {
                ["orderId"] = response.Id,
                ["orderNumber"] = response.OrderNumber,
                ["customerName"] = response.CustomerName,
                ["skuCode"] = response.SkuCode,
                ["quantity"] = response.Quantity,
                ["cartonId"] = response.CartonId,
            },
        });

        return Success(response, "Order dispatched successfully");
    }

    private async Task<string> GenerateOrderNumberAsync()
    {
        var prefix = $"SO-{DateTime.Now:yyMMdd}";
        var lastOrder = await _context.OutwardOrders
            .Where(x => x.OrderNumber.StartsWith(prefix))
            .OrderByDescending(x => x.OrderNumber)
            .FirstOrDefaultAsync();

        var nextSequence = 1;
        if (lastOrder != null)
        {
            var suffix = lastOrder.OrderNumber.Split('-').LastOrDefault();
            if (int.TryParse(suffix, out var parsed))
                nextSequence = parsed + 1;
        }

        return $"{prefix}-{nextSequence:000}";
    }

    private async Task<string> GenerateDirectOrderNumberAsync()
    {
        var prefix = $"DO-{DateTime.Now:yyMMdd}";
        var lastOrder = await _context.OutwardOrders
            .Where(x => x.OrderNumber.StartsWith(prefix))
            .OrderByDescending(x => x.OrderNumber)
            .FirstOrDefaultAsync();

        var nextSequence = 1;
        if (lastOrder != null)
        {
            var suffix = lastOrder.OrderNumber.Split('-').LastOrDefault();
            if (int.TryParse(suffix, out var parsed))
                nextSequence = parsed + 1;
        }

        return $"{prefix}-{nextSequence:000}";
    }

    private async Task<string?> ResolveLocationCodeAsync(string scannedLocationCode)
    {
        var normalized = scannedLocationCode.Trim();

        var directLocation = await _context.Locations
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.LocationCode.ToLower() == normalized.ToLower());

        if (directLocation != null)
            return directLocation.LocationCode;

        var binLocation = await _context.Locations
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Bins.Any(bin => bin.ToLower() == normalized.ToLower()));

        return binLocation?.LocationCode;
    }

    private async Task<(bool Success, string? Message)> ReduceAllocatedLocationAsync(int productId, string resolvedLocationCode, int quantity)
    {
        var row = await _context.ProductAllottedLocations.FirstOrDefaultAsync(x => x.ProductId == productId);
        if (row == null || row.LocationJson == null || row.LocationJson.Count == 0)
            return (false, "No allotted location stock found for this product");

        var matchingKey = row.LocationJson.Keys.FirstOrDefault(key =>
            string.Equals(key, resolvedLocationCode, StringComparison.OrdinalIgnoreCase));

        if (matchingKey == null)
            return (false, $"Scanned location {resolvedLocationCode} is not allotted for this SKU");

        var available = row.LocationJson[matchingKey];
        if (available < quantity)
            return (false, $"Only {available} units are available in {matchingKey}");

        var nextQty = available - quantity;
        if (nextQty <= 0)
            row.LocationJson.Remove(matchingKey);
        else
            row.LocationJson[matchingKey] = nextQty;

        row.UpdatedAt = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified);
        _context.Entry(row).Property(x => x.LocationJson).IsModified = true;
        return (true, null);
    }

    private static string BuildCartonId(OutwardOrder order)
    {
        return $"CTN-{order.OrderNumber.Replace("SO-", string.Empty)}";
    }

    private static OutwardOrderDto MapOrder(OutwardOrder row)
    {
        return new OutwardOrderDto
        {
            Id = row.Id,
            OrderNumber = row.OrderNumber,
            OrderDate = row.OrderDate,
            CustomerName = row.CustomerName,
            ProductId = row.ProductId,
            SkuCode = row.Product?.Sku ?? string.Empty,
            ProductName = row.Product?.Name ?? string.Empty,
            Quantity = row.Quantity,
            PickedQuantity = row.PickedQuantity,
            PendingQuantity = Math.Max(row.Quantity - row.PickedQuantity, 0),
            Status = row.Status,
            CartonId = row.CartonId,
            Notes = row.Notes,
            CreatedAt = row.CreatedAt,
            UpdatedAt = row.UpdatedAt,
            DispatchedAt = row.DispatchedAt,
        };
    }

    private Task SendNotificationAsync(RealtimeNotificationDto notification)
    {
        return _notificationHub.Clients.All.SendAsync("ReceiveNotification", notification);
    }
}
