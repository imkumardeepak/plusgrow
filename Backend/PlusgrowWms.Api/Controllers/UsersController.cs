using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PlusgrowWms.Api.Data;
using PlusgrowWms.Api.DTOs;
using PlusgrowWms.Api.Helpers;
using PlusgrowWms.Api.Models;

namespace PlusgrowWms.Api.Controllers;

[Authorize(Roles = "Superadmin,Admin")]
public class UsersController : BaseController
{
    private readonly PlusgrowDbContext _context;

    public UsersController(PlusgrowDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<UserDto>>>> GetUsers()
    {
        var users = await _context.Users
            .Include(x => x.Role)
                .ThenInclude(x => x!.RolePageAccesses)
            .OrderBy(x => x.Username)
            .ToListAsync();

        return Success(users.Select(MapUser).ToList());
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ApiResponse<UserDto>>> GetUser(int id)
    {
        var user = await _context.Users
            .Include(x => x.Role)
                .ThenInclude(x => x!.RolePageAccesses)
            .FirstOrDefaultAsync(x => x.Id == id);

        return user == null
            ? NotFound<UserDto>("User not found")
            : Success(MapUser(user));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<UserDto>>> CreateUser([FromBody] CreateUserDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Username))
            return BadRequest<UserDto>("Username is required");

        if (string.IsNullOrWhiteSpace(dto.Password) || dto.Password.Length < 6)
            return BadRequest<UserDto>("Password must be at least 6 characters");

        if (string.IsNullOrWhiteSpace(dto.FullName))
            return BadRequest<UserDto>("Full name is required");

        var username = dto.Username.Trim();
        if (await _context.Users.AnyAsync(x => x.Username.ToLower() == username.ToLower()))
            return BadRequest<UserDto>("Username already exists");

        if (dto.RoleId.HasValue && !await _context.Roles.AnyAsync(x => x.Id == dto.RoleId && x.IsActive))
            return BadRequest<UserDto>("Selected role does not exist or is inactive");

        var user = new User
        {
            Username = username,
            PasswordHash = dto.Password,
            FullName = dto.FullName.Trim(),
            Email = string.IsNullOrWhiteSpace(dto.Email) ? null : dto.Email.Trim(),
            Phone = string.IsNullOrWhiteSpace(dto.Phone) ? null : dto.Phone.Trim(),
            RoleId = dto.RoleId,
            IsActive = true,
            CreatedAt = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified),
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        var created = await _context.Users
            .Include(x => x.Role)
                .ThenInclude(x => x!.RolePageAccesses)
            .FirstAsync(x => x.Id == user.Id);

        return Success(MapUser(created), "User created successfully");
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<ApiResponse<UserDto>>> UpdateUser(int id, [FromBody] UpdateUserDto dto)
    {
        if (id != dto.Id)
            return BadRequest<UserDto>("ID mismatch");

        var user = await _context.Users.FindAsync(id);
        if (user == null)
            return NotFound<UserDto>("User not found");

        if (string.IsNullOrWhiteSpace(dto.FullName))
            return BadRequest<UserDto>("Full name is required");

        if (dto.RoleId.HasValue && !await _context.Roles.AnyAsync(x => x.Id == dto.RoleId && x.IsActive))
            return BadRequest<UserDto>("Selected role does not exist or is inactive");

        user.FullName = dto.FullName.Trim();
        user.Email = string.IsNullOrWhiteSpace(dto.Email) ? null : dto.Email.Trim();
        user.Phone = string.IsNullOrWhiteSpace(dto.Phone) ? null : dto.Phone.Trim();
        if (!string.IsNullOrWhiteSpace(dto.Password))
        {
            user.PasswordHash = dto.Password;
        }
        user.RoleId = dto.RoleId;
        user.IsActive = dto.IsActive;

        await _context.SaveChangesAsync();

        var updated = await _context.Users
            .Include(x => x.Role)
                .ThenInclude(x => x!.RolePageAccesses)
            .FirstAsync(x => x.Id == id);

        return Success(MapUser(updated), "User updated successfully");
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult<ApiResponse>> DeleteUser(int id)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null)
            return NotFound("User not found");

        _context.Users.Remove(user);
        await _context.SaveChangesAsync();
        return Ok("User deleted successfully");
    }

    private static UserDto MapUser(User user)
    {
        return new UserDto
        {
            Id = user.Id,
            Username = user.Username,
            Password = user.PasswordHash,
            FullName = user.FullName,
            Email = user.Email,
            Phone = user.Phone,
            RoleId = user.RoleId,
            RoleName = user.Role?.Name,
            IsActive = user.IsActive,
            CreatedAt = user.CreatedAt,
            LastLoginAt = user.LastLoginAt,
            PageAccesses = user.Role?.RolePageAccesses.Select(access => new RolePageAccessDto
            {
                Id = access.Id,
                RoleId = access.RoleId,
                PageKey = access.PageKey,
                CanView = access.CanView,
                CanCreate = access.CanCreate,
                CanEdit = access.CanEdit,
                CanDelete = access.CanDelete,
            }).ToList() ?? new List<RolePageAccessDto>(),
        };
    }
}
