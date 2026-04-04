using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PlusgrowWms.Api.Data;
using PlusgrowWms.Api.Helpers;
using PlusgrowWms.Api.Models;
using System.Text.Json;
using ClosedXML.Excel;

namespace PlusgrowWms.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
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
    public async Task<ActionResult<ApiResponse<List<Product>>>> GetProducts()
    {
        var products = await _context.Products
            .Include(p => p.Commodity)
            .Include(p => p.Manufacturer)
            .ToListAsync();
            
        return Success(products);
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
        existing.HsnCode = product.HsnCode;
        existing.CommodityId = product.CommodityId;
        existing.ManufacturerId = product.ManufacturerId;
        existing.CountryOfOrigin = product.CountryOfOrigin;
        existing.MrpQuantity = product.MrpQuantity;
        existing.Factor = product.Factor;
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
        if (string.IsNullOrWhiteSpace(q))
            return Success(await _context.Products.Include(p => p.Commodity).Include(p => p.Manufacturer).ToListAsync());
            
        var products = await _context.Products
            .Include(p => p.Commodity)
            .Include(p => p.Manufacturer)
            .Where(p => p.Name.Contains(q) || (p.Sku != null && p.Sku.Contains(q)))
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
                        var manufacturer = await _context.Manufacturers
                            .FirstOrDefaultAsync(m => m.Name.ToLower() == manufacturerName.ToLower());
                        if (manufacturer != null)
                            manufacturerId = manufacturer.Id;
                    }
                    
                    // Parse commodity
                    var commodityName = row.Cell("Commodity Name").GetString()?.Trim();
                    int? commodityId = null;
                    if (!string.IsNullOrEmpty(commodityName))
                    {
                        var commodity = await _context.Commodities
                            .FirstOrDefaultAsync(c => c.Name.ToLower() == commodityName.ToLower());
                        if (commodity != null)
                            commodityId = commodity.Id;
                    }
                    
                    // Parse numeric values
                    decimal.TryParse(row.Cell("MRP").GetString(), out decimal mrp);
                    decimal.TryParse(row.Cell("USSP").GetString(), out decimal ussp);
                    int.TryParse(row.Cell("Best Before (Months)").GetString(), out int bestBefore);
                    int.TryParse(row.Cell("Factor").GetString(), out int factor);
                    
                    var product = new Product
                    {
                        Name = productName,
                        Sku = sku,
                        HsnCode = row.Cell("HSN Code").GetString()?.Trim(),
                        ManufacturerId = manufacturerId,
                        CommodityId = commodityId,
                        CountryOfOrigin = row.Cell("Country of Origin").GetString()?.Trim() ?? "India",
                        MrpQuantity = row.Cell("MRP Quantity").GetString()?.Trim(),
                        UnitType = row.Cell("Unit Type").GetString()?.Trim() ?? "UNIT",
                        Mrp = mrp,
                        Ussp = ussp,
                        BestBeforeMonths = bestBefore > 0 ? bestBefore : 12,
                        Factor = factor > 0 ? factor : 1
                    };
                    
                    _context.Products.Add(product);
                    result.ImportedCount++;
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
