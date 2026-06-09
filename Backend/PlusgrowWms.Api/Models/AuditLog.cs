using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PlusgrowWms.Api.Models;

public class AuditLog
{
    [Key]
    public int Id { get; set; }

    public int? UserId { get; set; }
    
    [MaxLength(255)]
    public string? Username { get; set; }

    [Required]
    [MaxLength(50)]
    public string Action { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string EntityType { get; set; } = string.Empty;

    [MaxLength(100)]
    public string? EntityId { get; set; }

    [Column(TypeName = "jsonb")]
    public string? OldValues { get; set; }

    [Column(TypeName = "jsonb")]
    public string? NewValues { get; set; }

    public string? Details { get; set; }

    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}
