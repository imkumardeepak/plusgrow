using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PlusgrowWms.Api.Models;

[Table("export_path_configs")]
public class ExportPathConfig
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    /// <summary>
    /// Fixed values: WmsStock | SelfProducts | TallyStock
    /// </summary>
    [Required]
    [MaxLength(50)]
    [Column("export_type")]
    public string ExportType { get; set; } = string.Empty;

    /// <summary>
    /// Destination folder path (e.g. C:\Users\PlusGrow\Dropbox\Stocks - Self)
    /// </summary>
    [Required]
    [Column("folder_path")]
    public string FolderPath { get; set; } = string.Empty;

    /// <summary>
    /// Output file name. When null/empty a default name is used.
    /// </summary>
    [MaxLength(255)]
    [Column("file_name")]
    public string? FileName { get; set; }

    /// <summary>
    /// When false this config is skipped during the scheduled export job.
    /// </summary>
    [Column("is_enabled")]
    public bool IsEnabled { get; set; } = true;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified);
}
