using ClosedXML.Excel;
using Microsoft.EntityFrameworkCore;
using PlusgrowWms.Api.Data;
using PlusgrowWms.Api.Services;

namespace PlusgrowWms.Api.Services;

public interface IPartyStockExportService
{
    Task ExportAllAsync(CancellationToken cancellationToken = default);
}

/// <summary>
/// Generates stock export files based on the Export Path Config Master records.
/// Three export types are supported:
///   • WmsStock     – lightweight SKU / Inventory sheet (all WMS products)
///   • SelfProducts – full party stock report for ownership = "Self"
///   • TallyStock   – SKU Code + Closing Balance pulled live from Tally
/// Paths and file names are managed per-config in the ExportPathConfigs table.
/// Runs on a Hangfire schedule.
/// </summary>
public class PartyStockExportService : IPartyStockExportService
{
    // Column headers for the full party stock report
    private static readonly string[] PartyHeaders =
    {
        "SKU Code", "Inventory"
    };

    private readonly PlusgrowDbContext _context;
    private readonly TallyService _tallyService;
    private readonly ILogger<PartyStockExportService> _logger;

    public PartyStockExportService(
        PlusgrowDbContext context,
        TallyService tallyService,
        ILogger<PartyStockExportService> logger)
    {
        _context = context;
        _tallyService = tallyService;
        _logger = logger;
    }

    public async Task ExportAllAsync(CancellationToken cancellationToken = default)
    {
        // Load all enabled export path configs from DB
        var configs = await _context.ExportPathConfigs
            .AsNoTracking()
            .Where(x => x.IsEnabled)
            .ToListAsync(cancellationToken);

        if (configs.Count == 0)
        {
            _logger.LogInformation("Export skipped: no enabled export path configs found.");
            return;
        }

        // Process each config independently so one failure doesn't block others
        foreach (var config in configs)
        {
            try
            {
                switch (config.ExportType)
                {
                    case "WmsStock":
                        await ExportSkuInventoryAsync(
                            config.FolderPath,
                            config.FileName ?? "Stock.xlsx",
                            cancellationToken);
                        break;

                    case "SelfProducts":
                        await ExportPartyAsync(
                            "Self",
                            config.FolderPath,
                            config.FileName,
                            cancellationToken);
                        break;

                    case "TallyStock":
                        await ExportTallyStockAsync(
                            config.FolderPath,
                            config.FileName ?? "Tally_Stock.xlsx",
                            cancellationToken);
                        break;

                    default:
                        _logger.LogWarning(
                            "Unknown ExportType '{ExportType}' for config Id={Id}. Skipping.",
                            config.ExportType, config.Id);
                        break;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Export failed for config Id={Id} (Type={ExportType}) -> {FolderPath}",
                    config.Id, config.ExportType, config.FolderPath);
            }
        }

        // Export per-party files for all parties that have export enabled in the Parties master
        var targets = await _context.Parties
            .AsNoTracking()
            .Where(x => x.ExportEnabled && x.ExportFolderPath != null && x.ExportFolderPath != "")
            .ToListAsync(cancellationToken);

        foreach (var party in targets)
        {
            try
            {
                await ExportPartyAsync(party.Name, party.ExportFolderPath!, party.ExportFileName, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Party stock export failed for {PartyName} -> {FolderPath}",
                    party.Name, party.ExportFolderPath);
            }
        }
    }

    // ──────────────────────────────────────────────────────────
    // WmsStock: SKU + Inventory (2 columns, all WMS products)
    // ──────────────────────────────────────────────────────────
    private async Task ExportSkuInventoryAsync(string folderPath, string fileName, CancellationToken cancellationToken)
    {
        var products = await _context.Products
            .AsNoTracking()
            .Where(x => x.Sku != null && x.Sku != "")
            .OrderBy(x => x.Sku)
            .Select(x => new { x.Id, x.Sku })
            .ToListAsync(cancellationToken);

        var productIds = products.Select(x => x.Id).ToList();
        var quantities = await _context.ProductQuantities
            .AsNoTracking()
            .Where(x => productIds.Contains(x.ProductId))
            .ToDictionaryAsync(x => x.ProductId, x => x.CurrentQuantity, cancellationToken);

        using var workbook = new XLWorkbook();
        var worksheet = workbook.Worksheets.Add("Stock");

        var headerCells = new[] { "SKU", "Inventory" };
        for (var col = 0; col < headerCells.Length; col++)
        {
            var cell = worksheet.Cell(1, col + 1);
            cell.Value = headerCells[col];
            cell.Style.Font.Bold = true;
            cell.Style.Font.FontColor = XLColor.White;
            cell.Style.Fill.BackgroundColor = XLColor.Teal;
            cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
        }

        var row = 2;
        foreach (var product in products)
        {
            quantities.TryGetValue(product.Id, out var stockQty);
            worksheet.Cell(row, 1).Value = product.Sku;
            worksheet.Cell(row, 2).Value = stockQty;
            row++;
        }

        worksheet.Columns().AdjustToContents();
        var maxRow = row > 2 ? row - 1 : 2;
        var tableRange = worksheet.Range(1, 1, maxRow, 2);
        tableRange.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
        tableRange.Style.Border.InsideBorder = XLBorderStyleValues.Thin;
        tableRange.SetAutoFilter();

        SaveWorkbook(workbook, folderPath, fileName);

        _logger.LogInformation(
            "WMS Stock export complete: {Count} product(s) written to {FolderPath}\\{FileName}.",
            products.Count, folderPath, fileName);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // TallyStock: SKU Code (MAILINGNAME) + Tally Stock (CLOSINGBALANCE)
    // ──────────────────────────────────────────────────────────────────────────
    private async Task ExportTallyStockAsync(string folderPath, string fileName, CancellationToken cancellationToken)
    {
        var xmlFilePath = Path.Combine(
            AppDomain.CurrentDomain.BaseDirectory, "wwwroot", "TallyXML", "GetStockItem.xml");

        // Fall back to the current-directory path used by the controller
        if (!File.Exists(xmlFilePath))
            xmlFilePath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "TallyXML", "GetStockItem.xml");

        var stockItems = await _tallyService.GetStockItem(xmlFilePath);

        if (stockItems.Count == 0)
        {
            _logger.LogWarning("Tally Stock export: no items returned from Tally. File not written.");
            return;
        }

        using var workbook = new XLWorkbook();
        var worksheet = workbook.Worksheets.Add("Tally Stock");

        // Title row
        worksheet.Cell("A1").Value = $"Tally Stock Report";
        worksheet.Range("A1:B1").Merge();
        worksheet.Cell("A1").Style.Font.Bold = true;
        worksheet.Cell("A1").Style.Font.FontSize = 14;
        worksheet.Cell("A1").Style.Font.FontColor = XLColor.White;
        worksheet.Cell("A1").Style.Fill.BackgroundColor = XLColor.MidnightBlue;
        worksheet.Cell("A1").Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;

        worksheet.Cell("A2").Value = $"Generated On: {DateTime.Now:yyyy-MM-dd HH:mm}";
        worksheet.Range("A2:B2").Merge();
        worksheet.Cell("A2").Style.Font.Italic = true;
        worksheet.Cell("A2").Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Right;

        // Headers
        var headerRow = 4;
        var headers = new[] { "SKU Code", "Tally Stock" };
        for (var col = 0; col < headers.Length; col++)
        {
            var cell = worksheet.Cell(headerRow, col + 1);
            cell.Value = headers[col];
            cell.Style.Font.Bold = true;
            cell.Style.Font.FontColor = XLColor.White;
            cell.Style.Fill.BackgroundColor = XLColor.Teal;
            cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
        }

        // Data rows — skuCode = MAILINGNAME (part number), closingBalance = CLOSINGBALANCE (stock)
        var row = 5;
        foreach (var item in stockItems)
        {
            worksheet.Cell(row, 1).Value = item.skuCode ?? string.Empty;
            worksheet.Cell(row, 2).Value = item.closingBalance;
            row++;
        }

        worksheet.Columns().AdjustToContents();
        var maxRow = row > 5 ? row - 1 : 5;
        var tableRange = worksheet.Range(headerRow, 1, maxRow, 2);
        tableRange.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
        tableRange.Style.Border.InsideBorder = XLBorderStyleValues.Thin;
        tableRange.SetAutoFilter();

        SaveWorkbook(workbook, folderPath, fileName);

        _logger.LogInformation(
            "Tally Stock export complete: {Count} item(s) written to {FolderPath}\\{FileName}.",
            stockItems.Count, folderPath, fileName);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // SelfProducts / per-Party: full stock report (all columns)
    // ──────────────────────────────────────────────────────────────────────────
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

        // Title
        worksheet.Cell("A1").Value = $"Stock Report - {partyName}";
        worksheet.Range("A1:B1").Merge();
        worksheet.Cell("A1").Style.Font.Bold = true;
        worksheet.Cell("A1").Style.Font.FontSize = 16;
        worksheet.Cell("A1").Style.Font.FontColor = XLColor.White;
        worksheet.Cell("A1").Style.Fill.BackgroundColor = XLColor.MidnightBlue;
        worksheet.Cell("A1").Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;

        worksheet.Cell("A2").Value = $"Generated On: {DateTime.Now:yyyy-MM-dd HH:mm}";
        worksheet.Range("A2:B2").Merge();
        worksheet.Cell("A2").Style.Font.Italic = true;
        worksheet.Cell("A2").Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Right;

        // Headers
        var headerRow = 4;
        for (var column = 0; column < PartyHeaders.Length; column++)
        {
            var cell = worksheet.Cell(headerRow, column + 1);
            cell.Value = PartyHeaders[column];
            cell.Style.Font.Bold = true;
            cell.Style.Font.FontColor = XLColor.White;
            cell.Style.Fill.BackgroundColor = XLColor.Teal;
            cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
        }

        // Data
        var dataStartRow = 5;
        var row = dataStartRow;
        foreach (var product in products)
        {
            quantities.TryGetValue(product.Id, out var stockQty);

            worksheet.Cell(row, 1).Value = product.Sku ?? string.Empty;
            worksheet.Cell(row, 2).Value = stockQty;
            row++;
        }

        worksheet.Columns().AdjustToContents();

        var maxRow = row > dataStartRow ? row - 1 : dataStartRow;
        var tableRange = worksheet.Range(headerRow, 1, maxRow, PartyHeaders.Length);
        tableRange.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
        tableRange.Style.Border.InsideBorder = XLBorderStyleValues.Thin;
        tableRange.SetAutoFilter();

        var fileName = string.IsNullOrWhiteSpace(fileNameSetting)
            ? $"{SanitizeFileName(partyName)}_Stock.xlsx"
            : EnsureXlsxExtension(fileNameSetting.Trim());

        SaveWorkbook(workbook, folderPath, fileName);

        _logger.LogInformation(
            "Party stock export complete: {Count} product(s) for {PartyName} written to {FolderPath}\\{FileName}.",
            products.Count, partyName, folderPath, fileName);
    }

    // ──────────────────────────────────────────────────────────
    // Shared helpers
    // ──────────────────────────────────────────────────────────

    /// <summary>
    /// Saves the workbook via a temp file then atomically moves it to the target,
    /// preventing Dropbox from picking up a half-written file.
    /// </summary>
    private static void SaveWorkbook(XLWorkbook workbook, string folderPath, string fileName)
    {
        Directory.CreateDirectory(folderPath);

        var localTempFolder = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "TempExcelExports");
        Directory.CreateDirectory(localTempFolder);

        var tempPath = Path.Combine(localTempFolder, $"{Guid.NewGuid():N}.xlsx");
        workbook.SaveAs(tempPath);

        var fullPath = Path.Combine(folderPath, EnsureXlsxExtension(fileName));
        File.Move(tempPath, fullPath, overwrite: true);
    }

    private static string EnsureXlsxExtension(string fileName) =>
        fileName.EndsWith(".xlsx", StringComparison.OrdinalIgnoreCase) ? fileName : $"{fileName}.xlsx";

    private static string SanitizeFileName(string value)
    {
        var invalid = Path.GetInvalidFileNameChars();
        return new string(value.Select(ch => invalid.Contains(ch) ? '_' : ch).ToArray());
    }
}
