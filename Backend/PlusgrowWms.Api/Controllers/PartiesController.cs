using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PlusgrowWms.Api.Data;
using PlusgrowWms.Api.Helpers;
using PlusgrowWms.Api.Models;
using PlusgrowWms.Api.DTOs;
using PlusgrowWms.Api.Services;

namespace PlusgrowWms.Api.Controllers;

public class PartiesController : BaseController
{
    private readonly PlusgrowDbContext _context;
    private readonly IPartyService _partyService;

    public PartiesController(PlusgrowDbContext context, IPartyService partyService)
    {
        _context = context;
        _partyService = partyService;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<Party>>>> GetParties([FromQuery] ListQueryDto queryDto)
    {
        var result = await _partyService.GetPagedAsync(queryDto);
        return Success(result.Items, result.Page, result.PageSize, result.Total);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ApiResponse<Party>>> GetParty(int id)
    {
        var party = await _partyService.GetByIdAsync(id);
        if (party == null)
            return NotFound<Party>("Party not found");
        return Success(party);
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<Party>>> CreateParty([FromBody] Party party)
    {
        var (created, error) = await _partyService.CreateAsync(party);
        if (error != null)
        {
            return BadRequest<Party>(error);
        }
        return Success(created!, "Party and user created successfully");
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<ApiResponse<Party>>> UpdateParty(int id, [FromBody] Party party)
    {
        var (updated, error) = await _partyService.UpdateAsync(id, party);
        if (error == "ID mismatch")
            return BadRequest<Party>(error);
        if (error != null)
            return BadRequest<Party>(error);
        if (updated == null)
            return NotFound<Party>("Party not found");
        return Success(updated, "Party and user updated successfully");
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult<ApiResponse>> DeleteParty(int id)
    {
        if (!await _partyService.DeleteAsync(id))
            return NotFound("Party not found");

        return Ok("Party and user deleted successfully");
    }
}
