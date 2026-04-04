using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Newtonsoft.Json;

namespace PlusgrowWms.Api.Models;

[Table("commodities")]
public class Commodity
{
    [Key]
    [Column("id")]
    public int Id { get; set; }
    
    [Required]
    [MaxLength(150)]
    [Column("name")]
    public string Name { get; set; } = string.Empty;
    
    [JsonIgnore]
    public ICollection<Product> Products { get; set; } = new List<Product>();
}
