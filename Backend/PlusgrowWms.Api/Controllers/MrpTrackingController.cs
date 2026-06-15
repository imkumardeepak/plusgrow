using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PlusgrowWms.Api.Data;
using PlusgrowWms.Api.Models;
using PlusgrowWms.Api.Helpers;
using PlusgrowWms.Api.DTOs;

namespace PlusgrowWms.Api.Controllers;

[ApiController]
[Route("api/mrp-tracking")]
public class MrpTrackingController : BaseController
{
    private readonly PlusgrowDbContext _context;

    public MrpTrackingController(PlusgrowDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<MrpTrackingResultDto>>>> GetMrpTrackingReport([FromQuery] string? search)
    {
        var query = _context.PoInvoiceLocations
            .Include(x => x.PoInvoice)
            .ThenInclude(i => i!.Header)
            .Include(x => x.PoInvoice!.Product)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.ToLower();
            query = query.Where(x => 
                (x.PoInvoice!.Product!.Name != null && x.PoInvoice.Product.Name.ToLower().Contains(s)) ||
                (x.PoInvoice!.Product!.Sku != null && x.PoInvoice.Product.Sku.ToLower().Contains(s)) ||
                (x.PoInvoice!.Header!.InvoiceNumber != null && x.PoInvoice.Header.InvoiceNumber.ToLower().Contains(s))
            );
        }

        var results = await query
            .OrderByDescending(x => x.PoInvoice!.Header!.InvoiceDate)
            .ThenBy(x => x.PoInvoiceId)
            .Select(x => new MrpTrackingResultDto
            {
                Id = x.Id,
                PoInvoiceId = x.PoInvoiceId,
                ProductId = x.PoInvoice!.ProductId,
                ProductName = x.PoInvoice.Product!.Name,
                Sku = x.PoInvoice.Product.Sku,
                InvoiceNumber = x.PoInvoice.Header!.InvoiceNumber,
                InvoiceDate = x.PoInvoice.Header.InvoiceDate,
                Mrp = x.PoInvoice.Mrp,
                LocationCode = x.LocationCode,
                Quantity = x.Quantity
            })
            .ToListAsync();

        return Success(results);
    }

    [HttpGet("summary")]
    public async Task<ActionResult<ApiResponse<List<MrpWiseStockSummaryDto>>>> GetMrpWiseStockSummary([FromQuery] string? search)
    {
        var query = _context.PoInvoiceLocations
            .Include(x => x.PoInvoice)
                .ThenInclude(i => i!.Product)
            .Include(x => x.PoInvoice)
                .ThenInclude(i => i!.Header)
            .Where(x => x.Quantity > 0)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.ToLower();
            query = query.Where(x =>
                (x.PoInvoice!.Product!.Name != null && x.PoInvoice.Product.Name.ToLower().Contains(s)) ||
                (x.PoInvoice!.Product!.Sku != null && x.PoInvoice.Product.Sku.ToLower().Contains(s)) ||
                (x.PoInvoice!.Header!.InvoiceNumber != null && x.PoInvoice.Header.InvoiceNumber.ToLower().Contains(s)));
        }

        var results = await query
            .GroupBy(x => new
            {
                x.PoInvoice!.ProductId,
                x.PoInvoice.Product!.Name,
                x.PoInvoice.Product.Sku,
                x.PoInvoice.Header!.InvoiceNumber,
                x.PoInvoice.Header.InvoiceDate,
                x.PoInvoice.Header.PartyName,
                x.PoInvoice.Mrp,
                x.PoInvoice.BilledQty,
            })
            .Select(g => new MrpWiseStockSummaryDto
            {
                ProductId = g.Key.ProductId,
                ProductName = g.Key.Name,
                Sku = g.Key.Sku,
                InvoiceNumber = g.Key.InvoiceNumber,
                InvoiceDate = g.Key.InvoiceDate,
                PartyName = g.Key.PartyName,
                Mrp = g.Key.Mrp,
                BilledQty = g.Key.BilledQty,
                Quantity = g.Sum(x => x.Quantity),
            })
            .OrderBy(x => x.ProductName)
            .ThenBy(x => x.Mrp)
            .ThenBy(x => x.InvoiceDate)
            .ThenBy(x => x.InvoiceNumber)
            .ToListAsync();

        return Success(results);
    }

    [HttpGet("changes")]
    public async Task<ActionResult<ApiResponse<List<MrpChangeDto>>>> GetMrpChanges([FromQuery] string? search)
    {
        var query = _context.PoInvoices
            .Include(x => x.Product)
            .Include(x => x.Header)
            .Where(x => x.Mrp != null && x.Product != null && x.Header != null)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.ToLower();
            query = query.Where(x =>
                (x.Product!.Name != null && x.Product.Name.ToLower().Contains(s)) ||
                (x.Product!.Sku != null && x.Product.Sku.ToLower().Contains(s)) ||
                (x.Header!.InvoiceNumber != null && x.Header.InvoiceNumber.ToLower().Contains(s)));
        }

        // Only return rows where inward MRP differs from product base MRP
        // Also include rows where product base MRP is null (no base MRP set)
        query = query.Where(x =>
            x.Product!.Mrp == null || x.Mrp != x.Product.Mrp);

        var results = await query
            .OrderByDescending(x => x.Header!.InvoiceDate)
            .ThenBy(x => x.Product!.Name)
            .Select(x => new MrpChangeDto
            {
                ProductId = x.ProductId,
                ProductName = x.Product!.Name,
                Sku = x.Product.Sku,
                BaseMrp = x.Product.Mrp,
                InwardMrp = x.Mrp,
                Difference = x.Product.Mrp.HasValue && x.Mrp.HasValue
                    ? x.Mrp.Value - x.Product.Mrp.Value
                    : null,
                ChangePercent = x.Product.Mrp.HasValue && x.Product.Mrp.Value > 0 && x.Mrp.HasValue
                    ? Math.Round((x.Mrp.Value - x.Product.Mrp.Value) / x.Product.Mrp.Value * 100, 2)
                    : null,
                InvoiceNumber = x.Header!.InvoiceNumber,
                InvoiceDate = x.Header.InvoiceDate,
                PartyName = x.Header.PartyName,
                BilledQty = x.BilledQty,
            })
            .ToListAsync();

        return Success(results);
    }
}
