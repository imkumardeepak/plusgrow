namespace PlusgrowWms.Api.DTOs;

public class BinDto
{
    public int Id { get; set; }
    public string BinCode { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public class CreateBinDto
{
    public string BinCode { get; set; } = string.Empty;
}

public class UpdateBinDto
{
    public int Id { get; set; }
    public string BinCode { get; set; } = string.Empty;
}
