using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using PlusgrowWms.Api.Data;
using PlusgrowWms.Api.DTOs;
using PlusgrowWms.Api.Helpers;
using PlusgrowWms.Api.Models;
using System.Text.Json;

namespace PlusgrowWms.Api.Controllers;

public class StockCheckReportsController : BaseController
{
    private readonly PlusgrowDbContext _context;
    private readonly ILogger<StockCheckReportsController> _logger;

    public StockCheckReportsController(PlusgrowDbContext context, ILogger<StockCheckReportsController> logger)
    {
        _context = context;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<StockCheckReportDto>>>> GetReports(
        [FromQuery] string? checkType,
        [FromQuery] string? search,
        [FromQuery] string? fromDate,
        [FromQuery] string? toDate,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        try
        {
            var query = _context.StockCheckReports.AsQueryable();

            if (!string.IsNullOrWhiteSpace(checkType))
            {
                var normalizedType = checkType.Trim().ToUpper();
                query = query.Where(x => x.CheckType == normalizedType);
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                var normalized = search.Trim().ToLower();
                query = query.Where(x =>
                    x.ReferenceName.ToLower().Contains(normalized) ||
                    (x.PerformedByName != null && x.PerformedByName.ToLower().Contains(normalized)) ||
                    (x.Notes != null && x.Notes.ToLower().Contains(normalized)));
            }

            if (!string.IsNullOrWhiteSpace(fromDate) && DateTime.TryParse(fromDate, out var from))
            {
                var fromNormalized = DateTime.SpecifyKind(from.Date, DateTimeKind.Unspecified);
                query = query.Where(x => x.CreatedAt >= fromNormalized);
            }

            if (!string.IsNullOrWhiteSpace(toDate) && DateTime.TryParse(toDate, out var to))
            {
                var toNormalized = DateTime.SpecifyKind(to.Date.AddDays(1), DateTimeKind.Unspecified);
                query = query.Where(x => x.CreatedAt < toNormalized);
            }

            var total = await query.CountAsync();

            var rows = await query
                .OrderByDescending(x => x.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var dtos = rows.Select(MapToDto).ToList();
            return Success(dtos, page, pageSize, total);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching stock check reports");
            return Error<List<StockCheckReportDto>>($"Error fetching reports: {ex.Message}");
        }
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ApiResponse<StockCheckReportDto>>> GetReport(int id)
    {
        var entity = await _context.StockCheckReports.FindAsync(id);
        if (entity == null)
            return NotFound<StockCheckReportDto>("Stock check report not found");

        return Success(MapToDto(entity));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<StockCheckReportDto>>> CreateReport([FromBody] CreateStockCheckReportDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.CheckType))
            return BadRequest<StockCheckReportDto>("Check type is required");

        if (string.IsNullOrWhiteSpace(dto.ReferenceName))
            return BadRequest<StockCheckReportDto>("Reference name is required");

        var status = string.IsNullOrWhiteSpace(dto.Status)
            ? "COMPLETED"
            : dto.Status.Trim().ToUpper();

        if (status is not ("IN_PROGRESS" or "PAUSED" or "COMPLETED"))
            return BadRequest<StockCheckReportDto>("Invalid stock check status");

        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        int? performedByUserId = int.TryParse(userIdClaim, out var parsedUserId) ? parsedUserId : null;
        var performedByName = User.FindFirstValue(ClaimTypes.GivenName)
            ?? User.Identity?.Name
            ?? "System User";

        var entity = new StockCheckReport
        {
            CheckType = dto.CheckType.Trim().ToUpper(),
            ReferenceName = dto.ReferenceName.Trim(),
            TotalSystemQty = dto.TotalSystemQty,
            TotalScannedQty = dto.TotalScannedQty,
            TotalVariance = dto.TotalVariance,
            ItemsChecked = dto.ItemsChecked,
            ItemsWithVariance = dto.ItemsWithVariance,
            ItemsJson = dto.ItemsJson,
            Status = status,
            Notes = dto.Notes?.Trim(),
            PerformedByUserId = performedByUserId,
            PerformedByName = performedByName,
            CreatedAt = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified),
        };

        _context.StockCheckReports.Add(entity);

        // Defer stock updates to this point for inward verifications
        if (entity.CheckType == "INWARD_VERIFY" && entity.Status == "COMPLETED" && !string.IsNullOrWhiteSpace(entity.ItemsJson))
        {
            try
            {
                var invoiceHeader = await ResolveInwardInvoiceHeaderAsync(entity.Notes, entity.ReferenceName);
                var inwardMovementReference = BuildInwardMovementReference(
                    entity.ReferenceName,
                    entity.Notes,
                    invoiceHeader);
                using var doc = JsonDocument.Parse(entity.ItemsJson);
                if (doc.RootElement.ValueKind == JsonValueKind.Array)
                {
                    foreach (var element in doc.RootElement.EnumerateArray())
                    {
                        if (element.TryGetProperty("productId", out var productIdEl) && productIdEl.ValueKind == JsonValueKind.Number)
                        {
                            var productId = productIdEl.GetInt32();
                            var scannedQty = 0;
                            if (element.TryGetProperty("scannedQty", out var scannedQtyEl) && scannedQtyEl.ValueKind == JsonValueKind.Number)
                            {
                                scannedQty = scannedQtyEl.GetInt32();
                            }

                            if (productId > 0 && scannedQty > 0)
                            {
                                await UpsertProductQuantityAsync(
                                    productId,
                                    scannedQty,
                                    inwardMovementReference,
                                    performedByUserId,
                                    performedByName);
                            }

                            if (productId > 0 && invoiceHeader != null)
                            {
                                var invoiceRow = invoiceHeader.Items.FirstOrDefault(item => item.ProductId == productId);
                                if (invoiceRow != null)
                                {
                                    var verifiedQuantity = Math.Clamp(scannedQty, 0, invoiceRow.BilledQty);
                                    invoiceRow.VerifiedQuantity = verifiedQuantity;
                                    invoiceRow.RemainingAllocation = verifiedQuantity;
                                    invoiceRow.LocationAllotted = verifiedQuantity == 0;
                                }
                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to parse ItemsJson or update stock for INWARD_VERIFY");
            }
        }

        await _context.SaveChangesAsync();

        _logger.LogInformation("Stock check report created: {CheckType} - {ReferenceName} by {User}",
            entity.CheckType, entity.ReferenceName, performedByName);

        return Success(MapToDto(entity), "Stock check report saved successfully");
    }

    private async Task<PoInvoiceHeader?> ResolveInwardInvoiceHeaderAsync(string? notesJson, string referenceName)
    {
        string? invoiceNumber = null;
        string? partyName = null;
        DateTime? invoiceDate = null;

        if (!string.IsNullOrWhiteSpace(notesJson))
        {
            try
            {
                using var notes = JsonDocument.Parse(notesJson);
                var root = notes.RootElement;
                invoiceNumber = root.TryGetProperty("referenceName", out var invoiceElement)
                    ? invoiceElement.GetString()
                    : null;
                partyName = root.TryGetProperty("partyName", out var partyElement)
                    ? partyElement.GetString()
                    : null;
                var dateText = root.TryGetProperty("invoiceDate", out var dateElement)
                    ? dateElement.GetString()
                    : null;
                if (DateTime.TryParse(dateText, out var parsedDate))
                    invoiceDate = parsedDate.Date;
            }
            catch
            {
                // Fall back to the legacy "invoice - party" reference below.
            }
        }

        if (string.IsNullOrWhiteSpace(invoiceNumber))
        {
            var referenceParts = referenceName.Split(" - ", 2, StringSplitOptions.TrimEntries);
            invoiceNumber = referenceParts.ElementAtOrDefault(0);
            partyName = referenceParts.ElementAtOrDefault(1);
        }

        if (string.IsNullOrWhiteSpace(invoiceNumber))
            return null;

        var query = _context.PoInvoiceHeaders
            .Include(header => header.Items)
            .Where(header => header.InvoiceNumber.ToLower() == invoiceNumber.Trim().ToLower());

        if (!string.IsNullOrWhiteSpace(partyName))
            query = query.Where(header => header.PartyName.ToLower() == partyName.Trim().ToLower());

        if (invoiceDate.HasValue)
            query = query.Where(header => header.InvoiceDate.Date == invoiceDate.Value);

        return await query.OrderByDescending(header => header.Id).FirstOrDefaultAsync();
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<ApiResponse<StockCheckReportDto>>> UpdateReport(int id, [FromBody] UpdateStockCheckReportDto dto)
    {
        var entity = await _context.StockCheckReports.FindAsync(id);
        if (entity == null)
            return NotFound<StockCheckReportDto>("Stock check report not found");

        if (string.IsNullOrWhiteSpace(dto.CheckType))
            return BadRequest<StockCheckReportDto>("Check type is required");

        if (string.IsNullOrWhiteSpace(dto.ReferenceName))
            return BadRequest<StockCheckReportDto>("Reference name is required");

        var status = string.IsNullOrWhiteSpace(dto.Status)
            ? entity.Status
            : dto.Status.Trim().ToUpper();

        if (status is not ("IN_PROGRESS" or "PAUSED" or "COMPLETED"))
            return BadRequest<StockCheckReportDto>("Invalid stock check status");

        entity.CheckType = dto.CheckType.Trim().ToUpper();
        entity.ReferenceName = dto.ReferenceName.Trim();
        entity.TotalSystemQty = dto.TotalSystemQty;
        entity.TotalScannedQty = dto.TotalScannedQty;
        entity.TotalVariance = dto.TotalVariance;
        entity.ItemsChecked = dto.ItemsChecked;
        entity.ItemsWithVariance = dto.ItemsWithVariance;
        entity.ItemsJson = dto.ItemsJson;
        entity.Status = status;
        entity.Notes = dto.Notes?.Trim();

        await _context.SaveChangesAsync();

        _logger.LogInformation("Stock check report updated: {Id} {CheckType} - {ReferenceName} status {Status}",
            entity.Id, entity.CheckType, entity.ReferenceName, entity.Status);

        return Success(MapToDto(entity), "Stock check report updated successfully");
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult<ApiResponse>> DeleteReport(int id)
    {
        var entity = await _context.StockCheckReports.FindAsync(id);
        if (entity == null)
            return NotFound("Stock check report not found");

        _context.StockCheckReports.Remove(entity);
        await _context.SaveChangesAsync();

        return Ok("Stock check report deleted successfully");
    }

    private static StockCheckReportDto MapToDto(StockCheckReport entity)
    {
        return new StockCheckReportDto
        {
            Id = entity.Id,
            CheckType = entity.CheckType,
            ReferenceName = entity.ReferenceName,
            TotalSystemQty = entity.TotalSystemQty,
            TotalScannedQty = entity.TotalScannedQty,
            TotalVariance = entity.TotalVariance,
            ItemsChecked = entity.ItemsChecked,
            ItemsWithVariance = entity.ItemsWithVariance,
            ItemsJson = entity.ItemsJson,
            Status = entity.Status,
            Notes = entity.Notes,
            PerformedByName = entity.PerformedByName,
            PerformedByUserId = entity.PerformedByUserId,
            CreatedAt = entity.CreatedAt,
        };
    }

    private static string BuildInwardMovementReference(
        string referenceName,
        string? notesJson,
        PoInvoiceHeader? invoiceHeader)
    {
        var invoiceNumber = invoiceHeader?.InvoiceNumber;
        var partyName = invoiceHeader?.PartyName;
        string? shortfallRemark = null;

        if (!string.IsNullOrWhiteSpace(notesJson))
        {
            try
            {
                using var notes = JsonDocument.Parse(notesJson);
                var root = notes.RootElement;
                invoiceNumber ??= root.TryGetProperty("referenceName", out var invoiceElement)
                    ? invoiceElement.GetString()
                    : null;
                partyName ??= root.TryGetProperty("partyName", out var partyElement)
                    ? partyElement.GetString()
                    : null;
                shortfallRemark = root.TryGetProperty("shortfallRemark", out var remarkElement)
                    ? remarkElement.GetString()
                    : null;
            }
            catch
            {
                // Keep the report reference as the fallback for legacy notes.
            }
        }

        var reference = !string.IsNullOrWhiteSpace(invoiceNumber)
            ? $"Inward Invoice: {invoiceNumber}"
            : $"Inward: {referenceName}";

        if (!string.IsNullOrWhiteSpace(partyName))
            reference += $"; Party: {partyName}";

        if (!string.IsNullOrWhiteSpace(shortfallRemark))
            reference += $"; Remark: {shortfallRemark.Trim()}";

        return reference;
    }

    private async Task UpsertProductQuantityAsync(
        int productId,
        int verifiedQty,
        string movementReference,
        int? performedByUserId,
        string performedByName)
    {
        var quantityRow = _context.ProductQuantities.Local.FirstOrDefault(x => x.ProductId == productId)
            ?? await _context.ProductQuantities.FirstOrDefaultAsync(x => x.ProductId == productId);

        if (quantityRow == null)
        {
            _context.ProductQuantities.Add(new ProductQuantity
            {
                ProductId = productId,
                CurrentQuantity = verifiedQty,
                UpdatedAt = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified),
            });
            RecordStockMovement(
                productId,
                0,
                verifiedQty,
                "Inward Receipt (Verified)",
                "inward",
                $"{movementReference}; Verified Qty: {verifiedQty}",
                performedByUserId,
                performedByName);
            return;
        }

        var quantityBefore = quantityRow.CurrentQuantity;
        quantityRow.CurrentQuantity += verifiedQty;
        quantityRow.UpdatedAt = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified);
        RecordStockMovement(
            productId,
            quantityBefore,
            quantityRow.CurrentQuantity,
            "Inward Receipt (Verified)",
            "inward",
            $"{movementReference}; Verified Qty: {verifiedQty}",
            performedByUserId,
            performedByName);
    }

    private void RecordStockMovement(int productId, int quantityBefore, int quantityAfter, string reason, string movementType, string notes, int? performedByUserId, string performedByName)
    {
        _context.ProductStockMovements.Add(new ProductStockMovement
        {
            ProductId = productId,
            QuantityChange = quantityAfter - quantityBefore,
            QuantityBefore = quantityBefore,
            QuantityAfter = quantityAfter,
            Reason = reason,
            MovementType = movementType,
            Notes = notes,
            PerformedByUserId = performedByUserId,
            PerformedByName = performedByName,
            CreatedAt = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified),
        });
    }
}
