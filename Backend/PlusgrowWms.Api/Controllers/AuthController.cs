using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PlusgrowWms.Api.DTOs;
using PlusgrowWms.Api.Helpers;
using PlusgrowWms.Api.Services;

namespace PlusgrowWms.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : BaseController
{
    private readonly IAuthService _authService;
    private readonly ILogger<AuthController> _logger;

    public AuthController(IAuthService authService, ILogger<AuthController> logger)
    {
        _authService = authService;
        _logger = logger;
    }

    /// <summary>
    /// Authenticate user and return JWT token
    /// </summary>
    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<ApiResponse<AuthResponseDto>>> Login([FromBody] LoginDto loginDto)
    {
        if (string.IsNullOrWhiteSpace(loginDto.Username) || string.IsNullOrWhiteSpace(loginDto.Password))
        {
            return BadRequest<AuthResponseDto>("Username and password are required");
        }

        var result = await _authService.LoginAsync(loginDto);

        if (!result.Success)
        {
            return Error<AuthResponseDto>(result.Message ?? "Login failed");
        }

        _logger.LogInformation("User {Username} logged in successfully", loginDto.Username);
        return Success(result, "Login successful");
    }

    /// <summary>
    /// Register a new user account
    /// </summary>
    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<ActionResult<ApiResponse<AuthResponseDto>>> Register([FromBody] CreateUserDto createUserDto)
    {
        if (string.IsNullOrWhiteSpace(createUserDto.Username) || string.IsNullOrWhiteSpace(createUserDto.Password))
        {
            return BadRequest<AuthResponseDto>("Username and password are required");
        }

        if (string.IsNullOrWhiteSpace(createUserDto.FullName))
        {
            return BadRequest<AuthResponseDto>("Full name is required");
        }

        // Validate password length
        if (createUserDto.Password.Length < 6)
        {
            return BadRequest<AuthResponseDto>("Password must be at least 6 characters");
        }

        var result = await _authService.RegisterAsync(createUserDto);

        if (!result.Success)
        {
            return BadRequest<AuthResponseDto>(result.Message ?? "Registration failed");
        }

        _logger.LogInformation("New user registered: {Username}", createUserDto.Username);
        return Success(result, "Registration successful");
    }

    /// <summary>
    /// Get current authenticated user profile
    /// </summary>
    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<UserDto>>> GetCurrentUser()
    {
        var userId = GetCurrentUserId();
        if (userId == null)
        {
            return Error<UserDto>("Unable to identify user");
        }

        var result = await _authService.GetUserByIdAsync(userId.Value);
        if (result == null)
        {
            return NotFound<UserDto>("User not found");
        }

        return Success(result);
    }

    /// <summary>
    /// Change user password
    /// </summary>
    [HttpPut("change-password")]
    [Authorize]
    public async Task<ActionResult<ApiResponse>> ChangePassword([FromBody] ChangePasswordDto changePasswordDto)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
        {
            return Error("Unable to identify user");
        }

        // Verify current password
        var loginDto = new LoginDto
        {
            Username = User.Identity?.Name ?? "",
            Password = changePasswordDto.CurrentPassword
        };

        var verifyResult = await _authService.LoginAsync(loginDto);
        if (!verifyResult.Success)
        {
            return Error("Current password is incorrect");
        }

        var result = await _authService.ChangePasswordAsync(userId.Value, changePasswordDto.NewPassword);

        if (!result)
        {
            return Error("Failed to change password");
        }

        _logger.LogInformation("Password changed for user ID: {UserId}", userId.Value);
        return Ok("Password changed successfully");
    }

    /// <summary>
    /// Refresh JWT token
    /// </summary>
    [HttpPost("refresh-token")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<AuthResponseDto>>> RefreshToken()
    {
        var userId = GetCurrentUserId();
        if (userId == null)
        {
            return Error<AuthResponseDto>("Unable to identify user");
        }

        var result = await _authService.RefreshTokenAsync(userId.Value);
        if (result == null)
        {
            return Error<AuthResponseDto>("Unable to refresh token");
        }

        return Success(result, "Token refreshed successfully");
    }

    private int? GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (int.TryParse(userIdClaim, out var userId))
        {
            return userId;
        }
        return null;
    }
}
