using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PlusgrowWms.Api.Data;
using PlusgrowWms.Api.Helpers;
using PlusgrowWms.Api.Models;
using PlusgrowWms.Api.DTOs;
using ClosedXML.Excel;

namespace PlusgrowWms.Api.Controllers;

public class CommoditiesController : BaseController
{
    private readonly PlusgrowDbContext _context;

    public CommoditiesController(PlusgrowDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<Commodity>>>> GetCommodities()
    {
        var commodities = await _context.Commodities.ToListAsync();
        return Success(commodities);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ApiResponse<Commodity>>> GetCommodity(int id)
    {
        var commodity = await _context.Commodities.FindAsync(id);
        if (commodity == null)
            return NotFound<Commodity>("Commodity not found");
        return Success(commodity);
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<Commodity>>> CreateCommodity([FromBody] Commodity commodity)
    {
        _context.Commodities.Add(commodity);
        await _context.SaveChangesAsync();
        return Success(commodity, "Commodity created successfully");
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<ApiResponse<Commodity>>> UpdateCommodity(int id, [FromBody] Commodity commodity)
    {
        if (id != commodity.Id)
            return BadRequest<Commodity>("ID mismatch");

        _context.Entry(commodity).State = EntityState.Modified;

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            if (!CommodityExists(id))
                return NotFound<Commodity>("Commodity not found");
            throw;
        }

        return Success(commodity, "Commodity updated successfully");
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult<ApiResponse>> DeleteCommodity(int id)
    {
        var commodity = await _context.Commodities.FindAsync(id);
        if (commodity == null)
            return NotFound("Commodity not found");

        _context.Commodities.Remove(commodity);
        await _context.SaveChangesAsync();

        return Ok("Commodity deleted successfully");
    }

    private bool CommodityExists(int id) => _context.Commodities.Any(e => e.Id == id);

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
