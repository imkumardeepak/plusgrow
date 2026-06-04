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

        var isSkuOnlySticker = string.Equals(request.Size, "25x25", StringComparison.OrdinalIgnoreCase);
        var missingFields = new List<string>();
        if (string.IsNullOrWhiteSpace(product.Sku)) missingFields.Add("SKU");
        if (!isSkuOnlySticker)
        {
            if (string.IsNullOrWhiteSpace(product.Name)) missingFields.Add("Product Name");
            if (product.CommodityId == null || product.Commodity == null) missingFields.Add("Commodity");
            if (product.ManufacturerId == null && !request.ManufacturerId.HasValue) missingFields.Add("Manufacturer");
            if (string.IsNullOrWhiteSpace(product.CountryOfOrigin)) missingFields.Add("Country of Origin");
            if (string.IsNullOrWhiteSpace(product.NetQuantity)) missingFields.Add("Net Quantity");
            if (string.IsNullOrWhiteSpace(product.UnitType)) missingFields.Add("Unit Type");
            if (product.Mrp == null || product.Mrp <= 0) missingFields.Add("MRP");
            if (product.BestBeforeMonths <= 0) missingFields.Add("Best Before Months");
            if (string.IsNullOrWhiteSpace(product.Factor)) missingFields.Add("Factor");
        }

        if (missingFields.Count > 0)
        {
            throw new Exception($"Cannot print sticker. Missing product fields: {string.Join(", ", missingFields)}");
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
        var isImportedLabel =
            string.Equals(request.Type, "Combined", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(request.Type, "Separate", StringComparison.OrdinalIgnoreCase);
        var selectedManufacturer = manufacturer ?? product.Manufacturer;
        var selectedImporter = importer;
        var sourceName = isImportedLabel
            ? FirstFilled(selectedImporter?.Name, selectedManufacturer?.Name)
            : FirstFilled(selectedManufacturer?.Name);
        var sourceAddress = isImportedLabel
            ? FirstFilled(selectedImporter?.Address, selectedManufacturer?.Address)
            : FirstFilled(selectedManufacturer?.Address);
        var sourceCountry = isImportedLabel
            ? selectedManufacturer?.Country
            : selectedManufacturer?.Country;
        var importerParts = SplitAddress(
            sourceAddress,
            sourceCountry);
        var manufacturerCountry = FirstFilled(
            sourceCountry,
            importerParts.Country);
        var quantity = request.Quantity > 0 ? request.Quantity : 1;
        var stickerMrp = request.Mrp ?? product.Mrp;
        var bestBeforeMonths = product.BestBeforeMonths > 0
            ? product.BestBeforeMonths
            : 1;
        var companyHeader = string.Equals(request.Type, "Separate", StringComparison.OrdinalIgnoreCase)
            ? "MARKETED BY"
            : string.Equals(request.Type, "Manufacture", StringComparison.OrdinalIgnoreCase)
                ? "MARKETED BY"
            : "IMPORTED & MARKETED BY";
        var dmData = isSkuOnlySticker
            ? product.Sku ?? string.Empty
            : $"{product.Sku ?? string.Empty}#{quantity}#{(string.IsNullOrWhiteSpace(request.InvoiceDate) ? request.MonthYear : request.InvoiceDate)}#{FormatRupee(stickerMrp, 2)}";

        var stickerProductName = isSkuOnlySticker ? string.Empty : product.Name;
        var itemDescriptionLines = WrapText(stickerProductName, 25, 2);
        var compactItemLines = WrapText(stickerProductName, 25, 2);
        var noteLines = WrapText(product.Note, 30, 2);

        // Use a List of KeyValuePair to guarantee replacement order,
        // since we must replace the composite QR code tags before their individual sub-components.
        var values = new List<KeyValuePair<string, string>>
        {
            new("42721-002#100#MAR/2026#INA0001", dmData),
            new("84505C-0023#100#Mar/2026#INA0001", dmData),
            new("<SKUCODE>#<QNTY>#<DATEOFIMPORT>#<INVOICENUMBER>", dmData),
            new("<COMPANYHEADER>", companyHeader),
            new("<COMPANYNAME>", DefaultCompanyName),
            new("<COMPANYADDRESS1>", DefaultCompanyAddress1),
            new("<COMPANYADDRESS2>", DefaultCompanyAddress2),
            new("<COMPANYPHONE>", DefaultCompanyPhone),
            new("<COMPANYEMAIL>", DefaultCompanyEmail),
            new("<MANUFACTURE>", sourceName.ToUpperInvariant()),
            new("<COUNTYOFIMPORT>", manufacturerCountry),
            new("<COMMIDITY>", product.Commodity?.Name ?? "LUBRICANT PREPARATIONS"),
            new("<DATEOFIMPORT>", request.MonthYear),
            new("<COUNTRYOFORIGIN>", product.CountryOfOrigin ?? "INDIA"),
            new("<NETQNTY>", product.NetQuantity ?? "0 ml"),
            new("<MRP>", FormatRupee(stickerMrp, 2)),
            new("<FACTOR>", FormatRupee(product.Ussp, 2)),
            new("<UNIT>", product.UnitType ?? "Pcs"),
            new("<BESTBEFORE>", bestBeforeMonths.ToString()),
            new("<SKUCODE>", product.Sku ?? string.Empty),
            new("<ITEMDESC1>", itemDescriptionLines[0]),
            new("<ITEMDESC2>", itemDescriptionLines[1]),
            new("<ITEMCODE1>", compactItemLines[0]),
            new("<ITEMCODE2>", compactItemLines[1]),
            new("<NOTE1>", noteLines[0]),
            new("<NOTE2>", noteLines[1]),
            new("<ADDRESS1>", importerParts.Line1),
            new("<ADDRESS2>", importerParts.Line2),
            new("<COUNTRY>", manufacturerCountry),
            new("<QNTY>", quantity.ToString()),
            new("<INVOICENUMBER>", request.BatchNumber)
        };

        foreach (var item in values)
        {
            zpl = zpl.Replace(item.Key, item.Value);
        }

        return zpl;
    }

    public async Task<byte[]> GetPreviewImageAsync(string zpl, string size)
    {
        var printerDensity = string.Equals(size, "25x25", StringComparison.OrdinalIgnoreCase)
            ? "8dpmm"
            : "12dpmm";
        string labelSize = "2x2";
        if (size == "38x38") labelSize = "1.5x1.5";
        if (size == "60x60") labelSize = "2.4x2.4";
        if (size == "75x75") labelSize = "3x3";
        if (size == "25x25") labelSize = "4x1";

        var url = $"http://api.labelary.com/v1/printers/{printerDensity}/labels/{labelSize}/0/";

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
            new StickerTemplateDto { Name = "Manufactured By 50 x 50", Size = "50x50", Type = "Manufacture", FileName = "MANUFATUREBY-50x50.prn" },
            new StickerTemplateDto { Name = "Imported & Marketed By 60 x 60", Size = "60x60", Type = "Combined", FileName = "IMPORTED_MARKTED-60x60.prn" },
            new StickerTemplateDto { Name = "Imported By + Marketed By 60 x 60", Size = "60x60", Type = "Separate", FileName = "MARKTEDBY-60x60.prn" },
            new StickerTemplateDto { Name = "Manufactured By 60 x 60", Size = "60x60", Type = "Manufacture", FileName = "MANUFATUREBY-60x60.prn" },
            new StickerTemplateDto { Name = "Imported & Marketed By 75 x 75", Size = "75x75", Type = "Combined", FileName = "IMPORTED_MARKTED-75x75.prn" },
            new StickerTemplateDto { Name = "Imported By + Marketed By 75 x 75", Size = "75x75", Type = "Separate", FileName = "MARKTEDBY-75x75.prn" },
            new StickerTemplateDto { Name = "Manufactured By 75 x 75", Size = "75x75", Type = "Manufacture", FileName = "MANUFACTREDBY-75x75.prn" },
            new StickerTemplateDto { Name = "Product 25 x 25 (4-up 200 DPI)", Size = "25x25", Type = "Combined", FileName = "Product-25x25x4-200.prn" },
            new StickerTemplateDto { Name = "Product 25 x 25 (4-up 200 DPI)", Size = "25x25", Type = "Separate", FileName = "Product-25x25x4-200.prn" },
            new StickerTemplateDto { Name = "Imported & Marketed By 38 x 38", Size = "38x38", Type = "Combined", FileName = "IMPORTED_MARKTED-38x38.prn" },
            new StickerTemplateDto { Name = "Imported By + Marketed By 38 x 38", Size = "38x38", Type = "Separate", FileName = "MARKTEDBY-38x38.prn" },
            new StickerTemplateDto { Name = "Manufactured By 38 x 38", Size = "38x38", Type = "Manufacture", FileName = "MANUFACTREDBY-38x38.prn" }
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
        if (size == "25x25")
        {
            return "Product-25x25x4-200.prn";
        }

        var normalizedType = string.Equals(type, "Separate", StringComparison.OrdinalIgnoreCase)
            ? "Separate"
            : string.Equals(type, "Manufacture", StringComparison.OrdinalIgnoreCase)
                ? "Manufacture"
            : "Combined";

        return normalizedType switch
        {
            "Separate" => $"MARKTEDBY-{size}.prn",
            "Manufacture" => size switch
            {
                "38x38" => "MANUFACTREDBY-38x38.prn",
                "50x50" => "MANUFATUREBY-50x50.prn",
                "60x60" => "MANUFATUREBY-60x60.prn",
                "75x75" => "MANUFACTREDBY-75x75.prn",
                _ => $"MANUFATUREBY-{size}.prn",
            },
            _ => $"IMPORTED_MARKTED-{size}.prn"
        };
    }

    private static (string Line1, string Line2, string Country) SplitAddress(string? address, string? countryOverride)
    {
        if (string.IsNullOrWhiteSpace(address))
        {
            return (string.Empty, string.Empty, FirstFilled(countryOverride));
        }

        var normalized = string.Join(
            ' ',
            address
                .Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries));

        if (string.IsNullOrWhiteSpace(normalized))
        {
            return (string.Empty, string.Empty, FirstFilled(countryOverride));
        }

        var lines = WrapText(normalized, 20, 2);
        var line1 = lines[0];
        var line2 = normalized.Length > 20 ? lines[1] : string.Empty;

        return (
            line1,
            line2,
            FirstFilled(countryOverride)
        );
    }

    private static string[] WrapText(string? value, int maxLength, int maxLines)
    {
        var normalized = string.Join(
            ' ',
            (value ?? string.Empty)
                .Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries));

        if (maxLines <= 0)
        {
            return [];
        }

        var lines = new List<string>(maxLines);

        if (string.IsNullOrWhiteSpace(normalized))
        {
            return Enumerable.Repeat(string.Empty, maxLines).ToArray();
        }

        var words = normalized.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        var currentLine = new StringBuilder();

        foreach (var word in words)
        {
            foreach (var piece in SplitLongWord(word, maxLength))
            {
                if (lines.Count == maxLines)
                {
                    return lines.ToArray();
                }

                if (currentLine.Length == 0)
                {
                    currentLine.Append(piece);
                    continue;
                }

                var candidateLength = currentLine.Length + 1 + piece.Length;
                if (candidateLength <= maxLength)
                {
                    currentLine.Append(' ').Append(piece);
                    continue;
                }

                lines.Add(currentLine.ToString());
                currentLine.Clear();
                currentLine.Append(piece);
            }
        }

        if (lines.Count < maxLines && currentLine.Length > 0)
        {
            lines.Add(currentLine.ToString());
        }

        while (lines.Count < maxLines)
        {
            lines.Add(string.Empty);
        }

        return lines.ToArray();
    }

    private static IEnumerable<string> SplitLongWord(string value, int maxLength)
    {
        if (string.IsNullOrEmpty(value))
        {
            yield break;
        }

        for (var index = 0; index < value.Length; index += maxLength)
        {
            yield return value.Substring(index, Math.Min(maxLength, value.Length - index));
        }
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
