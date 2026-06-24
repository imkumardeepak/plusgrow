using System.ComponentModel.DataAnnotations;

namespace PlusgrowWms.Api.DTOs;

public class ShortCloseSalesOrderDto
{
    [Required(ErrorMessage = "Remark is required for short closing a sales order")]
    public string Remark { get; set; } = string.Empty;
}
