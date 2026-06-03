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

    [HttpGet("sales-orders")]
    public async Task<ActionResult<ApiResponse<List<SalesOrderDto>>>> GetSalesOrders([FromQuery] SalesOrderFilterDto filter)
    {
        var page = Math.Max(filter.Page, 1);
        var pageSize = Math.Clamp(filter.PageSize, 1, 200);
        var query = _context.SalesOrders
            .Include(x => x.Items)
                .ThenInclude(x => x.Product)
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var search = filter.Search.Trim().ToLower();
            query = query.Where(x =>
                x.OrderNumber.ToLower().Contains(search) ||
                x.CustomerName.ToLower().Contains(search) ||
                x.Status.ToLower().Contains(search) ||
                (x.Notes != null && x.Notes.ToLower().Contains(search)) ||
                x.Items.Any(item =>
                    (item.Product != null && item.Product.Name.ToLower().Contains(search)) ||
                    (item.Product != null && item.Product.Sku != null && item.Product.Sku.ToLower().Contains(search)) ||
                    (item.Product != null && item.Product.Alias != null && item.Product.Alias.ToLower().Contains(search))));
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

        return Success(rows.Select(MapSalesOrder).ToList(), page, pageSize, total);
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<OutwardOrderDto>>>> GetOrders([FromQuery] OutwardOrderFilterDto filter)
    {
        var page = Math.Max(filter.Page, 1);
        var pageSize = Math.Clamp(filter.PageSize, 1, 200);
        var query = _context.OutwardOrders
            .Include(x => x.SalesOrder)
            .Include(x => x.Product)
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var search = filter.Search.Trim().ToLower();
            query = query.Where(x =>
                (x.SalesOrder != null && x.SalesOrder.OrderNumber.ToLower().Contains(search)) ||
                (x.SalesOrder != null && x.SalesOrder.CustomerName.ToLower().Contains(search)) ||
                x.Status.ToLower().Contains(search) ||
                (x.Product != null && x.Product.Name.ToLower().Contains(search)) ||
                (x.Product != null && x.Product.Sku != null && x.Product.Sku.ToLower().Contains(search)) ||
                (x.Product != null && x.Product.Alias != null && x.Product.Alias.ToLower().Contains(search)));
        }

        if (!string.IsNullOrWhiteSpace(filter.Status) && !string.Equals(filter.Status, "all", StringComparison.OrdinalIgnoreCase))
        {
            var status = filter.Status.Trim().ToLowerInvariant();
            query = query.Where(x => x.Status.ToLower() == status);
        }

        var total = await query.CountAsync();
        var rows = await query
            .OrderByDescending(x => x.SalesOrder != null ? x.SalesOrder.OrderDate : x.CreatedAt)
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

        var requestedItems = BuildRequestedItems(dto);
        if (requestedItems.Count == 0)
            return BadRequest<OutwardOrderDto>("At least one product item is required");

        if (requestedItems.Any(item => item.ProductId <= 0))
            return BadRequest<OutwardOrderDto>("Product is required");

        if (requestedItems.Any(item => item.Quantity <= 0))
            return BadRequest<OutwardOrderDto>("Quantity must be greater than zero");

        var productIds = requestedItems
            .Select(item => item.ProductId)
            .Distinct()
            .ToList();
        var products = await _context.Products
            .Where(x => productIds.Contains(x.Id))
            .ToDictionaryAsync(x => x.Id);
        var missingProductId = productIds.FirstOrDefault(productId => !products.ContainsKey(productId));
        if (missingProductId > 0)
            return BadRequest<OutwardOrderDto>($"Selected product {missingProductId} does not exist");

        var orderNumber = await GenerateOrderNumberAsync();
        var now = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified);
        var normalizedOrderDate = DateTime.SpecifyKind(dto.OrderDate.Date, DateTimeKind.Unspecified);
        var normalizedCustomerName = dto.CustomerName.Trim();
        var normalizedNotes = string.IsNullOrWhiteSpace(dto.Notes) ? null : dto.Notes.Trim();

        var salesOrder = new SalesOrder
        {
            OrderNumber = orderNumber,
            OrderDate = normalizedOrderDate,
            CustomerName = normalizedCustomerName,
            Status = "Open",
            Notes = normalizedNotes,
            CreatedAt = now,
            UpdatedAt = now,
        };

        var orders = requestedItems.Select(item => new OutwardOrder
        {
            SalesOrder = salesOrder,
            ProductId = item.ProductId,
            Quantity = item.Quantity,
            Mrp = item.Mrp ?? products[item.ProductId].Mrp,
            PickedQuantity = 0,
            Status = "Open",
            Notes = normalizedNotes,
            CreatedAt = now,
            UpdatedAt = now,
        }).ToList();

        _context.SalesOrders.Add(salesOrder);
        _context.OutwardOrders.AddRange(orders);
        await _context.SaveChangesAsync();

        var createdOrders = await _context.OutwardOrders
            .Include(x => x.SalesOrder)
            .Include(x => x.Product)
            .Where(x => x.SalesOrderId == salesOrder.Id)
            .OrderBy(x => x.Id)
            .ToListAsync();
        var created = createdOrders.First();
        var response = MapOrder(created);
        var totalQuantity = createdOrders.Sum(order => order.Quantity);

        await SendNotificationAsync(new RealtimeNotificationDto
        {
            Type = "outward.created",
            Title = "Outward order created",
            Message = $"{response.OrderNumber} created for {response.CustomerName} with {createdOrders.Count} item(s).",
            Severity = "info",
            Data = new Dictionary<string, object?>
            {
                ["orderId"] = response.Id,
                ["orderNumber"] = response.OrderNumber,
                ["customerName"] = response.CustomerName,
                ["skuCode"] = response.SkuCode,
                ["quantity"] = totalQuantity,
                ["itemCount"] = createdOrders.Count,
            },
        });

        return Success(response, createdOrders.Count > 1
            ? $"Outward order created successfully with {createdOrders.Count} items"
            : "Outward order created successfully");
    }

    [HttpPost("{id}/pick")]
    public async Task<ActionResult<ApiResponse<OutwardOrderDto>>> PickOrder(int id, [FromBody] UpdateOutwardPickingDto dto)
    {
        var order = await _context.OutwardOrders.Include(x => x.Product).Include(x => x.SalesOrder).FirstOrDefaultAsync(x => x.Id == id);
        if (order == null)
            return NotFound<OutwardOrderDto>("Outward order not found");

        if (order.Status == "Dispatched")
            return BadRequest<OutwardOrderDto>("Dispatched orders cannot be picked");

        if (order.Status == "Canceled" || order.SalesOrder?.Status == "Canceled")
            return BadRequest<OutwardOrderDto>("Canceled orders cannot be picked");

        var requestedPickQty = dto.Quantity <= 0 ? 1 : dto.Quantity;
        var pickQty = Math.Min(requestedPickQty, Math.Max(order.Quantity - order.PickedQuantity, 0));
        var nextPicked = order.PickedQuantity + pickQty;
        if (nextPicked == order.PickedQuantity)
            return BadRequest<OutwardOrderDto>("Order is already fully picked");

        var expectedSku = order.Product?.Sku?.Trim();
        var expectedAlias = order.Product?.Alias?.Trim();
        if (!string.IsNullOrWhiteSpace(dto.SkuCode))
        {
            var scanned = dto.SkuCode.Trim();
            var matchesSku = !string.IsNullOrWhiteSpace(expectedSku) && string.Equals(expectedSku, scanned, StringComparison.OrdinalIgnoreCase);
            var matchesAlias = !string.IsNullOrWhiteSpace(expectedAlias) && string.Equals(expectedAlias, scanned, StringComparison.OrdinalIgnoreCase);
            if (!matchesSku && !matchesAlias)
            {
                return BadRequest<OutwardOrderDto>($"Scanned code {scanned} does not match product SKU ({expectedSku}) or Alias ({expectedAlias})");
            }
        }

        if (dto.Mrp.HasValue && order.Mrp.HasValue && decimal.Round(dto.Mrp.Value, 2) != decimal.Round(order.Mrp.Value, 2))
        {
            return BadRequest<OutwardOrderDto>($"MRP mismatch. Sticker MRP Rs.{dto.Mrp.Value:N2} does not match sales order MRP Rs.{order.Mrp.Value:N2}");
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
        if (order.SalesOrderId > 0)
        {
            await UpdateSalesOrderStatusAsync(order.SalesOrderId);
            await _context.SaveChangesAsync();
        }

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
        var expectedAlias = product.Alias?.Trim();
        if (!string.IsNullOrWhiteSpace(dto.SkuCode))
        {
            var scanned = dto.SkuCode.Trim();
            var matchesSku = !string.IsNullOrWhiteSpace(expectedSku) && string.Equals(expectedSku, scanned, StringComparison.OrdinalIgnoreCase);
            var matchesAlias = !string.IsNullOrWhiteSpace(expectedAlias) && string.Equals(expectedAlias, scanned, StringComparison.OrdinalIgnoreCase);
            if (!matchesSku && !matchesAlias)
            {
                return BadRequest<OutwardOrderDto>($"Scanned code {scanned} does not match product SKU ({expectedSku}) or Alias ({expectedAlias})");
            }
        }

        var resolvedLocationCode = await ResolveLocationCodeAsync(dto.LocationCode.Trim());
        if (string.IsNullOrWhiteSpace(resolvedLocationCode))
            return BadRequest<OutwardOrderDto>($"Scanned location {dto.LocationCode.Trim()} was not found");

        var reduceLocationResult = await ReduceAllocatedLocationAsync(product.Id, resolvedLocationCode, pickQty);
        if (!reduceLocationResult.Success)
            return BadRequest<OutwardOrderDto>(reduceLocationResult.Message!);

        var now = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified);
        var orderNumber = await GenerateDirectOrderNumberAsync();
        var salesOrder = new SalesOrder
        {
            OrderNumber = orderNumber,
            OrderDate = now.Date,
            CustomerName = string.IsNullOrWhiteSpace(dto.CustomerName) ? "Direct Outward" : dto.CustomerName.Trim(),
            Status = "Packed",
            Notes = $"Direct outward pick. Remark: {dto.Remark.Trim()}",
            CreatedAt = now,
            UpdatedAt = now,
        };

        var order = new OutwardOrder
        {
            SalesOrder = salesOrder,
            ProductId = product.Id,
            Product = product,
            Quantity = pickQty,
            Mrp = dto.Mrp ?? product.Mrp,
            PickedQuantity = pickQty,
            Status = "Packed",
            Notes = salesOrder.Notes,
            CreatedAt = now,
            UpdatedAt = now,
        };
        order.CartonId = BuildCartonId(order);

        _context.SalesOrders.Add(salesOrder);
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

    [HttpPost("bulk-direct-pick")]
    public async Task<ActionResult<ApiResponse<List<OutwardOrderDto>>>> BulkDirectPick([FromBody] BulkDirectOutwardPickDto dto)
    {
        if (dto.Items == null || dto.Items.Count == 0)
            return BadRequest<List<OutwardOrderDto>>("At least one item is required");

        if (string.IsNullOrWhiteSpace(dto.Remark))
            return BadRequest<List<OutwardOrderDto>>("Remark is required for direct outward picking");

        var now = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified);
        var orderNumber = await GenerateDirectOrderNumberAsync();
        var salesOrder = new SalesOrder
        {
            OrderNumber = orderNumber,
            OrderDate = now.Date,
            CustomerName = string.IsNullOrWhiteSpace(dto.CustomerName) ? "Direct Outward" : dto.CustomerName.Trim(),
            Status = "Packed",
            Notes = $"Direct outward pick. Remark: {dto.Remark.Trim()}",
            CreatedAt = now,
            UpdatedAt = now,
        };

        var createdOrders = new List<OutwardOrder>();

        // Pre-fetch all products
        var productIds = dto.Items.Select(x => x.ProductId).Distinct().ToList();
        var products = await _context.Products.Where(p => productIds.Contains(p.Id)).ToDictionaryAsync(p => p.Id);

        foreach (var item in dto.Items)
        {
            if (item.ProductId <= 0)
                return BadRequest<List<OutwardOrderDto>>("Product is required for all items");

            var pickQty = item.Quantity <= 0 ? 1 : item.Quantity;

            if (string.IsNullOrWhiteSpace(item.LocationCode))
                return BadRequest<List<OutwardOrderDto>>("Location scan is required for all items");

            if (!products.TryGetValue(item.ProductId, out var product))
                return BadRequest<List<OutwardOrderDto>>($"Selected product ID {item.ProductId} does not exist");

            var expectedSku = product.Sku?.Trim();
            var expectedAlias = product.Alias?.Trim();
            if (!string.IsNullOrWhiteSpace(item.SkuCode))
            {
                var scanned = item.SkuCode.Trim();
                var matchesSku = !string.IsNullOrWhiteSpace(expectedSku) && string.Equals(expectedSku, scanned, StringComparison.OrdinalIgnoreCase);
                var matchesAlias = !string.IsNullOrWhiteSpace(expectedAlias) && string.Equals(expectedAlias, scanned, StringComparison.OrdinalIgnoreCase);
                if (!matchesSku && !matchesAlias)
                {
                    return BadRequest<List<OutwardOrderDto>>($"Scanned code {scanned} does not match product SKU ({expectedSku}) or Alias ({expectedAlias})");
                }
            }

            var resolvedLocationCode = await ResolveLocationCodeAsync(item.LocationCode.Trim());
            if (string.IsNullOrWhiteSpace(resolvedLocationCode))
                return BadRequest<List<OutwardOrderDto>>($"Scanned location {item.LocationCode.Trim()} was not found");

            var reduceLocationResult = await ReduceAllocatedLocationAsync(product.Id, resolvedLocationCode, pickQty);
            if (!reduceLocationResult.Success)
                return BadRequest<List<OutwardOrderDto>>(reduceLocationResult.Message!);

            var order = new OutwardOrder
            {
                SalesOrder = salesOrder,
                ProductId = product.Id,
                Product = product,
                Quantity = pickQty,
                Mrp = item.Mrp ?? product.Mrp,
                PickedQuantity = pickQty,
                Status = "Packed",
                Notes = salesOrder.Notes,
                CreatedAt = now,
                UpdatedAt = now,
            };
            order.CartonId = BuildCartonId(order);
            createdOrders.Add(order);
        }

        _context.SalesOrders.Add(salesOrder);
        _context.OutwardOrders.AddRange(createdOrders);
        await _context.SaveChangesAsync();

        var responses = createdOrders.Select(MapOrder).ToList();
        
        await SendNotificationAsync(new RealtimeNotificationDto
        {
            Type = "outward.bulk-direct-picked",
            Title = "Bulk direct outward picked",
            Message = $"{orderNumber} picked with {createdOrders.Count} items.",
            Severity = "success",
            Data = new Dictionary<string, object?>
            {
                ["orderNumber"] = orderNumber,
                ["itemCount"] = createdOrders.Count,
                ["remark"] = dto.Remark.Trim(),
            },
        });

        return Success(responses, $"Direct outward picked successfully with {createdOrders.Count} items");
    }

    [HttpPost("{id}/dispatch")]
    public async Task<ActionResult<ApiResponse<OutwardOrderDto>>> DispatchOrder(int id, [FromBody] DispatchOutwardOrderDto dto)
    {
        var order = await _context.OutwardOrders.Include(x => x.Product).Include(x => x.SalesOrder).FirstOrDefaultAsync(x => x.Id == id);
        if (order == null)
            return NotFound<OutwardOrderDto>("Outward order not found");

        if (order.Status == "Canceled" || order.SalesOrder?.Status == "Canceled")
            return BadRequest<OutwardOrderDto>("Canceled orders cannot be dispatched");

        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        int? performedByUserId = int.TryParse(userIdClaim, out var parsedUserId) ? parsedUserId : null;
        var performedByName = User.FindFirstValue(ClaimTypes.GivenName)
            ?? User.Identity?.Name
            ?? "System User";

        var dispatchResult = await DispatchOrderInternalAsync(order, dto.CartonId, performedByUserId, performedByName);
        if (!dispatchResult.Success)
            return BadRequest<OutwardOrderDto>(dispatchResult.Message!);

        await _context.SaveChangesAsync();
        if (order.SalesOrderId > 0)
        {
            await UpdateSalesOrderStatusAsync(order.SalesOrderId);
            await _context.SaveChangesAsync();
        }

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

    [HttpPost("sales-orders/{salesOrderId}/dispatch")]
    public async Task<ActionResult<ApiResponse<DispatchSalesOrderResultDto>>> DispatchSalesOrder(int salesOrderId)
    {
        var salesOrder = await _context.SalesOrders.AsNoTracking().FirstOrDefaultAsync(x => x.Id == salesOrderId);
        if (salesOrder == null)
            return NotFound<DispatchSalesOrderResultDto>("Sales order not found");

        if (salesOrder.Status == "Canceled")
            return BadRequest<DispatchSalesOrderResultDto>("Canceled sales order cannot be dispatched");

        var orders = await _context.OutwardOrders
            .Include(x => x.Product)
            .Include(x => x.SalesOrder)
            .Where(x => x.SalesOrderId == salesOrderId)
            .OrderBy(x => x.Id)
            .ToListAsync();

        if (orders.Count == 0)
            return NotFound<DispatchSalesOrderResultDto>("Sales order items not found");

        var pendingOrders = orders.Where(x => x.Status != "Dispatched").ToList();
        if (pendingOrders.Count == 0)
            return BadRequest<DispatchSalesOrderResultDto>("Sales order is already fully dispatched");

        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        int? performedByUserId = int.TryParse(userIdClaim, out var parsedUserId) ? parsedUserId : null;
        var performedByName = User.FindFirstValue(ClaimTypes.GivenName)
            ?? User.Identity?.Name
            ?? "System User";

        foreach (var order in pendingOrders)
        {
            var dispatchResult = await DispatchOrderInternalAsync(order, null, performedByUserId, performedByName);
            if (!dispatchResult.Success)
                return BadRequest<DispatchSalesOrderResultDto>(dispatchResult.Message!);
        }

        await _context.SaveChangesAsync();
        await UpdateSalesOrderStatusAsync(salesOrderId);
        await _context.SaveChangesAsync();

        var response = new DispatchSalesOrderResultDto
        {
            SalesOrderId = salesOrderId,
            OrderNumber = salesOrder.OrderNumber,
            DispatchedItemCount = pendingOrders.Count,
            Items = pendingOrders.Select(MapOrder).ToList(),
        };

        return Success(response, pendingOrders.Count > 1
            ? $"Sales order {salesOrder.OrderNumber} dispatched successfully"
            : "Sales order dispatched successfully");
    }

    [HttpPost("sales-orders/{salesOrderId}/cancel")]
    public async Task<ActionResult<ApiResponse<SalesOrderDto>>> CancelSalesOrder(int salesOrderId, [FromBody] CancelSalesOrderDto dto)
    {
        var salesOrder = await _context.SalesOrders
            .Include(x => x.Items)
                .ThenInclude(x => x.Product)
            .FirstOrDefaultAsync(x => x.Id == salesOrderId);

        if (salesOrder == null)
            return NotFound<SalesOrderDto>("Sales order not found");

        if (salesOrder.Status == "Canceled")
            return BadRequest<SalesOrderDto>("Sales order is already canceled");

        if (string.IsNullOrWhiteSpace(dto.Remark))
            return BadRequest<SalesOrderDto>("Cancel remark is required");

        if (salesOrder.Items.Any(item => item.PickedQuantity > 0 || item.Status != "Open"))
            return BadRequest<SalesOrderDto>("Cannot cancel sales order after picking, packing, or dispatch has started");

        salesOrder.Status = "Canceled";
        salesOrder.CancelRemark = dto.Remark.Trim();
        salesOrder.UpdatedAt = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified);
        salesOrder.DispatchedAt = null;

        foreach (var item in salesOrder.Items)
        {
            item.Status = "Canceled";
            item.Notes = string.IsNullOrWhiteSpace(item.Notes)
                ? $"Canceled: {dto.Remark.Trim()}"
                : $"{item.Notes} | Canceled: {dto.Remark.Trim()}";
            item.UpdatedAt = salesOrder.UpdatedAt;
        }

        await _context.SaveChangesAsync();

        return Success(MapSalesOrder(salesOrder), $"Sales order {salesOrder.OrderNumber} canceled successfully");
    }

    private async Task<string> GenerateOrderNumberAsync()
    {
        var prefix = $"SO-{DateTime.Now:yyMMdd}";
        var lastOrder = await _context.SalesOrders
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
        var lastOrder = await _context.SalesOrders
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
        var orderNumber = order.SalesOrder?.OrderNumber ?? $"ORD-{order.Id}";
        return $"CTN-{orderNumber.Replace("SO-", string.Empty).Replace("DO-", string.Empty)}";
    }

    private async Task<(bool Success, string? Message)> DispatchOrderInternalAsync(
        OutwardOrder order,
        string? cartonIdOverride,
        int? performedByUserId,
        string performedByName)
    {
        if (order.Status == "Dispatched")
            return (false, $"Order {order.SalesOrder?.OrderNumber ?? order.Id.ToString()} is already dispatched");

        if (order.Status == "Canceled" || order.SalesOrder?.Status == "Canceled")
            return (false, $"Order {order.SalesOrder?.OrderNumber ?? order.Id.ToString()} is canceled");

        if (order.PickedQuantity < order.Quantity)
            return (false, $"Order {order.SalesOrder?.OrderNumber ?? order.Id.ToString()} must be fully picked before dispatch");

        var quantityRow = await _context.ProductQuantities.FirstOrDefaultAsync(x => x.ProductId == order.ProductId);
        if (quantityRow == null)
            return (false, $"Stock quantity row is missing for {order.Product?.Name ?? order.SalesOrder?.OrderNumber ?? order.Id.ToString()}");

        var currentQuantity = quantityRow.CurrentQuantity;
        if (currentQuantity < order.Quantity)
            return (false, $"Only {currentQuantity} units are available in stock for {order.Product?.Name ?? order.SalesOrder?.OrderNumber ?? order.Id.ToString()}");

        quantityRow.CurrentQuantity -= order.Quantity;
        quantityRow.UpdatedAt = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified);

        var movement = new ProductStockMovement
        {
            ProductId = order.ProductId,
            QuantityChange = -order.Quantity,
            QuantityBefore = currentQuantity,
            QuantityAfter = quantityRow.CurrentQuantity,
            Reason = "Outward Dispatch",
            MovementType = "dispatch",
            Notes = $"Outward order {order.SalesOrder?.OrderNumber ?? order.Id.ToString()} dispatched",
            PerformedByUserId = performedByUserId,
            PerformedByName = performedByName,
            CreatedAt = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified),
        };

        _context.ProductStockMovements.Add(movement);

        order.Status = "Dispatched";
        order.CartonId = string.IsNullOrWhiteSpace(cartonIdOverride)
            ? (order.CartonId ?? BuildCartonId(order))
            : cartonIdOverride.Trim();
        order.DispatchedAt = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified);
        order.UpdatedAt = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified);

        return (true, null);
    }

    private async Task UpdateSalesOrderStatusAsync(int salesOrderId)
    {
        var header = await _context.SalesOrders.FirstOrDefaultAsync(x => x.Id == salesOrderId);
        if (header == null)
            return;

        var items = await _context.OutwardOrders
            .AsNoTracking()
            .Where(x => x.SalesOrderId == salesOrderId)
            .Select(x => new { x.Status, x.Quantity, x.PickedQuantity })
            .ToListAsync();

        if (items.Count == 0)
            return;

        if (items.All(item => item.Status == "Canceled"))
        {
            header.Status = "Canceled";
            header.DispatchedAt = null;
            header.UpdatedAt = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified);
            _context.SalesOrders.Update(header);
            return;
        }

        if (items.All(item => item.Status == "Dispatched"))
        {
            header.Status = "Dispatched";
            header.DispatchedAt = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified);
        }
        else if (items.All(item => item.Status == "Packed" || item.PickedQuantity >= item.Quantity))
        {
            header.Status = "Packed";
            header.DispatchedAt = null;
        }
        else if (items.Any(item => item.Status == "Picking" || item.PickedQuantity > 0))
        {
            header.Status = "Picking";
            header.DispatchedAt = null;
        }
        else
        {
            header.Status = "Open";
            header.DispatchedAt = null;
        }

        header.UpdatedAt = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified);
        _context.SalesOrders.Update(header);
    }

    private static OutwardOrderDto MapOrder(OutwardOrder row)
    {
        var salesOrder = row.SalesOrder;
        return new OutwardOrderDto
        {
            Id = row.Id,
            OrderNumber = salesOrder?.OrderNumber ?? string.Empty,
            SalesOrderId = row.SalesOrderId,
            SalesOrderStatus = salesOrder?.Status ?? row.Status,
            SalesOrderNotes = salesOrder?.Notes,
            SalesOrderCreatedAt = salesOrder?.CreatedAt ?? row.CreatedAt,
            SalesOrderUpdatedAt = salesOrder?.UpdatedAt ?? row.UpdatedAt,
            SalesOrderDispatchedAt = salesOrder?.DispatchedAt,
            OrderDate = salesOrder?.OrderDate ?? row.CreatedAt,
            CustomerName = salesOrder?.CustomerName ?? string.Empty,
            ProductId = row.ProductId,
            SkuCode = row.Product?.Sku ?? string.Empty,
            ProductName = row.Product?.Name ?? string.Empty,
            Alias = row.Product?.Alias,
            Quantity = row.Quantity,
            Mrp = row.Mrp,
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

    private static SalesOrderDto MapSalesOrder(SalesOrder row)
    {
        var items = row.Items
            .OrderBy(x => x.Id)
            .Select(MapOrder)
            .ToList();

        return new SalesOrderDto
        {
            Id = row.Id,
            OrderNumber = row.OrderNumber,
            OrderDate = row.OrderDate,
            CustomerName = row.CustomerName,
            Status = row.Status,
            Notes = row.Notes,
            CancelRemark = row.CancelRemark,
            ItemCount = items.Count,
            TotalQuantity = items.Sum(x => x.Quantity),
            TotalPickedQuantity = items.Sum(x => x.PickedQuantity),
            PendingQuantity = items.Sum(x => x.PendingQuantity),
            CreatedAt = row.CreatedAt,
            UpdatedAt = row.UpdatedAt,
            DispatchedAt = row.DispatchedAt,
            Items = items,
        };
    }

    private Task SendNotificationAsync(RealtimeNotificationDto notification)
    {
        return _notificationHub.Clients.All.SendAsync("ReceiveNotification", notification);
    }

    private static List<CreateOutwardOrderItemDto> BuildRequestedItems(CreateOutwardOrderDto dto)
    {
        if (dto.Items != null && dto.Items.Count > 0)
        {
            return dto.Items;
        }

        if (dto.ProductId.HasValue && dto.Quantity.HasValue)
        {
            return
            [
                new CreateOutwardOrderItemDto
                {
                    ProductId = dto.ProductId.Value,
                    Quantity = dto.Quantity.Value,
                },
            ];
        }

        return [];
    }
}
