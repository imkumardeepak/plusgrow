using System.ComponentModel.DataAnnotations;

namespace PlusgrowWms.Api.DTOs;

public class ShortPackDto
{
    [Required(ErrorMessage = "PackedQuantity is required")]
    [Range(0, int.MaxValue, ErrorMessage = "PackedQuantity cannot be negative")]
    public int PackedQuantity { get; set; }

    [Required(ErrorMessage = "Remark is required for short packing")]
    public string Remark { get; set; } = string.Empty;
}
