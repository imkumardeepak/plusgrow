using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PlusgrowWms.Api.Models;

[Table("role_page_access")]
public class RolePageAccess
{
    [Key]
    [Column("id")]
    public int Id { get; set; }
    
    [Column("role_id")]
    public int RoleId { get; set; }
    
    [ForeignKey(nameof(RoleId))]
    public Role? Role { get; set; }
    
    [Required]
    [MaxLength(50)]
    [Column("page_key")]
    public string PageKey { get; set; } = string.Empty;
    
    [Column("can_view")]
    public bool CanView { get; set; } = true;
    
    [Column("can_create")]
    public bool CanCreate { get; set; } = false;
    
    [Column("can_edit")]
    public bool CanEdit { get; set; } = false;
    
    [Column("can_delete")]
    public bool CanDelete { get; set; } = false;
    
    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
