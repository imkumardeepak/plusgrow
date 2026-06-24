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
                                await UpsertProductQuantityAsync(productId, scannedQty, performedByUserId, performedByName);
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

    private async Task UpsertProductQuantityAsync(int productId, int verifiedQty, int? performedByUserId, string performedByName)
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
            RecordStockMovement(productId, 0, verifiedQty, "Inward Receipt (Verified)", "inward", $"Inward receipt verified (+{verifiedQty})", performedByUserId, performedByName);
            return;
        }

        var quantityBefore = quantityRow.CurrentQuantity;
        quantityRow.CurrentQuantity += verifiedQty;
        quantityRow.UpdatedAt = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified);
        RecordStockMovement(productId, quantityBefore, quantityRow.CurrentQuantity, "Inward Receipt (Verified)", "inward", $"Inward receipt verified (+{verifiedQty})", performedByUserId, performedByName);
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
