using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PlusgrowWms.Api.Data;
using PlusgrowWms.Api.Helpers;
using PlusgrowWms.Api.Models;
using PlusgrowWms.Api.DTOs;

namespace PlusgrowWms.Api.Controllers;

public class ImportersController : BaseController
{
    private readonly PlusgrowDbContext _context;
    
    public ImportersController(PlusgrowDbContext context)
    {
        _context = context;
    }
    
    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<Importer>>>> GetImporters([FromQuery] ListQueryDto queryDto)
    {
        var page = Math.Max(queryDto.Page, 1);
        var pageSize = Math.Clamp(queryDto.PageSize, 1, 200);
        var query = _context.Importers.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(queryDto.Search))
        {
            var search = queryDto.Search.Trim().ToLower();
            query = query.Where(x =>
                x.Name.ToLower().Contains(search) ||
                (x.Phone != null && x.Phone.ToLower().Contains(search)) ||
                (x.Email != null && x.Email.ToLower().Contains(search)));
        }

        query = (queryDto.SortBy?.Trim().ToLowerInvariant(), queryDto.SortDirection?.Trim().ToLowerInvariant()) switch
        {
            ("createdat", "desc") => query.OrderByDescending(x => x.CreatedAt),
            ("createdat", _) => query.OrderBy(x => x.CreatedAt),
            ("name", "desc") => query.OrderByDescending(x => x.Name),
            _ => query.OrderBy(x => x.Name),
        };

        var total = await query.CountAsync();
        var importers = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        return Success(importers, page, pageSize, total);
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
