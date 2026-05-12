using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PlusgrowWms.Api.Data;
using PlusgrowWms.Api.DTOs;
using PlusgrowWms.Api.Helpers;
using PlusgrowWms.Api.Models;

namespace PlusgrowWms.Api.Controllers;

[Authorize(Roles = "Superadmin,Admin")]
public class RolesController : BaseController
{
    private readonly PlusgrowDbContext _context;

    public RolesController(PlusgrowDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<RoleDto>>>> GetRoles()
    {
        var roles = await _context.Roles
            .Include(x => x.Users)
            .OrderBy(x => x.Name)
            .ToListAsync();

        return Success(roles.Select(MapRole).ToList());
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ApiResponse<RoleDto>>> GetRole(int id)
    {
        var role = await _context.Roles
            .Include(x => x.Users)
            .FirstOrDefaultAsync(x => x.Id == id);

        return role == null
            ? NotFound<RoleDto>("Role not found")
            : Success(MapRole(role));
    }

    [HttpGet("{id}/page-access")]
    public async Task<ActionResult<ApiResponse<List<RolePageAccessDto>>>> GetRolePageAccess(int id)
    {
        if (!await _context.Roles.AnyAsync(x => x.Id == id))
            return NotFound<List<RolePageAccessDto>>("Role not found");

        var rows = await _context.RolePageAccesses
            .Where(x => x.RoleId == id)
            .OrderBy(x => x.PageKey)
            .ToListAsync();

        return Success(rows.Select(MapAccess).ToList());
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<RoleDto>>> CreateRole([FromBody] CreateRoleDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
            return BadRequest<RoleDto>("Role name is required");

        var roleName = dto.Name.Trim();
        if (await _context.Roles.AnyAsync(x => x.Name.ToLower() == roleName.ToLower()))
            return BadRequest<RoleDto>("Role name already exists");

        var role = new Role
        {
            Name = roleName,
            Description = string.IsNullOrWhiteSpace(dto.Description) ? null : dto.Description.Trim(),
            IsActive = true,
            CreatedAt = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified),
        };

        _context.Roles.Add(role);
        await _context.SaveChangesAsync();

        return Success(MapRole(role), "Role created successfully");
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<ApiResponse<RoleDto>>> UpdateRole(int id, [FromBody] UpdateRoleDto dto)
    {
        if (id != dto.Id)
            return BadRequest<RoleDto>("ID mismatch");

        var role = await _context.Roles.Include(x => x.Users).FirstOrDefaultAsync(x => x.Id == id);
        if (role == null)
            return NotFound<RoleDto>("Role not found");

        if (string.IsNullOrWhiteSpace(dto.Name))
            return BadRequest<RoleDto>("Role name is required");

        var roleName = dto.Name.Trim();
        var duplicate = await _context.Roles.AnyAsync(x => x.Id != id && x.Name.ToLower() == roleName.ToLower());
        if (duplicate)
            return BadRequest<RoleDto>("Role name already exists");

        role.Name = roleName;
        role.Description = string.IsNullOrWhiteSpace(dto.Description) ? null : dto.Description.Trim();
        role.IsActive = dto.IsActive;

        await _context.SaveChangesAsync();

        return Success(MapRole(role), "Role updated successfully");
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult<ApiResponse>> DeleteRole(int id)
    {
        var role = await _context.Roles
            .Include(x => x.Users)
            .Include(x => x.RolePageAccesses)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (role == null)
            return NotFound("Role not found");

        if (role.Users.Any())
            return BadRequest("Cannot delete a role assigned to users");

        _context.RolePageAccesses.RemoveRange(role.RolePageAccesses);
        _context.Roles.Remove(role);
        await _context.SaveChangesAsync();

        return Ok("Role deleted successfully");
    }

    [HttpPut("{id}/page-access")]
    public async Task<ActionResult<ApiResponse<List<RolePageAccessDto>>>> UpdateRolePageAccess(int id, [FromBody] UpdateRolePageAccessDto dto)
    {
        if (id != dto.RoleId)
            return BadRequest<List<RolePageAccessDto>>("ID mismatch");

        var role = await _context.Roles
            .Include(x => x.RolePageAccesses)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (role == null)
            return NotFound<List<RolePageAccessDto>>("Role not found");

        _context.RolePageAccesses.RemoveRange(role.RolePageAccesses);

        var rows = dto.PageAccesses
            .Where(x => !string.IsNullOrWhiteSpace(x.PageKey))
            .Select(x => new RolePageAccess
            {
                RoleId = id,
                PageKey = x.PageKey.Trim(),
                CanView = x.CanView,
                CanCreate = x.CanCreate,
                CanEdit = x.CanEdit,
                CanDelete = x.CanDelete,
                CreatedAt = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified),
            })
            .ToList();

        _context.RolePageAccesses.AddRange(rows);
        await _context.SaveChangesAsync();

        return Success(rows.Select(MapAccess).ToList(), "Role permissions updated successfully");
    }

    private static RoleDto MapRole(Role role)
    {
        return new RoleDto
        {
            Id = role.Id,
            Name = role.Name,
            Description = role.Description,
            IsActive = role.IsActive,
            CreatedAt = role.CreatedAt,
            UserCount = role.Users?.Count ?? 0,
        };
    }

    private static RolePageAccessDto MapAccess(RolePageAccess access)
    {
        return new RolePageAccessDto
        {
            Id = access.Id,
            RoleId = access.RoleId,
            PageKey = access.PageKey,
            CanView = access.CanView,
            CanCreate = access.CanCreate,
            CanEdit = access.CanEdit,
            CanDelete = access.CanDelete,
        };
    }
}
