using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PlusgrowWms.Api.Data;
using PlusgrowWms.Api.DTOs;
using PlusgrowWms.Api.Helpers;
using PlusgrowWms.Api.Models;

namespace PlusgrowWms.Api.Controllers;

/// <summary>
/// Product-scoped, server-side paginated history endpoints used by the
/// Stock Verify / Product Query screens. Each endpoint returns a single page
/// of records for one product together with the total count so the client can
/// page through the complete data set (50 at a time by default).
/// </summary>
public class ProductHistoryController : BaseController
{
    private const int DefaultPageSize = 50;
    private const int MaxPageSize = 200;

    private readonly PlusgrowDbContext _context;

    public ProductHistoryController(PlusgrowDbContext context)
    {
        _context = context;
    }

    /// <summary>Stock movements for a product (newest first).</summary>
    [HttpGet("{productId:int}/movements")]
    public async Task<ActionResult<ApiResponse<List<ProductStockMovementDto>>>> GetMovements(
        int productId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = DefaultPageSize)
    {
        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, MaxPageSize);

        var query = _context.ProductStockMovements
            .Include(x => x.Product)
            .AsNoTracking()
            .Where(x => x.ProductId == productId);

        var total = await query.CountAsync();
        var rows = await query
            .OrderByDescending(x => x.CreatedAt)
            .ThenByDescending(x => x.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var result = rows.Select(x => new ProductStockMovementDto
        {
            Id = x.Id,
            ProductId = x.ProductId,
            SkuCode = x.Product?.Sku ?? string.Empty,
            ProductName = x.Product?.Name ?? string.Empty,
            QuantityChange = x.QuantityChange,
            QuantityBefore = x.QuantityBefore,
            QuantityAfter = x.QuantityAfter,
            Reason = x.Reason,
            MovementType = x.MovementType,
            Notes = x.Notes,
            PerformedByUserId = x.PerformedByUserId,
            PerformedByName = x.PerformedByName,
            CreatedAt = x.CreatedAt,
        }).ToList();

        return Success(result, page, pageSize, total);
    }

    /// <summary>Purchase (PO) invoice lines for a product (newest first).</summary>
    [HttpGet("{productId:int}/invoices")]
    public async Task<ActionResult<ApiResponse<List<PoInvoiceDto>>>> GetInvoices(
        int productId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = DefaultPageSize)
    {
        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, MaxPageSize);

        var query = _context.PoInvoices
            .Include(x => x.Header)
            .Include(x => x.Product)
            .AsNoTracking()
            .Where(x => x.ProductId == productId);

        var total = await query.CountAsync();
        var rows = await query
            .OrderByDescending(x => x.Header!.InvoiceDate)
            .ThenByDescending(x => x.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var result = rows.Select(invoice => new PoInvoiceDto
        {
            Id = invoice.Id,
            InvoiceNumber = invoice.Header?.InvoiceNumber ?? string.Empty,
            InvoiceDate = invoice.Header?.InvoiceDate ?? default,
            PartyName = invoice.Header?.PartyName ?? string.Empty,
            ProductId = invoice.ProductId,
            SkuCode = invoice.Product?.Sku ?? string.Empty,
            ProductName = invoice.Product?.Name ?? string.Empty,
            Mrp = invoice.Mrp ?? invoice.Product?.Mrp,
            BilledQty = invoice.BilledQty,
            VerifiedQuantity = invoice.VerifiedQuantity,
            Printed = invoice.Printed,
            RemainingAllocation = invoice.RemainingAllocation,
            LocationAllotted = invoice.LocationAllotted,
            CreatedAt = invoice.CreatedAt,
            CancelRemark = invoice.Header?.CancelRemark,
        }).ToList();

        return Success(result, page, pageSize, total);
    }

    /// <summary>Sales order lines that contain a product (newest first).</summary>
    [HttpGet("{productId:int}/sales-orders")]
    public async Task<ActionResult<ApiResponse<List<OutwardOrderDto>>>> GetSalesOrders(
        int productId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = DefaultPageSize)
    {
        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, MaxPageSize);

        var query = _context.OutwardOrders
            .Include(x => x.SalesOrder)
            .Include(x => x.Product)
            .AsNoTracking()
            .Where(x => x.ProductId == productId);

        var total = await query.CountAsync();
        var rows = await query
            .OrderByDescending(x => x.SalesOrder != null ? x.SalesOrder.OrderDate : x.CreatedAt)
            .ThenByDescending(x => x.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var result = rows.Select(row =>
        {
            var salesOrder = row.SalesOrder;
            return new OutwardOrderDto
            {
                Id = row.Id,
                OrderNumber = salesOrder?.OrderNumber ?? string.Empty,
                ReferenceNumber = salesOrder?.ReferenceNumber,
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
                Ownership = row.Product?.Ownership,
                Alias = row.Product?.Alias,
                CartonQr = row.Product?.CartonQr,
                CartonPerItem = row.Product?.CartonPerItem,
                Quantity = row.Quantity,
                Mrp = row.Mrp,
                PickedQuantity = row.PickedQuantity,
                PackedQuantity = row.PackedQuantity,
                PendingQuantity = Math.Max(row.Quantity - row.PickedQuantity, 0),
                Status = row.Status,
                Notes = row.Notes,
                CreatedAt = row.CreatedAt,
                UpdatedAt = row.UpdatedAt,
                DispatchedAt = row.DispatchedAt,
                PickedAt = row.PickedAt,
                PackedAt = row.PackedAt,
                TrackingNumber = salesOrder?.TrackingNumber,
            };
        }).ToList();

        return Success(result, page, pageSize, total);
    }
}
