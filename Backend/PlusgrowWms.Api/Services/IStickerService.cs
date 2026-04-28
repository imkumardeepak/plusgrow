using PlusgrowWms.Api.DTOs;

namespace PlusgrowWms.Api.Services;

public interface IStickerService
{
    Task<string> GenerateZplAsync(StickerPreviewRequest request);
    Task<byte[]> GetPreviewImageAsync(string zpl, string size);
    List<StickerTemplateDto> GetAvailableTemplates();
    Task PrintAsync(string zpl, string printerAddress);
}
