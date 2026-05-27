using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PlusgrowWms.Api.Models;

[Table("parties")]
public class Party
{
    [Key]
    [Column("id")]
    public int Id { get; set; }
    
    [Required]
    [MaxLength(255)]
    [Column("name")]
    public string Name { get; set; } = string.Empty;
    
    [Column("address")]
    public string? Address { get; set; }

    [MaxLength(100)]
    [Column("country")]
    public string? Country { get; set; }

    [MaxLength(20)]
    [Column("phone")]
    public string? Phone { get; set; }

    [Required]
    [MaxLength(100)]
    [Column("email")]
    public string Email { get; set; } = string.Empty;
    
    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified);
}
