using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PlusgrowWms.Api.Data;
using PlusgrowWms.Api.Helpers;
using PlusgrowWms.Api.Models;
using PlusgrowWms.Api.DTOs;
using AutoMapper;
using ClosedXML.Excel;
using PlusgrowWms.Api.Services;

namespace PlusgrowWms.Api.Controllers;

public class BinsController : BaseController
{
    private readonly PlusgrowDbContext _context;
    private readonly IBinService _binService;
    private readonly ILogger<BinsController> _logger;
    
    public BinsController(PlusgrowDbContext context, IBinService binService, ILogger<BinsController> logger)
    {
        _context = context;
        _binService = binService;
        _logger = logger;
    }
    
    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<BinDto>>>> GetBins()
    {
        try
        {
            var bins = await _binService.GetAllAsync();
            _logger.LogInformation("Fetched {Count} bins from DB", bins.Count);
            return Success(bins);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching bins");
            return Error<List<BinDto>>($"Error fetching bins: {ex.Message}");
        }
    }
    
    [HttpGet("{id}")]
    public async Task<ActionResult<ApiResponse<BinDto>>> GetBin(int id)
    {
        var bin = await _binService.GetByIdAsync(id);
        if (bin == null)
            return NotFound<BinDto>("Bin not found");
        return Success(bin);
    }
    
    [HttpPost]
    public async Task<ActionResult<ApiResponse<BinDto>>> CreateBin([FromBody] CreateBinDto createBinDto)
    {
        try
        {
            var (bin, totalCount) = await _binService.CreateAsync(createBinDto);
            return Success(bin!, $"Bin created successfully. Total in DB: {totalCount}");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating bin");
            return Error<BinDto>($"Failed to save bin: {ex.InnerException?.Message ?? ex.Message}");
        }
    }
    
    [HttpPut("{id}")]
    public async Task<ActionResult<ApiResponse<BinDto>>> UpdateBin(int id, [FromBody] UpdateBinDto updateBinDto)
    {
        var (bin, error) = await _binService.UpdateAsync(id, updateBinDto);
        if (error == "ID mismatch")
            return BadRequest<BinDto>(error);
        if (bin == null)
            return NotFound<BinDto>("Bin not found");
        
        return Success(bin, "Bin updated successfully");
    }
    
    [HttpDelete("{id}")]
    public async Task<ActionResult<ApiResponse>> DeleteBin(int id)
    {
        if (!await _binService.DeleteAsync(id))
            return NotFound("Bin not found");
        
        return Ok("Bin deleted successfully");
    }

    [HttpPost("upload")]
    [DisableRequestSizeLimit]
    public async Task<ActionResult<ApiResponse<ImportResultDto>>> UploadExcel(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest<ImportResultDto>("Please upload a valid Excel file");

        var result = new ImportResultDto();
        
        try
        {
            using var stream = new MemoryStream();
            await file.CopyToAsync(stream);
            stream.Position = 0;
            
            using var workbook = new XLWorkbook(stream);
            var worksheet = workbook.Worksheets.First();
            var rows = worksheet.RangeUsed().RowsUsed().Skip(1);
            
            foreach (var row in rows)
            {
                var binCode = row.Cell(1).GetString()?.Trim();
                if (string.IsNullOrEmpty(binCode)) continue;

                if (!await _context.Bins.AnyAsync(b => b.BinCode == binCode))
                {
                    _context.Bins.Add(new Bin { BinCode = binCode });
                    result.ImportedCount++;
                }
                else
                {
                    result.Errors.Add($"Row {row.RowNumber()}: Bin code '{binCode}' already exists.");
                }
            }
            
            await _context.SaveChangesAsync();
            result.Success = true;
            return Success(result, $"Imported {result.ImportedCount} bins successfully");
        }
        catch (Exception ex)
        {
            return Error<ImportResultDto>($"Error processing file: {ex.Message}");
        }
    }
}
