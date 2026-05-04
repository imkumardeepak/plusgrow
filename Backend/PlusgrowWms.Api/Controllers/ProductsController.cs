using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PlusgrowWms.Api.Data;
using PlusgrowWms.Api.Helpers;
using PlusgrowWms.Api.Models;
using PlusgrowWms.Api.DTOs;
using System.Text.Json;
using ClosedXML.Excel;

namespace PlusgrowWms.Api.Controllers;

public class ProductsController : BaseController
{
    private readonly PlusgrowDbContext _context;
    private readonly ILogger<ProductsController> _logger;

    public ProductsController(PlusgrowDbContext context, ILogger<ProductsController> logger)
    {
        _context = context;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<Product>>>> GetProducts([FromQuery] ListQueryDto queryDto)
    {
        var page = Math.Max(queryDto.Page, 1);
        var pageSize = Math.Clamp(queryDto.PageSize, 1, 200);
        var query = _context.Products
            .Include(p => p.Commodity)
            .Include(p => p.Manufacturer)
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(queryDto.Search))
        {
            var search = queryDto.Search.Trim().ToLower();
            query = query.Where(p =>
                p.Name.ToLower().Contains(search) ||
                (p.Sku != null && p.Sku.ToLower().Contains(search)) ||
                (p.Manufacturer != null && p.Manufacturer.Name.ToLower().Contains(search)) ||
                (p.Commodity != null && p.Commodity.Name.ToLower().Contains(search)));
        }

        query = (queryDto.SortBy?.Trim().ToLowerInvariant(), queryDto.SortDirection?.Trim().ToLowerInvariant()) switch
        {
            ("sku", "desc") => query.OrderByDescending(p => p.Sku),
            ("sku", _) => query.OrderBy(p => p.Sku),
            ("createdat", "desc") => query.OrderByDescending(p => p.CreatedAt),
            ("createdat", _) => query.OrderBy(p => p.CreatedAt),
            ("name", "desc") => query.OrderByDescending(p => p.Name),
            _ => query.OrderBy(p => p.Name),
        };

        var total = await query.CountAsync();
        var products = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Success(products, page, pageSize, total);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ApiResponse<Product>>> GetProduct(int id)
    {
        var product = await _context.Products
            .Include(p => p.Commodity)
            .Include(p => p.Manufacturer)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (product == null)
            return NotFound<Product>("Product not found");

        return Success(product);
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<Product>>> CreateProduct([FromBody] Product product)
    {
        _context.Products.Add(product);
        await _context.SaveChangesAsync();

        // Fetch with includes
        var created = await _context.Products
            .Include(p => p.Commodity)
            .Include(p => p.Manufacturer)
            .FirstOrDefaultAsync(p => p.Id == product.Id);

        return Success(created!, "Product created successfully");
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<ApiResponse<Product>>> UpdateProduct(int id, [FromBody] Product product)
    {
        _logger.LogInformation("UpdateProduct called with id: {Id}, product: {Product}", id, JsonSerializer.Serialize(product));

        if (id != product.Id)
            return BadRequest<Product>("ID mismatch");

        // Fetch existing entity and update fields manually
        var existing = await _context.Products.FindAsync(id);
        if (existing == null)
            return NotFound<Product>("Product not found");

        // Update all fields
        existing.Name = product.Name;
        existing.Sku = product.Sku;
        existing.CommodityId = product.CommodityId;
        existing.ManufacturerId = product.ManufacturerId;
        existing.CountryOfOrigin = product.CountryOfOrigin;
        existing.Factor = product.Factor;
        existing.NetQuantity = product.NetQuantity;
        existing.UnitType = product.UnitType;
        existing.Ussp = product.Ussp;
        existing.Mrp = product.Mrp;
        existing.BestBeforeMonths = product.BestBeforeMonths;

        try
        {
            await _context.SaveChangesAsync();
            _logger.LogInformation("Product updated successfully with Ussp: {Ussp}", product.Ussp);
        }
        catch (DbUpdateConcurrencyException)
        {
            if (!ProductExists(id))
                return NotFound<Product>("Product not found");
            throw;
        }

        var updated = await _context.Products
            .Include(p => p.Commodity)
            .Include(p => p.Manufacturer)
            .FirstOrDefaultAsync(p => p.Id == id);

        return Success(updated!, "Product updated successfully");
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult<ApiResponse>> DeleteProduct(int id)
    {
        var product = await _context.Products.FindAsync(id);
        if (product == null)
            return NotFound("Product not found");

        _context.Products.Remove(product);
        await _context.SaveChangesAsync();

        return Ok("Product deleted successfully");
    }

    [HttpGet("search")]
    public async Task<ActionResult<ApiResponse<List<Product>>>> Search([FromQuery] string q)
    {
        var products = await _context.Products
            .Include(p => p.Commodity)
            .Include(p => p.Manufacturer)
            .AsNoTracking()
            .Where(p => string.IsNullOrWhiteSpace(q) || p.Name.ToLower().Contains(q.Trim().ToLower()) || (p.Sku != null && p.Sku.ToLower().Contains(q.Trim().ToLower())))
            .OrderBy(p => p.Name)
            .Take(25)
            .ToListAsync();

        return Success(products);
    }

    [HttpPost("upload")]
    [DisableRequestSizeLimit]
    [RequestFormLimits(MultipartBodyLengthLimit = 104857600)]
    public async Task<ActionResult<ApiResponse<ProductUploadResult>>> UploadExcel(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest<ProductUploadResult>("Please upload a valid Excel file");

        if (!file.FileName.EndsWith(".xlsx", StringComparison.OrdinalIgnoreCase) &&
            !file.FileName.EndsWith(".xls", StringComparison.OrdinalIgnoreCase))
            return BadRequest<ProductUploadResult>("Only Excel files (.xlsx, .xls) are allowed");

        var result = new ProductUploadResult { Errors = new List<string>() };

        try
        {
            using var stream = new MemoryStream();
            await file.CopyToAsync(stream);
            stream.Position = 0;

            using var workbook = new XLWorkbook(stream);
            var worksheet = workbook.Worksheet("Product Template");

            if (worksheet == null)
                worksheet = workbook.Worksheet(1); // Fallback to first sheet

            var rows = worksheet.RangeUsed().RowsUsed().Skip(1); // Skip header row
            var createdManufacturers = new Dictionary<string, Manufacturer>(StringComparer.OrdinalIgnoreCase);
            var createdCommodities = new Dictionary<string, Commodity>(StringComparer.OrdinalIgnoreCase);

            foreach (var row in rows)
            {
                try
                {
                    var productName = row.Cell("Product Name").GetString()?.Trim();
                    var sku = row.Cell("SKU").GetString()?.Trim();

                    // Skip empty rows
                    if (string.IsNullOrEmpty(productName))
                        continue;

                    // Parse manufacturer
                    var manufacturerName = row.Cell("Manufacturer Name").GetString()?.Trim();
                    int? manufacturerId = null;
                    if (!string.IsNullOrEmpty(manufacturerName))
                    {
                        if (!createdManufacturers.TryGetValue(manufacturerName, out var manufacturer))
                        {
                            manufacturer = await _context.Manufacturers
                                .FirstOrDefaultAsync(m => m.Name.ToLower() == manufacturerName.ToLower());
                            if (manufacturer == null)
                            {
                                manufacturer = new Manufacturer { Name = manufacturerName };
                                _context.Manufacturers.Add(manufacturer);
                                await _context.SaveChangesAsync();
                            }
                            createdManufacturers[manufacturerName] = manufacturer;
                        }
                        manufacturerId = createdManufacturers[manufacturerName].Id;
                    }

                    // Parse commodity
                    var commodityName = row.Cell("Commodity Name").GetString()?.Trim();
                    int? commodityId = null;
                    if (!string.IsNullOrEmpty(commodityName))
                    {
                        if (!createdCommodities.TryGetValue(commodityName, out var commodity))
                        {
                            commodity = await _context.Commodities
                                .FirstOrDefaultAsync(c => c.Name.ToLower() == commodityName.ToLower());
                            if (commodity == null)
                            {
                                commodity = new Commodity { Name = commodityName.ToUpper() };
                                _context.Commodities.Add(commodity);
                                await _context.SaveChangesAsync();
                            }
                            createdCommodities[commodityName] = commodity;
                        }
                        commodityId = createdCommodities[commodityName].Id;
                    }

                    // Parse numeric values
                    decimal.TryParse(row.Cell("MRP").GetString(), out decimal mrp);
                    decimal.TryParse(row.Cell("USSP").GetString(), out decimal ussp);
                    decimal.TryParse(row.Cell("Net Qnty").GetString(), out decimal netQuantity);
                    int.TryParse(row.Cell("Best Before (Months)").GetString(), out int bestBefore);

                    // Auto-calculate USSP if MRP and Factor provided
                    var factorStr = row.Cell("Factor").GetString()?.Trim();
                    if (mrp > 0 && !string.IsNullOrEmpty(factorStr))
                    {
                        // Extract numeric value from Factor (e.g., "1L" -> 1, "500g" -> 500)
                        var numericPart = new string(factorStr.Where(char.IsDigit).ToArray());
                        if (decimal.TryParse(numericPart, out decimal factorValue) && factorValue > 0)
                        {
                            ussp = mrp / factorValue;
                        }
                    }

                    var product = new Product
                    {
                        Name = productName,
                        Sku = sku,
                        ManufacturerId = manufacturerId,
                        CommodityId = commodityId,
                        CountryOfOrigin = row.Cell("Country of Origin").GetString()?.Trim() ?? "India",
                        Factor = factorStr,
                        NetQuantity = netQuantity > 0 ? netQuantity.ToString() : null,
                        UnitType = row.Cell("Unit Type").GetString()?.Trim() ?? "UNIT",
                        Mrp = mrp,
                        Ussp = ussp,
                        BestBeforeMonths = bestBefore > 0 ? bestBefore : 12,
                    };

                    _context.Products.Add(product);
                    await _context.SaveChangesAsync();
                    result.ImportedCount++;

                    // Parse and upsert stock quantity
                    var stockQntyStr = row.Cell("Stock Qnty").GetString()?.Trim();
                    if (!string.IsNullOrEmpty(stockQntyStr) && int.TryParse(stockQntyStr, out int stockQnty) && stockQnty >= 0)
                    {
                        var existingQty = await _context.ProductQuantities
                            .FirstOrDefaultAsync(pq => pq.ProductId == product.Id);
                        if (existingQty != null)
                        {
                            existingQty.CurrentQuantity = stockQnty;
                            existingQty.UpdatedAt = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified);
                        }
                        else
                        {
                            _context.ProductQuantities.Add(new ProductQuantity
                            {
                                ProductId = product.Id,
                                CurrentQuantity = stockQnty,
                                UpdatedAt = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified)
                            });
                        }
                    }
                }
                catch (Exception ex)
                {
                    result.Errors.Add($"Row {row.RowNumber()}: {ex.Message}");
                }
            }

            await _context.SaveChangesAsync();
            result.Success = true;

            _logger.LogInformation("Excel upload completed. Imported {Count} products", result.ImportedCount);

            return Success(result, $"Successfully imported {result.ImportedCount} products");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error uploading Excel file");
            return Error<ProductUploadResult>($"Error processing file: {ex.Message}");
        }
    }

    private bool ProductExists(int id) => _context.Products.Any(e => e.Id == id);
}
