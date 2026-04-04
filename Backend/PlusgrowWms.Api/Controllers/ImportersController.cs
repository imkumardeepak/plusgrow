using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PlusgrowWms.Api.Data;
using PlusgrowWms.Api.Helpers;
using PlusgrowWms.Api.Models;

namespace PlusgrowWms.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ImportersController : BaseController
{
    private readonly PlusgrowDbContext _context;
    
    public ImportersController(PlusgrowDbContext context)
    {
        _context = context;
    }
    
    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<Importer>>>> GetImporters()
    {
        var importers = await _context.Importers.ToListAsync();
        return Success(importers);
    }
    
    [HttpGet("{id}")]
    public async Task<ActionResult<ApiResponse<Importer>>> GetImporter(int id)
    {
        var importer = await _context.Importers.FindAsync(id);
        if (importer == null)
            return NotFound<Importer>("Importer not found");
        return Success(importer);
    }
    
    [HttpPost]
    public async Task<ActionResult<ApiResponse<Importer>>> CreateImporter([FromBody] Importer importer)
    {
        _context.Importers.Add(importer);
        await _context.SaveChangesAsync();
        return Success(importer, "Importer created successfully");
    }
    
    [HttpPut("{id}")]
    public async Task<ActionResult<ApiResponse<Importer>>> UpdateImporter(int id, [FromBody] Importer importer)
    {
        if (id != importer.Id)
            return BadRequest<Importer>("ID mismatch");
            
        _context.Entry(importer).State = EntityState.Modified;
        
        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            if (!ImporterExists(id))
                return NotFound<Importer>("Importer not found");
            throw;
        }
        
        return Success(importer, "Importer updated successfully");
    }
    
    [HttpDelete("{id}")]
    public async Task<ActionResult<ApiResponse>> DeleteImporter(int id)
    {
        var importer = await _context.Importers.FindAsync(id);
        if (importer == null)
            return NotFound("Importer not found");
            
        _context.Importers.Remove(importer);
        await _context.SaveChangesAsync();
        
        return Ok("Importer deleted successfully");
    }
    
    private bool ImporterExists(int id) => _context.Importers.Any(e => e.Id == id);
}
