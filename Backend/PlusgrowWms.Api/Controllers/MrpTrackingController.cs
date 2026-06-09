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
}
