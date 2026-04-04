using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PlusgrowWms.Api.Models;

[Table("users")]
public class User
{
    [Key]
    [Column("id")]
    public int Id { get; set; }
    
    [Required]
    [MaxLength(100)]
    [Column("username")]
    public string Username { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(255)]
    [Column("password_hash")]
    public string PasswordHash { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(255)]
    [Column("full_name")]
    public string FullName { get; set; } = string.Empty;
    
    [MaxLength(100)]
    [Column("email")]
    public string? Email { get; set; }
    
    [MaxLength(20)]
    [Column("phone")]
    public string? Phone { get; set; }
    
    [Column("role_id")]
    public int? RoleId { get; set; }
    
    [ForeignKey(nameof(RoleId))]
    public Role? Role { get; set; }
    
    [Column("is_active")]
    public bool IsActive { get; set; } = true;
    
    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    [Column("last_login_at")]
    public DateTime? LastLoginAt { get; set; }
}
