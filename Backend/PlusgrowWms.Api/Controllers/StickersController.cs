using Microsoft.AspNetCore.Mvc;
using PlusgrowWms.Api.DTOs;
using PlusgrowWms.Api.Services;
using System.Text.RegularExpressions;

namespace PlusgrowWms.Api.Controllers;

public class StickersController : BaseController
{
    private readonly IStickerService _stickerService;

    public StickersController(IStickerService stickerService)
    {
        _stickerService = stickerService;
    }

    [HttpGet("templates")]
    public ActionResult GetTemplates()
    {
        var templates = _stickerService.GetAvailableTemplates();
        return Ok(templates);
    }

    [HttpPost("preview")]
    public async Task<IActionResult> Preview([FromBody] StickerPreviewRequest request)
    {
        try
        {
            var zpl = await _stickerService.GenerateZplAsync(request);
            var imageBytes = await _stickerService.GetPreviewImageAsync(zpl, request.Size);
            return File(imageBytes, "image/png");
        }
        catch (Exception ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPost("generate")]
    public async Task<ActionResult> Generate([FromBody] StickerPreviewRequest request)
    {
        try
        {
            var zpl = await _stickerService.GenerateZplAsync(request);
            return Ok(new { zpl });
        }
        catch (Exception ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPost("print")]
    public async Task<IActionResult> Print([FromBody] PrintJobRequest request)
    {
        if (string.IsNullOrEmpty(request.PrinterIp))
            return BadRequest("Printer IP is required");

        if (request.Items == null || !request.Items.Any())
            return BadRequest("No items provided for printing");

        try
        {
            foreach (var item in request.Items)
            {
                var zpl = await _stickerService.GenerateZplAsync(item.Config);
                
                var printQuantity = GetTemplatePrintQuantity(item.Config.Size, item.Quantity);
                if (printQuantity > 1)
                {
                    zpl = ApplyPrintQuantity(zpl, printQuantity);
                }

                await _stickerService.PrintAsync(zpl, request.PrinterIp);
            }

            return Ok(new { message = "Print job sent successfully" });
        }
        catch (Exception ex)
        {
            return StatusCode(500, ex.Message);
        }
    }

    private static int GetTemplatePrintQuantity(string size, int requestedQuantity)
    {
        var quantity = Math.Max(requestedQuantity, 1);
        if (string.Equals(size, "25x25", StringComparison.OrdinalIgnoreCase))
        {
            return (int)Math.Ceiling(quantity / 4m);
        }

        return quantity;
    }

    private static string ApplyPrintQuantity(string zpl, int quantity)
    {
        var printQuantity = Math.Max(quantity, 1);
        if (Regex.IsMatch(zpl, @"\^PQ\d+(?:,\d+,\d+,[A-Z])?"))
        {
            return Regex.Replace(
                zpl,
                @"\^PQ\d+(?:,\d+,\d+,[A-Z])?",
                $"^PQ{printQuantity}",
                RegexOptions.None,
                TimeSpan.FromMilliseconds(100));
        }

        return zpl.Replace("^XZ", $"^PQ{printQuantity}^XZ");
    }
}
