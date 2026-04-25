using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PlusgrowWms.Api.Data;
using PlusgrowWms.Api.Helpers;
using PlusgrowWms.Api.Models;

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
}
