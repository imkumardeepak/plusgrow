using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using PlusgrowWms.Api.Data;
using PlusgrowWms.Api.DTOs;
using PlusgrowWms.Api.Models;
using PlusgrowWms.Api.Repositories;

namespace PlusgrowWms.Api.Services;

public interface IAuthService
{
    Task<AuthResponseDto> LoginAsync(LoginDto loginDto);
    Task<AuthResponseDto> RegisterAsync(CreateUserDto createUserDto);
    Task<UserDto?> GetUserByIdAsync(int userId);
    Task<bool> ChangePasswordAsync(int userId, string newPassword);
    Task<AuthResponseDto?> RefreshTokenAsync(int userId);
    string GenerateJwtToken(User user);
}

public class AuthService : IAuthService
{
    private readonly IUserRepository _userRepository;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AuthService> _logger;

    public AuthService(
        IUserRepository userRepository,
        IConfiguration configuration,
        ILogger<AuthService> logger)
    {
        _userRepository = userRepository;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<AuthResponseDto> LoginAsync(LoginDto loginDto)
    {
        _logger.LogInformation("Attempting login for user: {Username}", loginDto.Username);
        
        var user = await _userRepository.GetByUsernameAsync(loginDto.Username);
        
        if (user == null)
        {
            _logger.LogWarning("Login failed: User not found - {Username}", loginDto.Username);
            return new AuthResponseDto
            {
                Success = false,
                Message = "Invalid username or password"
            };
        }
        
        if (!VerifyPassword(loginDto.Password, user.PasswordHash))
        {
            _logger.LogWarning("Login failed: Invalid password for user: {Username}", loginDto.Username);
            return new AuthResponseDto
            {
                Success = false,
                Message = "Invalid username or password"
            };
        }
        
        if (!user.IsActive)
        {
            _logger.LogWarning("Login failed: User account is inactive - {Username}", loginDto.Username);
            return new AuthResponseDto
            {
                Success = false,
                Message = "Account is inactive"
            };
        }
        
        // Update last login
        user.LastLoginAt = DateTime.UtcNow;
        await _userRepository.UpdateAsync(user);
        
        var token = GenerateJwtToken(user);
        var userDto = new UserDto
        {
            Id = user.Id,
            Username = user.Username,
            FullName = user.FullName,
            Email = user.Email,
            Phone = user.Phone,
            RoleId = user.RoleId,
            RoleName = user.Role?.Name,
            IsActive = user.IsActive,
            CreatedAt = user.CreatedAt,
            LastLoginAt = user.LastLoginAt
        };
        
        _logger.LogInformation("Login successful for user: {Username}", loginDto.Username);
        
        return new AuthResponseDto
        {
            Success = true,
            Token = token,
            User = userDto,
            Message = "Login successful"
        };
    }

    public async Task<AuthResponseDto> RegisterAsync(CreateUserDto createUserDto)
    {
        _logger.LogInformation("Attempting to register new user: {Username}", createUserDto.Username);
        
        var existingUser = await _userRepository.GetByUsernameAsync(createUserDto.Username);
        if (existingUser != null)
        {
            return new AuthResponseDto
            {
                Success = false,
                Message = "Username already exists"
            };
        }
        
        var passwordHash = HashPassword(createUserDto.Password);
        
        var user = new User
        {
            Username = createUserDto.Username,
            PasswordHash = passwordHash,
            FullName = createUserDto.FullName,
            Email = createUserDto.Email,
            Phone = createUserDto.Phone,
            RoleId = createUserDto.RoleId,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        
        await _userRepository.CreateAsync(user);
        
        _logger.LogInformation("User registered successfully: {Username}", createUserDto.Username);
        
        return new AuthResponseDto
        {
            Success = true,
            Message = "User registered successfully"
        };
    }

    public string GenerateJwtToken(User user)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["Jwt:Key"]!));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.Username),
            new Claim(ClaimTypes.GivenName, user.FullName),
            new Claim(ClaimTypes.Email, user.Email ?? ""),
            new Claim(ClaimTypes.Role, user.Role?.Name ?? "User"),
            new Claim("roleId", user.RoleId?.ToString() ?? "")
        };
        
        var token = new JwtSecurityToken(
            issuer: _configuration["Jwt:Issuer"],
            audience: _configuration["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(int.Parse(_configuration["Jwt:ExpiryMinutes"]!)),
            signingCredentials: credentials
        );
        
        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private string HashPassword(string password)
    {
        // Using BCrypt for secure password hashing
        return BCrypt.Net.BCrypt.HashPassword(password, workFactor: 12);
    }

    private bool VerifyPassword(string password, string hash)
    {
        return BCrypt.Net.BCrypt.Verify(password, hash);
    }

    public async Task<UserDto?> GetUserByIdAsync(int userId)
    {
        var user = await _userRepository.GetByIdWithRoleAsync(userId);
        if (user == null) return null;

        return new UserDto
        {
            Id = user.Id,
            Username = user.Username,
            FullName = user.FullName,
            Email = user.Email,
            Phone = user.Phone,
            RoleId = user.RoleId,
            RoleName = user.Role?.Name,
            IsActive = user.IsActive,
            CreatedAt = user.CreatedAt,
            LastLoginAt = user.LastLoginAt
        };
    }

    public async Task<bool> ChangePasswordAsync(int userId, string newPassword)
    {
        var passwordHash = HashPassword(newPassword);
        return await _userRepository.ChangePasswordAsync(userId, passwordHash);
    }

    public async Task<AuthResponseDto?> RefreshTokenAsync(int userId)
    {
        var user = await _userRepository.GetByIdWithRoleAsync(userId);
        if (user == null || !user.IsActive) return null;

        var token = GenerateJwtToken(user);
        var userDto = new UserDto
        {
            Id = user.Id,
            Username = user.Username,
            FullName = user.FullName,
            Email = user.Email,
            Phone = user.Phone,
            RoleId = user.RoleId,
            RoleName = user.Role?.Name,
            IsActive = user.IsActive,
            CreatedAt = user.CreatedAt,
            LastLoginAt = user.LastLoginAt
        };

        return new AuthResponseDto
        {
            Success = true,
            Token = token,
            User = userDto,
            Message = "Token refreshed successfully"
        };
    }
}
