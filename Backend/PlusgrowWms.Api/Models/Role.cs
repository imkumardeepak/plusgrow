using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PlusgrowWms.Api.Models;

[Table("roles")]
public class Role
{
    [Key]
    [Column("id")]
    public int Id { get; set; }
    
    [Required]
    [MaxLength(50)]
    [Column("name")]
    public string Name { get; set; } = string.Empty;
    
    [MaxLength(255)]
    [Column("description")]
    public string? Description { get; set; }
    
    [Column("is_active")]
    public bool IsActive { get; set; } = true;
    
    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.Now;
    
    public ICollection<User> Users { get; set; } = new List<User>();
    public ICollection<RolePageAccess> RolePageAccesses { get; set; } = new List<RolePageAccess>();
}
