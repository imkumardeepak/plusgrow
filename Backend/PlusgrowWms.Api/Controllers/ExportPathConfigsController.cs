using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PlusgrowWms.Api.Data;
using PlusgrowWms.Api.DTOs;
using PlusgrowWms.Api.Helpers;
using PlusgrowWms.Api.Models;

namespace PlusgrowWms.Api.Controllers;

public class ExportPathConfigsController : BaseController
{
    private static readonly HashSet<string> ValidExportTypes =
        new(StringComparer.OrdinalIgnoreCase) { "WmsStock", "SelfProducts", "TallyStock" };

    private readonly PlusgrowDbContext _context;

    public ExportPathConfigsController(PlusgrowDbContext context)
    {
        _context = context;
    }

    // GET api/exportpathconfigs
    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<ExportPathConfig>>>> GetAll()
    {
        var configs = await _context.ExportPathConfigs
            .AsNoTracking()
            .OrderBy(x => x.ExportType)
            .ToListAsync();

        return Success(configs);
    }

    // GET api/exportpathconfigs/5
    [HttpGet("{id:int}")]
    public async Task<ActionResult<ApiResponse<ExportPathConfig>>> GetById(int id)
    {
        var config = await _context.ExportPathConfigs.FindAsync(id);
        if (config == null)
            return NotFound<ExportPathConfig>("Export path config not found.");

        return Success(config);
    }

    // POST api/exportpathconfigs
    [HttpPost]
    public async Task<ActionResult<ApiResponse<ExportPathConfig>>> Create([FromBody] CreateExportPathConfigDto dto)
    {
        if (!ValidExportTypes.Contains(dto.ExportType))
            return BadRequest<ExportPathConfig>($"Invalid ExportType '{dto.ExportType}'. Valid values: WmsStock, SelfProducts, TallyStock.");

        if (string.IsNullOrWhiteSpace(dto.FolderPath))
            return BadRequest<ExportPathConfig>("FolderPath is required.");

        var config = new ExportPathConfig
        {
            ExportType = dto.ExportType,
            FolderPath = dto.FolderPath.Trim(),
            FileName = string.IsNullOrWhiteSpace(dto.FileName) ? null : dto.FileName.Trim(),
            IsEnabled = dto.IsEnabled,
            CreatedAt = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified),
        };

        _context.ExportPathConfigs.Add(config);
        await _context.SaveChangesAsync();

        return Success(config, "Export path config created successfully.");
    }

    // PUT api/exportpathconfigs/5
    [HttpPut("{id:int}")]
    public async Task<ActionResult<ApiResponse<ExportPathConfig>>> Update(int id, [FromBody] CreateExportPathConfigDto dto)
    {
        var config = await _context.ExportPathConfigs.FindAsync(id);
        if (config == null)
            return NotFound<ExportPathConfig>("Export path config not found.");

        if (!ValidExportTypes.Contains(dto.ExportType))
            return BadRequest<ExportPathConfig>($"Invalid ExportType '{dto.ExportType}'. Valid values: WmsStock, SelfProducts, TallyStock.");

        if (string.IsNullOrWhiteSpace(dto.FolderPath))
            return BadRequest<ExportPathConfig>("FolderPath is required.");

        config.ExportType = dto.ExportType;
        config.FolderPath = dto.FolderPath.Trim();
        config.FileName = string.IsNullOrWhiteSpace(dto.FileName) ? null : dto.FileName.Trim();
        config.IsEnabled = dto.IsEnabled;

        await _context.SaveChangesAsync();

        return Success(config, "Export path config updated successfully.");
    }

    // DELETE api/exportpathconfigs/5
    [HttpDelete("{id:int}")]
    public async Task<ActionResult<ApiResponse>> Delete(int id)
    {
        var config = await _context.ExportPathConfigs.FindAsync(id);
        if (config == null)
            return NotFound("Export path config not found.");

        _context.ExportPathConfigs.Remove(config);
        await _context.SaveChangesAsync();

        return Ok("Export path config deleted successfully.");
    }
}
