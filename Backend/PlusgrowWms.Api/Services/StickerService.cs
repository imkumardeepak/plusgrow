using System.Net.Sockets;
using System.Text;
using Microsoft.EntityFrameworkCore;
using PlusgrowWms.Api.Data;
using PlusgrowWms.Api.DTOs;
using PlusgrowWms.Api.Models;

namespace PlusgrowWms.Api.Services;

public class StickerService : IStickerService
{
    private const string DefaultCompanyName = "PLUSGROW MERCHANTRY PVT LTD,";
    private const string DefaultCompanyAddress1 = "T 31A, MIDC INDUSTRIAL AREA, HINGNA RD,";
    private const string DefaultCompanyAddress2 = "NAGPUR 440016, MAHARASHTRA";
    private const string DefaultCompanyPhone = "99600 88888";
    private const string DefaultCompanyEmail = "CONNECT@PLUSGROW.COM";
    private const string DefaultImporterName = "SAGO INDUSTRIES PVT LTD.";
    private const string DefaultImporterAddress1 = "C501, KAMAL PARK CSH, LBS MARG, BHANDUP WEST,";
    private const string DefaultImporterAddress2 = "MUMBAI 78";
    private const string DefaultImporterCountry = "INDIA";

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

        if (product == null)
        {
            throw new Exception("Product not found");
        }

        Importer? importer = null;
        if (request.ImporterId.HasValue)
        {
            importer = await _context.Importers.FindAsync(request.ImporterId.Value);
        }

        Manufacturer? manufacturer = null;
        if (request.ManufacturerId.HasValue)
        {
            manufacturer = await _context.Manufacturers.FindAsync(request.ManufacturerId.Value);
        }

        var templateFileName = GetTemplateFileName(request.Size, request.Type);
        var templatePath = Path.Combine(_env.WebRootPath, "Stickers", templateFileName);

        if (!File.Exists(templatePath))
        {
            throw new Exception($"Template not found: {templateFileName}");
        }

        var zpl = await File.ReadAllTextAsync(templatePath);
        var selectedManufacturer = manufacturer ?? product.Manufacturer;
        var addressSource = selectedManufacturer?.Address ?? importer?.Address;
        var importerParts = SplitAddress(
            addressSource,
            selectedManufacturer?.Country);
        var manufacturerCountry = FirstFilled(
            selectedManufacturer?.Country,
            importerParts.Country,
            DefaultImporterCountry);
        var quantity = request.Quantity > 0 ? request.Quantity : 1;
        var bestBeforeMonths = product.BestBeforeMonths > 0
            ? product.BestBeforeMonths
            : 1;
        var companyHeader = string.Equals(request.Type, "Separate", StringComparison.OrdinalIgnoreCase)
            ? "MARKETED BY"
            : "IMPORTED & MARKETED BY";
        var dmData = $"{product.Sku ?? string.Empty}#{quantity}#{request.MonthYear}#{request.BatchNumber}";

        var values = new Dictionary<string, string>
        {
            { "<COMPANYHEADER>", companyHeader },
            { "<COMPANYNAME>", DefaultCompanyName },
            { "<COMPANYADDRESS1>", DefaultCompanyAddress1 },
            { "<COMPANYADDRESS2>", DefaultCompanyAddress2 },
            { "<COMPANYPHONE>", DefaultCompanyPhone },
            { "<COMPANYEMAIL>", DefaultCompanyEmail },
            { "<MANUFACTURE>", FirstFilled(selectedManufacturer?.Name, importer?.Name, DefaultImporterName).ToUpperInvariant() },
            { "<COUNTYOFIMPORT>", manufacturerCountry },
            { "<COMMIDITY>", product.Commodity?.Name ?? "LUBRICANT PREPARATIONS" },
            { "<DATEOFIMPORT>", request.MonthYear },
            { "<COUNTRYOFORIGIN>", product.CountryOfOrigin ?? "INDIA" },
            { "<NETQNTY>", product.NetQuantity ?? "0 ml" },
            { "<MRP>", FormatRupee(product.Mrp, 2) },
            { "<FACTOR>", FormatRupee(product.Ussp, 2) },
            { "<UNIT>", product.UnitType ?? "Pcs" },
            { "<BESTBEFORE>", bestBeforeMonths.ToString() },
            { "<SKUCODE>", product.Sku ?? string.Empty },
            { "<ITEMDESC1>", SplitIntoLength(product.Name, 30, 0) },
            { "<ITEMDESC2>", SplitIntoLength(product.Name, 30, 1) },
            { "<NOTE1>", SplitIntoLength(request.Note, 30, 0) },
            { "<NOTE2>", SplitIntoLength(request.Note, 30, 1) },
            { "<ADDRESS1>", importerParts.Line1 },
            { "<ADDRESS2>", importerParts.Line2 },
            { "<COUNTRY>", manufacturerCountry },
            { "<QNTY>", quantity.ToString() },
            { "<INVOICENUMBER>", request.BatchNumber },
            { "42721-002#100#MAR/2026#INA0001", dmData },
            { "84505C-0023#100#Mar/2026#INA0001", dmData },
            { "<SKUCODE>#<QNTY>#<DATEOFIMPORT>#<INVOICENUMBER>", dmData }
        };

        foreach (var item in values)
        {
            zpl = zpl.Replace(item.Key, item.Value);
        }

        return zpl;
    }

    public async Task<byte[]> GetPreviewImageAsync(string zpl, string size)
    {
        string labelSize = "2x2";
        if (size == "60x60") labelSize = "2.4x2.4";
        if (size == "75x75") labelSize = "3x3";

        var url = $"http://api.labelary.com/v1/printers/12dpmm/labels/{labelSize}/0/";

        var request = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = new StringContent(zpl, Encoding.UTF8, "application/x-www-form-urlencoded")
        };

        var response = await _httpClient.SendAsync(request);
        response.EnsureSuccessStatusCode();

        return await response.Content.ReadAsByteArrayAsync();
    }

    public List<StickerTemplateDto> GetAvailableTemplates()
    {
        return
        [
            new StickerTemplateDto { Name = "Imported & Marketed By 50 x 50", Size = "50x50", Type = "Combined", FileName = "IMPORTED_MARKTED-50x50.prn" },
            new StickerTemplateDto { Name = "Imported By + Marketed By 50 x 50", Size = "50x50", Type = "Separate", FileName = "MARKTEDBY-50x50.prn" },
            new StickerTemplateDto { Name = "Imported & Marketed By 60 x 60", Size = "60x60", Type = "Combined", FileName = "IMPORTED_MARKTED-60x60.prn" },
            new StickerTemplateDto { Name = "Imported By + Marketed By 60 x 60", Size = "60x60", Type = "Separate", FileName = "MARKTEDBY-60x60.prn" },
            new StickerTemplateDto { Name = "Imported & Marketed By 75 x 75", Size = "75x75", Type = "Combined", FileName = "IMPORTED_MARKTED-75x75.prn" },
            new StickerTemplateDto { Name = "Imported By + Marketed By 75 x 75", Size = "75x75", Type = "Separate", FileName = "MARKTEDBY-75x75.prn" }
        ];
    }

    public async Task PrintAsync(string zpl, string printerAddress)
    {
        try
        {
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
            var data = Encoding.ASCII.GetBytes(zpl);
            await stream.WriteAsync(data, 0, data.Length);
        }
        catch (Exception ex)
        {
            throw new Exception($"Failed to print to {printerAddress}: {ex.Message}");
        }
    }

    private static string GetTemplateFileName(string size, string type)
    {
        var normalizedType = string.Equals(type, "Separate", StringComparison.OrdinalIgnoreCase)
            ? "Separate"
            : "Combined";

        return normalizedType switch
        {
            "Separate" => $"MARKTEDBY-{size}.prn",
            _ => $"IMPORTED_MARKTED-{size}.prn"
        };
    }

    private static (string Line1, string Line2, string Country) SplitAddress(string? address, string? countryOverride)
    {
        if (string.IsNullOrWhiteSpace(address))
        {
            return (
                DefaultImporterAddress1,
                DefaultImporterAddress2,
                FirstFilled(countryOverride, DefaultImporterCountry));
        }

        var parts = address
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .ToList();

        if (parts.Count == 0)
        {
            return (
                DefaultImporterAddress1,
                DefaultImporterAddress2,
                FirstFilled(countryOverride, DefaultImporterCountry));
        }

        var country = FirstFilled(countryOverride, DefaultImporterCountry);
        var midpoint = Math.Max(1, (int)Math.Ceiling(parts.Count / 2d));
        var line1 = string.Join(", ", parts.Take(midpoint));
        var line2 = string.Join(", ", parts.Skip(midpoint));

        return (
            string.IsNullOrWhiteSpace(line1) ? DefaultImporterAddress1 : $"{line1},",
            string.IsNullOrWhiteSpace(line2) ? DefaultImporterAddress2 : line2,
            string.IsNullOrWhiteSpace(country) ? DefaultImporterCountry : country
        );
    }

    private static string SplitIntoLength(string? value, int length, int segment)
    {
        var source = value ?? string.Empty;
        var start = segment * length;

        if (source.Length <= start)
        {
            return string.Empty;
        }

        return source.Substring(start, Math.Min(length, source.Length - start));
    }

    private static string FirstFilled(params string?[] values)
    {
        return values.FirstOrDefault(value => !string.IsNullOrWhiteSpace(value)) ?? string.Empty;
    }

    private static string FormatRupee(decimal? value, int decimals)
    {
        return $"Rs.{(value ?? 0m).ToString($"N{decimals}")}";
    }
}
