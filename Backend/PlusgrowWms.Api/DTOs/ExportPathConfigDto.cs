using System.ComponentModel.DataAnnotations;

namespace PlusgrowWms.Api.DTOs;

public class CreateExportPathConfigDto
{
    /// <summary>Valid values: WmsStock | SelfProducts | TallyStock</summary>
    [Required]
    [MaxLength(50)]
    public string ExportType { get; set; } = string.Empty;

    [Required]
    public string FolderPath { get; set; } = string.Empty;

    [MaxLength(255)]
    public string? FileName { get; set; }

    public bool IsEnabled { get; set; } = true;
}
