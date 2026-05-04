using Microsoft.AspNetCore.Mvc;
using PlusgrowWms.Api.Helpers;
using PlusgrowWms.Api.Models;
using PlusgrowWms.Api.DTOs;
using PlusgrowWms.Api.Services;

namespace PlusgrowWms.Api.Controllers;

public class ImportersController : BaseController
{
    private readonly IImporterService _importerService;
    
    public ImportersController(IImporterService importerService)
    {
        _importerService = importerService;
    }
    
    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<Importer>>>> GetImporters([FromQuery] ListQueryDto queryDto)
    {
        var result = await _importerService.GetPagedAsync(queryDto);
        return Success(result.Items, result.Page, result.PageSize, result.Total);
    }
    
    [HttpGet("{id}")]
    public async Task<ActionResult<ApiResponse<Importer>>> GetImporter(int id)
    {
        var importer = await _importerService.GetByIdAsync(id);
        if (importer == null)
            return NotFound<Importer>("Importer not found");
        return Success(importer);
    }
    
    [HttpPost]
    public async Task<ActionResult<ApiResponse<Importer>>> CreateImporter([FromBody] Importer importer)
    {
        return Success(await _importerService.CreateAsync(importer), "Importer created successfully");
    }
    
    [HttpPut("{id}")]
    public async Task<ActionResult<ApiResponse<Importer>>> UpdateImporter(int id, [FromBody] Importer importer)
    {
        var (updated, error) = await _importerService.UpdateAsync(id, importer);
        if (error == "ID mismatch")
            return BadRequest<Importer>(error);
        if (updated == null)
            return NotFound<Importer>("Importer not found");
        return Success(updated, "Importer updated successfully");
    }
    
    [HttpDelete("{id}")]
    public async Task<ActionResult<ApiResponse>> DeleteImporter(int id)
    {
        if (!await _importerService.DeleteAsync(id))
            return NotFound("Importer not found");
        
        return Ok("Importer deleted successfully");
    }
    
}
