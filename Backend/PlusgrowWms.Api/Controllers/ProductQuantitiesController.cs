using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PlusgrowWms.Api.Data;
using PlusgrowWms.Api.DTOs;
using PlusgrowWms.Api.Helpers;
using PlusgrowWms.Api.Models;

namespace PlusgrowWms.Api.Controllers;

public class ProductQuantitiesController : BaseController
{
    private readonly PlusgrowDbContext _context;

    public ProductQuantitiesController(PlusgrowDbContext context)
    {
        _context = context;
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
            UpdatedAt = DateTime.UtcNow,
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
        entity.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        var updated = await _context.ProductQuantities.Include(x => x.Product).FirstAsync(x => x.Id == entity.Id);
        return Success(MapQuantity(updated), "Product quantity updated successfully");
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
            CurrentQuantity = row.CurrentQuantity,
            UpdatedAt = row.UpdatedAt,
        };
    }
}
