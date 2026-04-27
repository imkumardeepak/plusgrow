using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PlusgrowWms.Api.Data;
using PlusgrowWms.Api.DTOs;
using PlusgrowWms.Api.Helpers;
using PlusgrowWms.Api.Models;

namespace PlusgrowWms.Api.Controllers;

public class ProductAllottedLocationsController : BaseController
{
    private readonly PlusgrowDbContext _context;

    public ProductAllottedLocationsController(PlusgrowDbContext context)
    {
        _context = context;
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
            UpdatedAt = DateTime.Now,
        };

        _context.ProductAllottedLocations.Add(entity);
        await _context.SaveChangesAsync();

        var created = await _context.ProductAllottedLocations.Include(x => x.Product).FirstAsync(x => x.Id == entity.Id);
        return Success(MapLocation(created), "Product allotted location created successfully");
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
        entity.UpdatedAt = DateTime.Now;
        _context.Entry(entity).Property(x => x.LocationJson).IsModified = true;

        await _context.SaveChangesAsync();

        var updated = await _context.ProductAllottedLocations.Include(x => x.Product).FirstAsync(x => x.Id == entity.Id);
        return Success(MapLocation(updated), "Product allotted location updated successfully");
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
                UpdatedAt = DateTime.Now,
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
        allocationRow.UpdatedAt = DateTime.Now;
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

        return Success(response, "Put-away assignment saved successfully");
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
            .Where(x => x.ProductId == productId && x.RemainingAllocation > 0)
            .OrderBy(x => x.InvoiceDate)
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
}
