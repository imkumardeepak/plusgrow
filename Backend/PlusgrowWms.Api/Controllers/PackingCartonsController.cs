using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PlusgrowWms.Api.Data;
using PlusgrowWms.Api.DTOs;
using PlusgrowWms.Api.Helpers;
using PlusgrowWms.Api.Models;

namespace PlusgrowWms.Api.Controllers;

public class PackingCartonsController : BaseController
{
    private readonly PlusgrowDbContext _context;

    public PackingCartonsController(PlusgrowDbContext context)
    {
        _context = context;
    }

    [HttpGet("by-order/{orderId}")]
    public async Task<ActionResult<ApiResponse<List<PackingCartonDto>>>> GetByOrder(int orderId)
    {
        var order = await _context.OutwardOrders.FindAsync(orderId);
        if (order == null)
            return NotFound<List<PackingCartonDto>>("Outward order not found");

        var cartons = await _context.PackingCartons
            .Where(c => c.OutwardOrderId == orderId)
            .OrderBy(c => c.CreatedAt)
            .ToListAsync();

        return Success(cartons.Select(MapCarton).ToList());
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<PackingCartonDto>>> CreateCarton([FromBody] CreatePackingCartonDto dto)
    {
        var order = await _context.OutwardOrders.FindAsync(dto.OutwardOrderId);
        if (order == null)
            return NotFound<PackingCartonDto>("Outward order not found");

        var cartonNumber = await GenerateCartonNumberAsync(dto.OutwardOrderId);

        var carton = new PackingCarton
        {
            OutwardOrderId = dto.OutwardOrderId,
            CartonNumber = cartonNumber,
            Quantity = 0,
            Status = "Open",
            CreatedAt = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified),
            UpdatedAt = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified),
        };

        _context.PackingCartons.Add(carton);
        await _context.SaveChangesAsync();

        return Success(MapCarton(carton), "Carton created");
    }

    [HttpPost("{id}/pack")]
    public async Task<ActionResult<ApiResponse<PackingCartonDto>>> PackItem(int id, [FromBody] PackItemDto dto)
    {
        var carton = await _context.PackingCartons.FindAsync(id);
        if (carton == null)
            return NotFound<PackingCartonDto>("Carton not found");

        if (carton.Status != "Open")
            return BadRequest<PackingCartonDto>("Cannot pack into a carton that is not open");

        var order = await _context.OutwardOrders
            .Include(o => o.Product)
            .FirstOrDefaultAsync(o => o.Id == carton.OutwardOrderId);

        if (order == null)
            return NotFound<PackingCartonDto>("Order not found");

        var expectedSku = order.Product?.Sku?.Trim();
        var expectedAlias = order.Product?.Alias?.Trim();
        if (!string.IsNullOrWhiteSpace(dto.SkuCode))
        {
            var scanned = dto.SkuCode.Trim();
            var matchesSku = !string.IsNullOrWhiteSpace(expectedSku) && string.Equals(expectedSku, scanned, StringComparison.OrdinalIgnoreCase);
            var matchesAlias = !string.IsNullOrWhiteSpace(expectedAlias) && string.Equals(expectedAlias, scanned, StringComparison.OrdinalIgnoreCase);
            if (!matchesSku && !matchesAlias)
            {
                return BadRequest<PackingCartonDto>($"Scanned code {scanned} does not match product SKU ({expectedSku}) or Alias ({expectedAlias})");
            }
        }

        var totalPackedInCartons = await _context.PackingCartons
            .Where(c => c.OutwardOrderId == order.Id)
            .SumAsync(c => c.Quantity);

        if (totalPackedInCartons >= order.Quantity)
            return BadRequest<PackingCartonDto>("Order is fully packed. All items are already in cartons.");

        carton.Quantity += 1;
        carton.UpdatedAt = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified);

        await _context.SaveChangesAsync();

        return Success(MapCarton(carton), "Item packed");
    }

    [HttpPost("{id}/ready")]
    public async Task<ActionResult<ApiResponse<PackingCartonDto>>> MarkReady(int id)
    {
        var carton = await _context.PackingCartons.FindAsync(id);
        if (carton == null)
            return NotFound<PackingCartonDto>("Carton not found");

        if (carton.Quantity <= 0)
            return BadRequest<PackingCartonDto>("Cannot mark an empty carton as ready");

        carton.Status = "Ready";
        carton.UpdatedAt = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified);

        await _context.SaveChangesAsync();

        return Success(MapCarton(carton), "Carton marked as ready");
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult<ApiResponse<object>>> DeleteCarton(int id)
    {
        var carton = await _context.PackingCartons.FindAsync(id);
        if (carton == null)
            return NotFound<object>("Carton not found");

        _context.PackingCartons.Remove(carton);
        await _context.SaveChangesAsync();

        return Success(new object(), "Carton deleted");
    }

    private async Task<string> GenerateCartonNumberAsync(int orderId)
    {
        var order = await _context.OutwardOrders.FindAsync(orderId);
        var prefix = order?.OrderNumber ?? $"ORD-{orderId}";
        var existingCount = await _context.PackingCartons
            .CountAsync(c => c.OutwardOrderId == orderId);
        var suffix = (existingCount + 1).ToString("000");
        return $"{prefix}-CTN-{suffix}";
    }

    private static PackingCartonDto MapCarton(PackingCarton carton)
    {
        return new PackingCartonDto
        {
            Id = carton.Id,
            OutwardOrderId = carton.OutwardOrderId,
            CartonNumber = carton.CartonNumber,
            Quantity = carton.Quantity,
            Status = carton.Status,
            CreatedAt = carton.CreatedAt,
            UpdatedAt = carton.UpdatedAt,
        };
    }
}
