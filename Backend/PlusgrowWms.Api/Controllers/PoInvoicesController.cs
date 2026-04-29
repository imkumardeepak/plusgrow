using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PlusgrowWms.Api.Data;
using PlusgrowWms.Api.DTOs;
using PlusgrowWms.Api.Helpers;
using PlusgrowWms.Api.Models;
using ClosedXML.Excel;
using System.Globalization;

namespace PlusgrowWms.Api.Controllers;

public class PoInvoicesController : BaseController
{
    private readonly PlusgrowDbContext _context;
    private readonly ILogger<PoInvoicesController> _logger;

    public PoInvoicesController(PlusgrowDbContext context, ILogger<PoInvoicesController> logger)
    {
        _context = context;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<PoInvoiceDto>>>> GetPoInvoices([FromQuery] PoInvoiceFilterDto filter)
    {
        var query = _context.PoInvoices
            .Include(x => x.Product)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var search = filter.Search.Trim().ToLower();
            query = query.Where(x =>
                x.InvoiceNumber.ToLower().Contains(search) ||
                x.PartyName.ToLower().Contains(search) ||
                (x.Product != null && x.Product.Sku != null && x.Product.Sku.ToLower().Contains(search)) ||
                (x.Product != null && x.Product.Name.ToLower().Contains(search)));
        }

        if (!string.IsNullOrWhiteSpace(filter.Status))
        {
            var status = filter.Status.Trim().ToLowerInvariant();
            if (status == "pending")
            {
                query = query.Where(x => !x.Printed);
            }
            else if (status == "printed")
            {
                query = query.Where(x => x.Printed);
            }
        }

        if (filter.FromDate.HasValue)
        {
            var fromDate = NormalizeInvoiceDate(filter.FromDate.Value);
            query = query.Where(x => x.InvoiceDate >= fromDate);
        }

        if (filter.ToDate.HasValue)
        {
            var toDate = NormalizeInvoiceDate(filter.ToDate.Value);
            query = query.Where(x => x.InvoiceDate <= toDate);
        }

        var invoices = await query
            .OrderByDescending(x => x.InvoiceDate)
            .ThenBy(x => x.PartyName)
            .ToListAsync();

        return Success(invoices.Select(MapInvoice).ToList());
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<PoInvoiceDto>>> CreatePoInvoice([FromBody] CreatePoInvoiceDto dto)
    {
        if (!await _context.Products.AnyAsync(x => x.Id == dto.ProductId))
            return BadRequest<PoInvoiceDto>("Selected product does not exist");

        var entity = new PoInvoice
        {
            InvoiceNumber = await GenerateInvoiceNumberAsync(),
            InvoiceDate = NormalizeInvoiceDate(dto.InvoiceDate),
            PartyName = dto.PartyName.Trim(),
            ProductId = dto.ProductId,
            BilledQty = dto.BilledQty,
            Printed = false,
            RemainingAllocation = dto.BilledQty,
            LocationAllotted = false,
        };

        _context.PoInvoices.Add(entity);
        await UpsertProductQuantityAsync(dto.ProductId, dto.BilledQty);
        await _context.SaveChangesAsync();

        var created = await _context.PoInvoices.Include(x => x.Product).FirstAsync(x => x.Id == entity.Id);
        return Success(MapInvoice(created), "PO invoice created successfully");
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<ApiResponse<PoInvoiceDto>>> UpdatePoInvoice(int id, [FromBody] UpdatePoInvoiceDto dto)
    {
        if (id != dto.Id)
            return BadRequest<PoInvoiceDto>("ID mismatch");

        var entity = await _context.PoInvoices.FindAsync(id);
        if (entity == null)
            return NotFound<PoInvoiceDto>("PO invoice not found");

        if (!await _context.Products.AnyAsync(x => x.Id == dto.ProductId))
            return BadRequest<PoInvoiceDto>("Selected product does not exist");

        entity.InvoiceDate = NormalizeInvoiceDate(dto.InvoiceDate);
        entity.PartyName = dto.PartyName.Trim();
        entity.ProductId = dto.ProductId;
        entity.BilledQty = dto.BilledQty;

        // Calculate the difference in billed quantity and update product_quantities
        var quantityDifference = dto.BilledQty - entity.BilledQty;
        if (quantityDifference != 0)
        {
            await UpsertProductQuantityAsync(dto.ProductId, quantityDifference);
        }

        entity.RemainingAllocation = dto.BilledQty;

        await _context.SaveChangesAsync();

        var updated = await _context.PoInvoices.Include(x => x.Product).FirstAsync(x => x.Id == entity.Id);
        return Success(MapInvoice(updated), "PO invoice updated successfully");
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult<ApiResponse>> DeletePoInvoice(int id)
    {
        var entity = await _context.PoInvoices.FindAsync(id);
        if (entity == null)
            return NotFound("PO invoice not found");

        _context.PoInvoices.Remove(entity);
        await _context.SaveChangesAsync();

        return Ok("PO invoice deleted successfully");
    }

    [HttpPost("upload")]
    [DisableRequestSizeLimit]
    public async Task<ActionResult<ApiResponse<ImportResultDto>>> UploadExcel(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest<ImportResultDto>("Please upload a valid Excel file");

        if (!file.FileName.EndsWith(".xlsx", StringComparison.OrdinalIgnoreCase) &&
            !file.FileName.EndsWith(".xls", StringComparison.OrdinalIgnoreCase))
            return BadRequest<ImportResultDto>("Only Excel files (.xlsx, .xls) are allowed");

        var result = new ImportResultDto();

        try
        {
            using var stream = new MemoryStream();
            await file.CopyToAsync(stream);
            stream.Position = 0;

            using var workbook = new XLWorkbook(stream);
            var worksheet = workbook.Worksheets.First();
            var headerRow = worksheet.FirstRowUsed();
            if (headerRow == null)
                return BadRequest<ImportResultDto>("The uploaded file does not contain a header row");

            var dataRows = worksheet.RowsUsed().Skip(headerRow.RowNumber());

            var headerMap = headerRow.CellsUsed()
                .ToDictionary(
                    cell => NormalizeHeader(cell.GetString()),
                    cell => cell.Address.ColumnNumber,
                    StringComparer.OrdinalIgnoreCase
                );

            var requiredHeaders = new[]
            {
                "invoicedate",
                "partyname",
                "skucode",
                "productname",
                "billedqty",
                "mrp",
            };

            var missingHeaders = requiredHeaders.Where(header => !headerMap.ContainsKey(header)).ToList();
            if (missingHeaders.Count > 0)
                return BadRequest<ImportResultDto>($"Missing required columns: {string.Join(", ", missingHeaders)}");

            foreach (var row in dataRows)
            {
                try
                {
                    var invoiceDateCell = row.Cell(headerMap["invoicedate"]);
                    var partyName = row.Cell(headerMap["partyname"]).GetString().Trim();
                    var skuCode = row.Cell(headerMap["skucode"]).GetString().Trim();
                    var productName = row.Cell(headerMap["productname"]).GetString().Trim();
                    var billedQtyText = row.Cell(headerMap["billedqty"]).GetString().Trim();

                    if (string.IsNullOrWhiteSpace(partyName) && string.IsNullOrWhiteSpace(skuCode) && string.IsNullOrWhiteSpace(productName))
                        continue;

                    if (string.IsNullOrWhiteSpace(partyName))
                    {
                        result.Errors.Add($"Row {row.RowNumber()}: Party Name is required.");
                        continue;
                    }

                    var invoiceDate = TryParseInvoiceDate(invoiceDateCell);
                    if (invoiceDate == null)
                    {
                        result.Errors.Add($"Row {row.RowNumber()}: Invoice Date is invalid.");
                        continue;
                    }

                    if (!int.TryParse(billedQtyText, NumberStyles.Any, CultureInfo.InvariantCulture, out var billedQty))
                    {
                        var billedQtyDouble = row.Cell(headerMap["billedqty"]).GetDouble();
                        billedQty = Convert.ToInt32(billedQtyDouble);
                    }

                    Product? product = null;
                    if (!string.IsNullOrWhiteSpace(skuCode))
                    {
                        product = await _context.Products.FirstOrDefaultAsync(x => x.Sku == skuCode);
                    }

                    if (product == null && !string.IsNullOrWhiteSpace(productName))
                    {
                        product = await _context.Products.FirstOrDefaultAsync(x => x.Name == productName);
                    }

                    if (product == null)
                    {
                        result.Errors.Add($"Row {row.RowNumber()}: Product not found for SKU '{skuCode}' / Product '{productName}'.");
                        continue;
                    }

                    var entity = new PoInvoice
                    {
                        InvoiceNumber = await GenerateInvoiceNumberAsync(),
                        InvoiceDate = NormalizeInvoiceDate(invoiceDate.Value),
                        PartyName = partyName,
                        ProductId = product.Id,
                        BilledQty = billedQty,
                        Printed = false,
                        RemainingAllocation = billedQty,
                        LocationAllotted = false,
                    };

                    _context.PoInvoices.Add(entity);
                    await UpsertProductQuantityAsync(product.Id, billedQty);
                    result.ImportedCount++;
                }
                catch (Exception ex)
                {
                    result.Errors.Add($"Row {row.RowNumber()}: {ex.Message}");
                }
            }

            await _context.SaveChangesAsync();
            result.Success = true;

            return Success(result, $"Imported {result.ImportedCount} invoice rows successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error importing PO invoices from Excel");
            return Error<ImportResultDto>($"Error processing file: {ex.Message}");
        }
    }

    [HttpPost("mark-printed")]
    public async Task<ActionResult<ApiResponse<MarkPoInvoicesPrintedResultDto>>> MarkPrinted([FromBody] MarkPoInvoicesPrintedRequestDto dto)
    {
        var invoiceIds = dto.InvoiceIds
            .Where(id => id > 0)
            .Distinct()
            .ToList();

        if (invoiceIds.Count == 0)
            return BadRequest<MarkPoInvoicesPrintedResultDto>("At least one invoice row is required");

        var invoices = await _context.PoInvoices
            .Where(x => invoiceIds.Contains(x.Id))
            .ToListAsync();

        if (invoices.Count == 0)
            return NotFound<MarkPoInvoicesPrintedResultDto>("Selected invoice rows were not found");

        foreach (var invoice in invoices)
        {
            invoice.Printed = true;
        }

        await _context.SaveChangesAsync();

        return Success(new MarkPoInvoicesPrintedResultDto
        {
            UpdatedCount = invoices.Count,
        }, "Invoice rows marked as printed successfully");
    }

    private async Task<string> GenerateInvoiceNumberAsync()
    {
        var year = DateTime.Now.Year % 100;
        var prefix = $"IN{year:D2}";

        var maxInvoice = await _context.PoInvoices
            .Where(x => x.InvoiceNumber.StartsWith(prefix))
            .OrderByDescending(x => x.InvoiceNumber)
            .FirstOrDefaultAsync();

        int nextNumber = 1;
        if (maxInvoice != null && maxInvoice.InvoiceNumber.Length > prefix.Length)
        {
            var numberPart = maxInvoice.InvoiceNumber.Substring(prefix.Length);
            if (int.TryParse(numberPart, out var lastNumber))
            {
                nextNumber = lastNumber + 1;
            }
        }

        return $"{prefix}{nextNumber:D4}";
    }

    private static PoInvoiceDto MapInvoice(PoInvoice invoice)
    {
        return new PoInvoiceDto
        {
            Id = invoice.Id,
            InvoiceNumber = invoice.InvoiceNumber,
            InvoiceDate = invoice.InvoiceDate,
            PartyName = invoice.PartyName,
            ProductId = invoice.ProductId,
            SkuCode = invoice.Product?.Sku ?? string.Empty,
            ProductName = invoice.Product?.Name ?? string.Empty,
            Mrp = invoice.Product?.Mrp,
            BilledQty = invoice.BilledQty,
            Printed = invoice.Printed,
            RemainingAllocation = invoice.RemainingAllocation,
            LocationAllotted = invoice.LocationAllotted,
            CreatedAt = invoice.CreatedAt,
        };
    }

    private static string NormalizeHeader(string value)
    {
        return new string(value.Where(char.IsLetterOrDigit).ToArray()).ToLowerInvariant();
    }

    private static DateTime NormalizeInvoiceDate(DateTime value)
    {
        return DateTime.SpecifyKind(value.Date, DateTimeKind.Unspecified);
    }

    private async Task UpsertProductQuantityAsync(int productId, int billedQty)
    {
        var quantityRow = await _context.ProductQuantities.FirstOrDefaultAsync(x => x.ProductId == productId);

        if (quantityRow == null)
        {
            _context.ProductQuantities.Add(new ProductQuantity
            {
                ProductId = productId,
                CurrentQuantity = billedQty,
                UpdatedAt = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified),
            });
            return;
        }

        quantityRow.CurrentQuantity += billedQty;
        quantityRow.UpdatedAt = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified);
    }

    private static DateTime? TryParseInvoiceDate(IXLCell cell)
    {
        if (cell.TryGetValue<DateTime>(out var date))
            return NormalizeInvoiceDate(date);

        var raw = cell.GetString().Trim();
        if (string.IsNullOrWhiteSpace(raw))
            return null;

        var formats = new[]
        {
            "dd-MMM-yy",
            "d-MMM-yy",
            "dd/MM/yyyy",
            "d/M/yyyy",
            "dd-MM-yyyy",
            "d-M-yyyy",
            "yyyy-MM-dd",
        };

        if (DateTime.TryParseExact(raw, formats, CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsed))
            return NormalizeInvoiceDate(parsed);

        if (DateTime.TryParse(raw, CultureInfo.InvariantCulture, DateTimeStyles.None, out parsed))
            return NormalizeInvoiceDate(parsed);

        return null;
    }
}
