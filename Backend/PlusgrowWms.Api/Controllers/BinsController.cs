using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PlusgrowWms.Api.Data;
using PlusgrowWms.Api.Helpers;
using PlusgrowWms.Api.Models;
using PlusgrowWms.Api.DTOs;
using AutoMapper;
using ClosedXML.Excel;

namespace PlusgrowWms.Api.Controllers;

public class BinsController : BaseController
{
    private readonly PlusgrowDbContext _context;
    private readonly IMapper _mapper;
    private readonly ILogger<BinsController> _logger;
    
    public BinsController(PlusgrowDbContext context, IMapper mapper, ILogger<BinsController> logger)
    {
        _context = context;
        _mapper = mapper;
        _logger = logger;
    }
    
    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<BinDto>>>> GetBins()
    {
        try
        {
            var bins = await _context.Bins.OrderBy(b => b.BinCode).ToListAsync();
            _logger.LogInformation("Fetched {Count} bins from DB", bins.Count);
            return Success(_mapper.Map<List<BinDto>>(bins));
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
        var bin = await _context.Bins.FindAsync(id);
        if (bin == null)
            return NotFound<BinDto>("Bin not found");
        return Success(_mapper.Map<BinDto>(bin));
    }
    
    [HttpPost]
    public async Task<ActionResult<ApiResponse<BinDto>>> CreateBin([FromBody] CreateBinDto createBinDto)
    {
        try
        {
            var bin = _mapper.Map<Bin>(createBinDto);
            _context.Bins.Add(bin);
            await _context.SaveChangesAsync();
            var totalCount = await _context.Bins.CountAsync();
            return Success(_mapper.Map<BinDto>(bin), $"Bin created successfully. Total in DB: {totalCount}");
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
        if (id != updateBinDto.Id)
            return BadRequest<BinDto>("ID mismatch");
            
        var bin = await _context.Bins.FindAsync(id);
        if (bin == null)
            return NotFound<BinDto>("Bin not found");
            
        _mapper.Map(updateBinDto, bin);
        await _context.SaveChangesAsync();
        
        return Success(_mapper.Map<BinDto>(bin), "Bin updated successfully");
    }
    
    [HttpDelete("{id}")]
    public async Task<ActionResult<ApiResponse>> DeleteBin(int id)
    {
        var bin = await _context.Bins.FindAsync(id);
        if (bin == null)
            return NotFound("Bin not found");
            
        _context.Bins.Remove(bin);
        await _context.SaveChangesAsync();
        
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
