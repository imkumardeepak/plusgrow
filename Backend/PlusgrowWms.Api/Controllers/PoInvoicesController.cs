using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using PlusgrowWms.Api.Data;
using PlusgrowWms.Api.DTOs;
using PlusgrowWms.Api.Helpers;
using PlusgrowWms.Api.Hubs;
using PlusgrowWms.Api.Models;
using ClosedXML.Excel;
using System.Globalization;

namespace PlusgrowWms.Api.Controllers;

public class PoInvoicesController : BaseController
{
    private readonly PlusgrowDbContext _context;
    private readonly ILogger<PoInvoicesController> _logger;
    private readonly IHubContext<NotificationHub> _notificationHub;

    public PoInvoicesController(
        PlusgrowDbContext context,
        ILogger<PoInvoicesController> logger,
        IHubContext<NotificationHub> notificationHub)
    {
        _context = context;
        _logger = logger;
        _notificationHub = notificationHub;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<PoInvoiceDto>>>> GetPoInvoices([FromQuery] PoInvoiceFilterDto filter)
    {
        var page = Math.Max(filter.Page, 1);
        var pageSize = Math.Clamp(filter.PageSize, 1, 200);
        var query = _context.PoInvoices
            .Include(x => x.Header)
            .Include(x => x.Product)
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var search = filter.Search.Trim().ToLower();
            query = query.Where(x =>
                (x.Header != null && x.Header.InvoiceNumber.ToLower().Contains(search)) ||
                (x.Header != null && x.Header.PartyName.ToLower().Contains(search)) ||
                (x.Product != null && x.Product.Sku != null && x.Product.Sku.ToLower().Contains(search)) ||
                (x.Product != null && x.Product.Alias != null && x.Product.Alias.ToLower().Contains(search)) ||
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
            query = query.Where(x => x.Header != null && x.Header.InvoiceDate >= fromDate);
        }

        if (filter.ToDate.HasValue)
        {
            var toDate = NormalizeInvoiceDate(filter.ToDate.Value);
            query = query.Where(x => x.Header != null && x.Header.InvoiceDate <= toDate);
        }

        var total = await query.CountAsync();
        var invoices = await query
            .OrderByDescending(x => x.Header!.InvoiceDate)
            .ThenBy(x => x.Header!.PartyName)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Success(invoices.Select(MapInvoice).ToList(), page, pageSize, total);
    }

    [HttpGet("headers")]
    public async Task<ActionResult<ApiResponse<List<PoInvoiceHeaderSummaryDto>>>> GetPoInvoiceHeaders([FromQuery] PoInvoiceFilterDto filter)
    {
        var page = Math.Max(filter.Page, 1);
        var pageSize = Math.Clamp(filter.PageSize, 1, 500);

        var query = _context.PoInvoiceHeaders
            .Include(x => x.Items)
                .ThenInclude(x => x.Product)
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var search = filter.Search.Trim().ToLower();
            query = query.Where(x =>
                x.InvoiceNumber.ToLower().Contains(search) ||
                x.PartyName.ToLower().Contains(search) ||
                x.Items.Any(item =>
                    (item.Product != null && item.Product.Sku != null && item.Product.Sku.ToLower().Contains(search)) ||
                    (item.Product != null && item.Product.Alias != null && item.Product.Alias.ToLower().Contains(search)) ||
                    (item.Product != null && item.Product.Name.ToLower().Contains(search))));
        }

        if (!string.IsNullOrWhiteSpace(filter.Status))
        {
            var status = filter.Status.Trim().ToLowerInvariant();
            if (status == "pending")
            {
                query = query.Where(x => x.Items.Any(item => !item.Printed) || !x.Items.Any());
            }
            else if (status == "printed")
            {
                query = query.Where(x => x.Items.Any() && x.Items.All(item => item.Printed));
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

        var total = await query.CountAsync();
        var headers = await query
            .OrderByDescending(x => x.InvoiceDate)
            .ThenBy(x => x.PartyName)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Success(headers.Select(MapHeaderSummary).ToList(), page, pageSize, total);
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<PoInvoiceDto>>> CreatePoInvoice([FromBody] CreatePoInvoiceDto dto)
    {
        if (!await _context.Products.AnyAsync(x => x.Id == dto.ProductId))
            return BadRequest<PoInvoiceDto>("Selected product does not exist");

        if (string.IsNullOrWhiteSpace(dto.InvoiceNumber))
            return BadRequest<PoInvoiceDto>("Invoice number is required");

        PoInvoiceHeader header;
        try
        {
            header = await GetOrCreateInvoiceHeaderAsync(dto.InvoiceNumber, dto.InvoiceDate, dto.PartyName);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest<PoInvoiceDto>(ex.Message);
        }

        var entity = new PoInvoice
        {
            PoInvoiceHeaderId = header.Id,
            ProductId = dto.ProductId,
            BilledQty = dto.BilledQty,
            Printed = false,
            RemainingAllocation = dto.BilledQty,
            LocationAllotted = false,
        };

        _context.PoInvoices.Add(entity);
        await UpsertProductQuantityAsync(dto.ProductId, dto.BilledQty);
        await _context.SaveChangesAsync();

        var created = await _context.PoInvoices
            .Include(x => x.Header)
            .Include(x => x.Product)
            .FirstAsync(x => x.Id == entity.Id);
        var response = MapInvoice(created);
        await SendNotificationAsync(new RealtimeNotificationDto
        {
            Type = "po_invoice.created",
            Title = "New inward / PO added",
            Message = $"{response.InvoiceNumber} for {response.PartyName} was added to inward.",
            Severity = "success",
            Data = new Dictionary<string, object?>
            {
                ["invoiceId"] = response.Id,
                ["invoiceNumber"] = response.InvoiceNumber,
                ["productId"] = response.ProductId,
                ["productName"] = response.ProductName,
                ["billedQty"] = response.BilledQty,
            },
        });

        return Success(response, "PO invoice created successfully");
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

        if (string.IsNullOrWhiteSpace(dto.InvoiceNumber))
            return BadRequest<PoInvoiceDto>("Invoice number is required");

        var previousHeaderId = entity.PoInvoiceHeaderId;
        PoInvoiceHeader header;
        try
        {
            header = await GetOrCreateInvoiceHeaderAsync(dto.InvoiceNumber, dto.InvoiceDate, dto.PartyName, previousHeaderId);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest<PoInvoiceDto>(ex.Message);
        }

        var previousProductId = entity.ProductId;
        var previousBilledQty = entity.BilledQty;
        var previouslyAllocatedQty = Math.Max(entity.BilledQty - entity.RemainingAllocation, 0);

        entity.PoInvoiceHeaderId = header.Id;
        entity.ProductId = dto.ProductId;
        entity.BilledQty = dto.BilledQty;

        if (previousProductId != dto.ProductId)
        {
            await UpsertProductQuantityAsync(previousProductId, -previousBilledQty);
            await UpsertProductQuantityAsync(dto.ProductId, dto.BilledQty);
        }
        else
        {
            var quantityDifference = dto.BilledQty - previousBilledQty;
            if (quantityDifference != 0)
            {
                await UpsertProductQuantityAsync(dto.ProductId, quantityDifference);
            }
        }

        entity.RemainingAllocation = Math.Max(dto.BilledQty - previouslyAllocatedQty, 0);
        entity.LocationAllotted = entity.RemainingAllocation <= 0;

        await _context.SaveChangesAsync();
        if (previousHeaderId != header.Id)
        {
            await DeleteHeaderIfOrphanedAsync(previousHeaderId);
        }

        var updated = await _context.PoInvoices
            .Include(x => x.Header)
            .Include(x => x.Product)
            .FirstAsync(x => x.Id == entity.Id);
        return Success(MapInvoice(updated), "PO invoice updated successfully");
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult<ApiResponse>> DeletePoInvoice(int id)
    {
        var entity = await _context.PoInvoices.FindAsync(id);
        if (entity == null)
            return NotFound("PO invoice not found");

        var headerId = entity.PoInvoiceHeaderId;
        _context.PoInvoices.Remove(entity);
        await _context.SaveChangesAsync();
        await DeleteHeaderIfOrphanedAsync(headerId);

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
            var manufacturerCache = new Dictionary<string, Manufacturer>(StringComparer.OrdinalIgnoreCase);

            using var workbook = new XLWorkbook(stream);
            var worksheet = workbook.Worksheets.First();
            var headerRow = worksheet.FirstRowUsed();
            if (headerRow == null)
                return BadRequest<ImportResultDto>("The uploaded file does not contain a header row");

            var dataRows = worksheet.RowsUsed().Skip(headerRow.RowNumber()).ToList();

            var headerMap = headerRow.CellsUsed()
                .ToDictionary(
                    cell => NormalizeHeader(cell.GetString()),
                    cell => cell.Address.ColumnNumber,
                    StringComparer.OrdinalIgnoreCase
                );

            var requiredHeaders = new[]
            {
                "invoiceno",
                "invdate",
                "partyname",
                "partno",
                "mrp",
                "itemname",
                "billedqty",
            };

            var missingHeaders = requiredHeaders.Where(header => !headerMap.ContainsKey(header)).ToList();
            if (missingHeaders.Count > 0)
                return BadRequest<ImportResultDto>($"Missing required columns: {string.Join(", ", missingHeaders)}");

            await DeleteOrphanHeadersAsync();

            var uploadInvoiceRows = dataRows
                .Select(row => new
                {
                    RowNumber = row.RowNumber(),
                    InvoiceNumber = row.Cell(headerMap["invoiceno"]).GetString().Trim(),
                })
                .Where(x => !string.IsNullOrWhiteSpace(x.InvoiceNumber))
                .ToList();

            var uploadInvoiceNumbers = uploadInvoiceRows
                .Select(x => x.InvoiceNumber)
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            if (uploadInvoiceNumbers.Count > 0)
            {
                var existingInvoiceNumbers = await _context.PoInvoiceHeaders
                    .Where(x => uploadInvoiceNumbers.Contains(x.InvoiceNumber))
                    .Select(x => x.InvoiceNumber)
                    .ToListAsync();

                if (existingInvoiceNumbers.Count > 0)
                {
                    var duplicateInvoiceSet = new HashSet<string>(existingInvoiceNumbers, StringComparer.OrdinalIgnoreCase);
                    var duplicateErrors = uploadInvoiceRows
                        .Where(x => duplicateInvoiceSet.Contains(x.InvoiceNumber))
                        .GroupBy(x => x.InvoiceNumber, StringComparer.OrdinalIgnoreCase)
                        .Select(group =>
                            $"Invoice {group.Key} already exists in inward. Re-upload is not allowed. Rows: {string.Join(", ", group.Select(x => x.RowNumber))}")
                        .ToList();

                    return BadRequest<ImportResultDto>(
                        "Upload blocked. One or more invoice numbers already exist in inward.",
                        duplicateErrors);
                }
            }

            foreach (var row in dataRows)
            {
                try
                {
                    var invoiceNumber = row.Cell(headerMap["invoiceno"]).GetString().Trim();
                    var invoiceDateCell = row.Cell(headerMap["invdate"]);
                    var partyName = row.Cell(headerMap["partyname"]).GetString().Trim();
                    var partNo = row.Cell(headerMap["partno"]).GetString().Trim();
                    var itemName = row.Cell(headerMap["itemname"]).GetString().Trim();
                    var billedQtyText = row.Cell(headerMap["billedqty"]).GetString().Trim();

                    if (string.IsNullOrWhiteSpace(invoiceNumber) && string.IsNullOrWhiteSpace(partyName) && string.IsNullOrWhiteSpace(partNo) && string.IsNullOrWhiteSpace(itemName))
                        continue;

                    if (string.IsNullOrWhiteSpace(invoiceNumber))
                    {
                        result.Errors.Add($"Row {row.RowNumber()}: Invoice No. is required.");
                        continue;
                    }

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
                    if (!string.IsNullOrWhiteSpace(partNo))
                    {
                        var partNoLower = partNo.Trim().ToLower();
                        product = await _context.Products.FirstOrDefaultAsync(x => (x.Sku != null && x.Sku.ToLower() == partNoLower) || (x.Alias != null && x.Alias.ToLower() == partNoLower));
                    }

                    if (product == null && !string.IsNullOrWhiteSpace(itemName))
                    {
                        var itemNameLower = itemName.Trim().ToLower();
                        product = await _context.Products.FirstOrDefaultAsync(x => x.Name.ToLower() == itemNameLower);
                    }

                    if (product == null)
                    {
                        if (string.IsNullOrWhiteSpace(itemName))
                        {
                            result.Errors.Add($"Row {row.RowNumber()}: Product name (Item Name) is required to create a new product.");
                            continue;
                        }

                        if (!decimal.TryParse(row.Cell(headerMap["mrp"]).GetString(), out decimal mrpVal))
                        {
                            try
                            {
                                mrpVal = (decimal)row.Cell(headerMap["mrp"]).GetDouble();
                            }
                            catch
                            {
                                mrpVal = 0;
                            }
                        }

                        product = new Product
                        {
                            Name = itemName,
                            Sku = string.IsNullOrWhiteSpace(partNo) ? null : partNo,
                            ManufacturerId = null,
                            Mrp = mrpVal,
                            BestBeforeMonths = 84,
                            UnitType = "pcs",
                            CountryOfOrigin = "India",
                            Ownership = "Self"
                        };
                        product.CalculateUssp();

                        _context.Products.Add(product);
                        await _context.SaveChangesAsync();
                    }

                    if (product.ManufacturerId == null && !string.IsNullOrWhiteSpace(partyName))
                    {
                        var manufacturer = await GetOrCreateManufacturerAsync(partyName, manufacturerCache);
                        product.ManufacturerId = manufacturer.Id;
                        product.Manufacturer = manufacturer;
                    }

                    var header = await GetOrCreateInvoiceHeaderAsync(invoiceNumber, invoiceDate.Value, partyName);

                    var entity = new PoInvoice
                    {
                        PoInvoiceHeaderId = header.Id,
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
            await DeleteOrphanHeadersAsync();

            if (result.ImportedCount == 0)
            {
                return BadRequest<ImportResultDto>(
                    "Upload did not create any inward rows.",
                    result.Errors.Count > 0
                        ? result.Errors
                        : new List<string> { "No valid inward rows were found in the uploaded file." });
            }

            result.Success = true;
            if (result.ImportedCount > 0)
            {
                await SendNotificationAsync(new RealtimeNotificationDto
                {
                    Type = "po_invoice.imported",
                    Title = "Invoices imported",
                    Message = $"{result.ImportedCount} invoice rows were imported.",
                    Severity = "success",
                    Data = new Dictionary<string, object?>
                    {
                        ["importedCount"] = result.ImportedCount,
                        ["errorCount"] = result.Errors.Count,
                    },
                });
            }

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

        var maxInvoice = await _context.PoInvoiceHeaders
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
            InvoiceNumber = invoice.Header?.InvoiceNumber ?? string.Empty,
            InvoiceDate = invoice.Header?.InvoiceDate ?? default,
            PartyName = invoice.Header?.PartyName ?? string.Empty,
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

    private static PoInvoiceHeaderSummaryDto MapHeaderSummary(PoInvoiceHeader header)
    {
        var items = header.Items
            .OrderBy(item => item.Id)
            .Select(MapInvoice)
            .ToList();

        return new PoInvoiceHeaderSummaryDto
        {
            Id = header.Id,
            InvoiceNumber = header.InvoiceNumber,
            InvoiceDate = header.InvoiceDate,
            PartyName = header.PartyName,
            TotalBilledQty = items.Sum(item => item.BilledQty),
            TotalRemainingAllocation = items.Sum(item => item.RemainingAllocation),
            ProductCount = items.Count,
            PrintedCount = items.Count(item => item.Printed),
            PendingCount = items.Count(item => !item.Printed),
            Items = items,
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

    private async Task<PoInvoiceHeader> GetOrCreateInvoiceHeaderAsync(string invoiceNumber, DateTime invoiceDate, string partyName, int? currentHeaderId = null)
    {
        var normalizedInvoiceNumber = invoiceNumber.Trim();
        var normalizedInvoiceDate = NormalizeInvoiceDate(invoiceDate);
        var normalizedPartyName = partyName.Trim();

        var existingHeader = await _context.PoInvoiceHeaders
            .FirstOrDefaultAsync(x => x.InvoiceNumber == normalizedInvoiceNumber);

        if (existingHeader == null)
        {
            var nextHeader = new PoInvoiceHeader
            {
                InvoiceNumber = normalizedInvoiceNumber,
                InvoiceDate = normalizedInvoiceDate,
                PartyName = normalizedPartyName,
            };

            _context.PoInvoiceHeaders.Add(nextHeader);
            await _context.SaveChangesAsync();
            return nextHeader;
        }

        var headerMismatch =
            existingHeader.InvoiceDate != normalizedInvoiceDate ||
            !string.Equals(existingHeader.PartyName, normalizedPartyName, StringComparison.OrdinalIgnoreCase);

        if (headerMismatch && currentHeaderId != existingHeader.Id)
        {
            throw new InvalidOperationException(
                $"Invoice {normalizedInvoiceNumber} already exists with a different invoice date or party name.");
        }

        if (currentHeaderId == existingHeader.Id)
        {
            existingHeader.InvoiceDate = normalizedInvoiceDate;
            existingHeader.PartyName = normalizedPartyName;
            await _context.SaveChangesAsync();
        }

        return existingHeader;
    }

    private async Task<Manufacturer> GetOrCreateManufacturerAsync(
        string manufacturerName,
        IDictionary<string, Manufacturer> manufacturerCache)
    {
        var normalizedName = manufacturerName.Trim();
        if (manufacturerCache.TryGetValue(normalizedName, out var cachedManufacturer))
        {
            return cachedManufacturer;
        }

        var existingManufacturer = await _context.Manufacturers
            .FirstOrDefaultAsync(x => x.Name == normalizedName);

        if (existingManufacturer != null)
        {
            manufacturerCache[normalizedName] = existingManufacturer;
            return existingManufacturer;
        }

        var manufacturer = new Manufacturer
        {
            Name = normalizedName,
        };

        _context.Manufacturers.Add(manufacturer);
        await _context.SaveChangesAsync();
        manufacturerCache[normalizedName] = manufacturer;
        return manufacturer;
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

    private async Task DeleteHeaderIfOrphanedAsync(int? headerId = null)
    {
        if (headerId == null)
        {
            return;
        }

        var headerHasItems = await _context.PoInvoices.AnyAsync(x => x.PoInvoiceHeaderId == headerId.Value);
        if (headerHasItems)
        {
            return;
        }

        var header = await _context.PoInvoiceHeaders.FindAsync(headerId.Value);
        if (header == null)
        {
            return;
        }

        _context.PoInvoiceHeaders.Remove(header);
        await _context.SaveChangesAsync();
    }

    private async Task DeleteOrphanHeadersAsync()
    {
        var orphanHeaders = await _context.PoInvoiceHeaders
            .Where(header => !_context.PoInvoices.Any(item => item.PoInvoiceHeaderId == header.Id))
            .ToListAsync();

        if (orphanHeaders.Count == 0)
        {
            return;
        }

        _context.PoInvoiceHeaders.RemoveRange(orphanHeaders);
        await _context.SaveChangesAsync();
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

    private Task SendNotificationAsync(RealtimeNotificationDto notification)
    {
        return _notificationHub.Clients.All.SendAsync("ReceiveNotification", notification);
    }
}
