using ClosedXML.Excel;
using Microsoft.EntityFrameworkCore;
using PlusgrowWms.Api.Data;

namespace PlusgrowWms.Api.Services;

public interface IPartyStockExportService
{
    Task ExportAllAsync(CancellationToken cancellationToken = default);
}

/// <summary>
/// Generates the party "Mapped Products" stock report (the same data shown on the Party Stock
/// Dashboard and produced by its "Export to Excel" button) and writes it to each party's
/// configured Dropbox folder. The folder/file/enabled settings are managed per party on the
/// Parties (Ownership) page and read from the parties table. Runs on a Hangfire schedule.
/// </summary>
public class PartyStockExportService : IPartyStockExportService
{
    // Column headers mirror the front-end Party Dashboard export exactly.
    private static readonly string[] Headers =
    {
        "SKU Code", "Alias", "Product Name", "Commodity Name", "Manufacturer Name",
        "Country of Origin", "Unit Type", "MRP", "USSP", "Net Qnty", "Factor",
        "Best Before (Months)", "Weight", "Ownership", "Stock Qnty", "Note",
    };

    private readonly PlusgrowDbContext _context;
    private readonly ILogger<PartyStockExportService> _logger;

    public PartyStockExportService(PlusgrowDbContext context, ILogger<PartyStockExportService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task ExportAllAsync(CancellationToken cancellationToken = default)
    {
        // Targets are configured per party on the Parties page: a party must be enabled for export
        // and have a destination folder set.
        var targets = await _context.Parties
            .AsNoTracking()
            .Where(x => x.ExportEnabled && x.ExportFolderPath != null && x.ExportFolderPath != "")
            .ToListAsync(cancellationToken);

        if (targets.Count == 0)
        {
            _logger.LogInformation("Party stock export skipped: no parties enabled for export.");
            return;
        }

        foreach (var party in targets)
        {
            try
            {
                await ExportPartyAsync(party.Name, party.ExportFolderPath!, party.ExportFileName, cancellationToken);
            }
            catch (Exception ex)
            {
                // A failure for one party (e.g. folder offline) must not stop the others.
                _logger.LogError(ex, "Party stock export failed for {PartyName} -> {FolderPath}", party.Name, party.ExportFolderPath);
            }
        }
    }

    private async Task ExportPartyAsync(string rawPartyName, string folderPath, string? fileNameSetting, CancellationToken cancellationToken)
    {
        var partyName = rawPartyName.Trim();

        var products = await _context.Products
            .Include(x => x.Commodity)
            .Include(x => x.Manufacturer)
            .AsNoTracking()
            .Where(x => x.Ownership != null && x.Ownership.ToLower() == partyName.ToLower())
            .OrderBy(x => x.Name)
            .ToListAsync(cancellationToken);

        var productIds = products.Select(x => x.Id).ToList();
        var quantities = await _context.ProductQuantities
            .AsNoTracking()
            .Where(x => productIds.Contains(x.ProductId))
            .ToDictionaryAsync(x => x.ProductId, x => x.CurrentQuantity, cancellationToken);

        using var workbook = new XLWorkbook();
        var worksheet = workbook.Worksheets.Add("My Products");

        for (var column = 0; column < Headers.Length; column++)
            worksheet.Cell(1, column + 1).Value = Headers[column];
        worksheet.Row(1).Style.Font.Bold = true;

        var row = 2;
        foreach (var product in products)
        {
            quantities.TryGetValue(product.Id, out var stockQty);

            worksheet.Cell(row, 1).Value = product.Sku ?? string.Empty;
            worksheet.Cell(row, 2).Value = product.Alias ?? string.Empty;
            worksheet.Cell(row, 3).Value = product.Name ?? string.Empty;
            worksheet.Cell(row, 4).Value = product.Commodity?.Name ?? string.Empty;
            worksheet.Cell(row, 5).Value = product.Manufacturer?.Name ?? string.Empty;
            worksheet.Cell(row, 6).Value = product.CountryOfOrigin ?? string.Empty;
            worksheet.Cell(row, 7).Value = product.UnitType ?? string.Empty;
            worksheet.Cell(row, 8).Value = product.Mrp ?? 0m;
            worksheet.Cell(row, 9).Value = product.Ussp ?? 0m;
            worksheet.Cell(row, 10).Value = product.NetQuantity ?? string.Empty;
            worksheet.Cell(row, 11).Value = product.Factor ?? string.Empty;
            worksheet.Cell(row, 12).Value = product.BestBeforeMonths;
            worksheet.Cell(row, 13).Value = product.Weight ?? 0m;
            worksheet.Cell(row, 14).Value = product.Ownership ?? string.Empty;
            worksheet.Cell(row, 15).Value = stockQty;
            worksheet.Cell(row, 16).Value = product.Note ?? string.Empty;
            row++;
        }

        worksheet.Columns().AdjustToContents();

        Directory.CreateDirectory(folderPath);

        var fileName = string.IsNullOrWhiteSpace(fileNameSetting)
            ? $"{SanitizeFileName(partyName)}_Stock.xlsx"
            : EnsureXlsxExtension(fileNameSetting.Trim());
        var fullPath = Path.Combine(folderPath, fileName);

        // Save to a local temp folder first, then atomically replace the target file in Dropbox.
        // This prevents the Dropbox client from picking up a half-written spreadsheet and avoids ClosedXML extension errors.
        var localTempFolder = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "TempExcelExports");
        Directory.CreateDirectory(localTempFolder);
        
        var tempPath = Path.Combine(localTempFolder, $"{Guid.NewGuid():N}.xlsx");
        workbook.SaveAs(tempPath);
        
        File.Move(tempPath, fullPath, overwrite: true);

        _logger.LogInformation(
            "Party stock export complete: {Count} product(s) for {PartyName} written to {FullPath}.",
            products.Count, partyName, fullPath);
    }

    private static string EnsureXlsxExtension(string fileName) =>
        fileName.EndsWith(".xlsx", StringComparison.OrdinalIgnoreCase) ? fileName : $"{fileName}.xlsx";

    private static string SanitizeFileName(string value)
    {
        var invalid = Path.GetInvalidFileNameChars();
        return new string(value.Select(ch => invalid.Contains(ch) ? '_' : ch).ToArray());
    }
}
