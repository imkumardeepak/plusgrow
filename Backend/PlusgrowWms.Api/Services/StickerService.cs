using System.Text;
using System.Net.Sockets;
using Microsoft.EntityFrameworkCore;
using PlusgrowWms.Api.Data;
using PlusgrowWms.Api.DTOs;
using PlusgrowWms.Api.Models;

namespace PlusgrowWms.Api.Services;

public class StickerService : IStickerService
{
    private readonly PlusgrowDbContext _context;
    private readonly IWebHostEnvironment _env;
    private readonly HttpClient _httpClient;

    public StickerService(PlusgrowDbContext context, IWebHostEnvironment env, HttpClient httpClient)
    {
        _context = context;
        _env = env;
        _httpClient = httpClient;
    }

    public async Task<string> GenerateZplAsync(StickerPreviewRequest request)
    {
        var product = await _context.Products
            .Include(p => p.Commodity)
            .Include(p => p.Manufacturer)
            .FirstOrDefaultAsync(p => p.Id == request.ProductId);

        if (product == null) throw new Exception("Product not found");

        Importer? importer = null;
        if (request.ImporterId.HasValue)
        {
            importer = await _context.Importers.FindAsync(request.ImporterId.Value);
        }

        string templateFileName = $"PlusGrowExport-{request.Size}-IM.prn";
        string templatePath = Path.Combine(_env.WebRootPath, "Stickers", templateFileName);

        if (!File.Exists(templatePath))
        {
            // Fallback to first available if size doesn't match exactly
            templatePath = Directory.GetFiles(Path.Combine(_env.WebRootPath, "Stickers"), "*.prn").FirstOrDefault();
        }

        if (templatePath == null || !File.Exists(templatePath))
            throw new Exception("Template not found");

        string zpl = await File.ReadAllTextAsync(templatePath);

        // Header Logic
        string companyHeader = request.Type == "Combined" ? "IMPORTED & MARKETED BY" : "MARKETED BY";
        string importHeader = "IMPORTED BY:";

        // Data Matrix Data
        string dmData = $"{product.Sku}#{request.BatchNumber}#{request.MonthYear}#INA0001";

        // Placeholders Replacement
        var values = new Dictionary<string, string>
        {
            { "{{COMPANY_HEADER}}", companyHeader },
            { "{{CO_NAME}}", "PLUSGROW MERCHANTRY PVT LTD," },
            { "{{CO_ADDR1}}", "T 31A, MIDC INDUSTRIAL AREA, HINGNA RD," },
            { "{{CO_ADDR2}}", "NAGPUR 440016, MAHARASHTRA" },
            { "{{CO_CARE_PHONE}}", "99600 88888" },
            { "{{CO_CARE_EMAIL}}", "CONNECT@PLUSGROW.COM" },
            { "{{IMPORT_HEADER}}", importHeader },
            { "{{IMP_NAME}}", importer?.Name ?? "SAGO INDUSTRIES PVT LTD." },
            { "{{IMP_ADDR1}}", importer?.Address?.Split(',').Take(importer.Address.Split(',').Length / 2).Aggregate((a,b) => a + ", " + b) ?? "C501, KAMAL PARK CSH, LBS MARG, BHANDUP WEST," },
            { "{{IMP_ADDR2}}", importer?.Address?.Split(',').Skip(importer.Address.Split(',').Length / 2).Aggregate((a,b) => a + ", " + b) ?? "MUMBAI 78, INDIA" },
            { "{{GENERIC_NAME}}", product.Commodity?.Name ?? "LUBRICANT PREPARATIONS" },
            { "{{MONTH_YEAR}}", request.MonthYear },
            { "{{ORIGIN}}", product.CountryOfOrigin ?? "UNITED STATES" },
            { "{{NET_QTY}}", product.MrpQuantity ?? "18900 ml" },
            { "{{MRP}}", product.Mrp?.ToString("N2") ?? "0.00" },
            { "{{USP}}", product.Ussp?.ToString("N4") ?? "0.0000" },
            { "{{UNIT}}", product.UnitType ?? "ml" },
            { "{{BEST_BEFORE}}", $"{product.BestBeforeMonths / 12} YEARS" },
            { "{{SKU}}", product.Sku ?? "" },
            { "{{PRODUCT_NAME_1}}", product.Name.Length > 30 ? product.Name.Substring(0, 30) : product.Name },
            { "{{PRODUCT_NAME_2}}", product.Name.Length > 30 ? product.Name.Substring(30) : "" },
            { "{{NOTE1}}", request.Note.Length > 30 ? request.Note.Substring(0, 30) : request.Note },
            { "{{NOTE2}}", request.Note.Length > 30 ? request.Note.Substring(30) : "" },
            { "{{DM_DATA}}", dmData }
        };

        foreach (var item in values)
        {
            zpl = zpl.Replace(item.Key, item.Value);
        }

        return zpl;
    }

    public async Task<byte[]> GetPreviewImageAsync(string zpl, string size)
    {
        // Labelary API
        // Format: /v1/printers/{dpmm}/labels/{width}x{height}/{index}/
        // Sizes for 300dpi (12dpmm):
        // 50mm = ~2in
        // 60mm = ~2.4in
        // 75mm = ~3in

        string labelSize = "2x2";
        if (size == "60x60") labelSize = "2.4x2.4";
        if (size == "75x75") labelSize = "3x3";

        var url = $"http://api.labelary.com/v1/printers/12dpmm/labels/{labelSize}/0/";

        var request = new HttpRequestMessage(HttpMethod.Post, url);
        request.Content = new StringContent(zpl, Encoding.UTF8, "application/x-www-form-urlencoded");

        var response = await _httpClient.SendAsync(request);
        response.EnsureSuccessStatusCode();

        return await response.Content.ReadAsByteArrayAsync();
    }

    public List<StickerTemplateDto> GetAvailableTemplates()
    {
        var templates = new List<StickerTemplateDto>
        {
            new StickerTemplateDto { Name = "Small (50x50)", Size = "50x50", FileName = "PlusGrowExport-50x50-IM.prn" },
            new StickerTemplateDto { Name = "Medium (60x60)", Size = "60x60", FileName = "PlusGrowExport-60x60-IM.prn" },
            new StickerTemplateDto { Name = "Large (75x75)", Size = "75x75", FileName = "PlusGrowExport-75x75-IM.prn" }
        };
        return templates;
    }

    public async Task PrintAsync(string zpl, string printerAddress)
    {
        try
        {
            // Parse IP:Port format
            var parts = printerAddress.Split(':');
            var printerIp = parts[0];
            var printerPort = parts.Length > 1 ? int.Parse(parts[1]) : 9100;

            using var client = new TcpClient();
            var connectTask = client.ConnectAsync(printerIp, printerPort);

            if (await Task.WhenAny(connectTask, Task.Delay(5000)) != connectTask)
            {
                throw new Exception($"Connection timeout to printer at {printerIp}:{printerPort}");
            }

            using var stream = client.GetStream();
            byte[] data = Encoding.ASCII.GetBytes(zpl);
            await stream.WriteAsync(data, 0, data.Length);
        }
        catch (Exception ex)
        {
            throw new Exception($"Failed to print to {printerAddress}: {ex.Message}");
        }
    }
}
