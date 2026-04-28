using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PlusgrowWms.Api.Data;
using PlusgrowWms.Api.Helpers;
using PlusgrowWms.Api.Models;

namespace PlusgrowWms.Api.Controllers;

public class StickerPrinterConfigsController : BaseController
{
    private readonly PlusgrowDbContext _context;

    public StickerPrinterConfigsController(PlusgrowDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<StickerPrinterConfig>>>> GetConfigs()
    {
        var configs = await _context.StickerPrinterConfigs.ToListAsync();
        return Success(configs);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ApiResponse<StickerPrinterConfig>>> GetConfig(int id)
    {
        var config = await _context.StickerPrinterConfigs.FindAsync(id);
        if (config == null)
            return NotFound<StickerPrinterConfig>("Printer config not found");
        return Success(config);
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<StickerPrinterConfig>>> CreateConfig([FromBody] StickerPrinterConfig config)
    {
        config.CreatedAt = DateTime.Now;
        _context.StickerPrinterConfigs.Add(config);
        await _context.SaveChangesAsync();
        return Success(config, "Printer config created successfully");
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<ApiResponse<StickerPrinterConfig>>> UpdateConfig(int id, [FromBody] StickerPrinterConfig config)
    {
        if (id != config.Id)
            return BadRequest<StickerPrinterConfig>("ID mismatch");

        config.UpdatedAt = DateTime.Now;
        _context.Entry(config).State = EntityState.Modified;

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            if (!ConfigExists(id))
                return NotFound<StickerPrinterConfig>("Printer config not found");
            throw;
        }

        return Success(config, "Printer config updated successfully");
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult<ApiResponse>> DeleteConfig(int id)
    {
        var config = await _context.StickerPrinterConfigs.FindAsync(id);
        if (config == null)
            return NotFound("Printer config not found");

        _context.StickerPrinterConfigs.Remove(config);
        await _context.SaveChangesAsync();

        return Ok("Printer config deleted successfully");
    }

    private bool ConfigExists(int id) => _context.StickerPrinterConfigs.Any(e => e.Id == id);
}
