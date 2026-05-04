using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PlusgrowWms.Api.Data;
using PlusgrowWms.Api.Helpers;
using PlusgrowWms.Api.Models;
using PlusgrowWms.Api.DTOs;
using PlusgrowWms.Api.Services;
using ClosedXML.Excel;

namespace PlusgrowWms.Api.Controllers;

public class CommoditiesController : BaseController
{
    private readonly PlusgrowDbContext _context;
    private readonly ICommodityService _commodityService;

    public CommoditiesController(PlusgrowDbContext context, ICommodityService commodityService)
    {
        _context = context;
        _commodityService = commodityService;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<Commodity>>>> GetCommodities([FromQuery] ListQueryDto queryDto)
    {
        var result = await _commodityService.GetPagedAsync(queryDto);
        return Success(result.Items, result.Page, result.PageSize, result.Total);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ApiResponse<Commodity>>> GetCommodity(int id)
    {
        var commodity = await _commodityService.GetByIdAsync(id);
        if (commodity == null)
            return NotFound<Commodity>("Commodity not found");
        return Success(commodity);
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<Commodity>>> CreateCommodity([FromBody] Commodity commodity)
    {
        var createdCommodity = await _commodityService.CreateAsync(commodity);
        return Success(createdCommodity, "Commodity created successfully");
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<ApiResponse<Commodity>>> UpdateCommodity(int id, [FromBody] Commodity commodity)
    {
        var (updatedCommodity, error) = await _commodityService.UpdateAsync(id, commodity);
        if (error == "ID mismatch")
            return BadRequest<Commodity>(error);

        if (updatedCommodity == null)
            return NotFound<Commodity>("Commodity not found");

        return Success(updatedCommodity, "Commodity updated successfully");
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult<ApiResponse>> DeleteCommodity(int id)
    {
        var deleted = await _commodityService.DeleteAsync(id);
        if (!deleted)
            return NotFound("Commodity not found");

        return Ok("Commodity deleted successfully");
    }

    [HttpPost("upload")]
    [DisableRequestSizeLimit]
    [RequestFormLimits(MultipartBodyLengthLimit = 104857600)]
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
            using var stream = file.OpenReadStream();
            using var workbook = new XLWorkbook(stream);
            var worksheet = workbook.Worksheet(1);

            var existingCommodities = await _context.Commodities.ToListAsync();
            var commodityCache = new Dictionary<string, Commodity>(StringComparer.OrdinalIgnoreCase);
            foreach (var c in existingCommodities)
            {
                commodityCache[c.Name] = c;
            }

            var rows = worksheet.RowsUsed().Skip(1).ToList();
            foreach (var row in rows)
            {
                try
                {
                    var name = row.Cell(1).GetValue<string>().Trim();
                    if (string.IsNullOrWhiteSpace(name))
                    {
                        result.Errors.Add($"Row {row.RowNumber()}: Commodity name is required");
                        continue;
                    }

                    if (!commodityCache.ContainsKey(name))
                    {
                        var newCommodity = new Commodity { Name = name };
                        _context.Commodities.Add(newCommodity);
                        commodityCache[name] = newCommodity;
                        result.ImportedCount++;
                    }
                }
                catch (Exception ex)
                {
                    result.Errors.Add($"Row {row.RowNumber()}: {ex.Message}");
                }
            }

            if (result.ImportedCount > 0)
            {
                await _context.SaveChangesAsync();
            }

            result.Success = true;
            return Success(result, $"Imported {result.ImportedCount} commodities");
        }
        catch (Exception ex)
        {
            return Error<ImportResultDto>($"Error processing file: {ex.Message}");
        }
    }
}
