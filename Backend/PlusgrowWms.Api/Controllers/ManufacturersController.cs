using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PlusgrowWms.Api.Data;
using PlusgrowWms.Api.Helpers;
using PlusgrowWms.Api.Models;

namespace PlusgrowWms.Api.Controllers;

public class ManufacturersController : BaseController
{
    private readonly PlusgrowDbContext _context;
    
    public ManufacturersController(PlusgrowDbContext context)
    {
        _context = context;
    }
    
    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<Manufacturer>>>> GetManufacturers()
    {
        var manufacturers = await _context.Manufacturers.ToListAsync();
        return Success(manufacturers);
    }
    
    [HttpGet("{id}")]
    public async Task<ActionResult<ApiResponse<Manufacturer>>> GetManufacturer(int id)
    {
        var manufacturer = await _context.Manufacturers.FindAsync(id);
        if (manufacturer == null)
            return NotFound<Manufacturer>("Manufacturer not found");
        return Success(manufacturer);
    }
    
    [HttpPost]
    public async Task<ActionResult<ApiResponse<Manufacturer>>> CreateManufacturer([FromBody] Manufacturer manufacturer)
    {
        _context.Manufacturers.Add(manufacturer);
        await _context.SaveChangesAsync();
        return Success(manufacturer, "Manufacturer created successfully");
    }
    
    [HttpPut("{id}")]
    public async Task<ActionResult<ApiResponse<Manufacturer>>> UpdateManufacturer(int id, [FromBody] Manufacturer manufacturer)
    {
        if (id != manufacturer.Id)
            return BadRequest<Manufacturer>("ID mismatch");
            
        _context.Entry(manufacturer).State = EntityState.Modified;
        
        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            if (!ManufacturerExists(id))
                return NotFound<Manufacturer>("Manufacturer not found");
            throw;
        }
        
        return Success(manufacturer, "Manufacturer updated successfully");
    }
    
    [HttpDelete("{id}")]
    public async Task<ActionResult<ApiResponse>> DeleteManufacturer(int id)
    {
        var manufacturer = await _context.Manufacturers.FindAsync(id);
        if (manufacturer == null)
            return NotFound("Manufacturer not found");
            
        _context.Manufacturers.Remove(manufacturer);
        await _context.SaveChangesAsync();
        
        return Ok("Manufacturer deleted successfully");
    }
    
    private bool ManufacturerExists(int id) => _context.Manufacturers.Any(e => e.Id == id);
}
