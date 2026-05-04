using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PlusgrowWms.Api.Data;
using PlusgrowWms.Api.Helpers;
using PlusgrowWms.Api.Models;
using PlusgrowWms.Api.DTOs;
using ClosedXML.Excel;

namespace PlusgrowWms.Api.Controllers;

public class ManufacturersController : BaseController
{
    private readonly PlusgrowDbContext _context;

    public ManufacturersController(PlusgrowDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<Manufacturer>>>> GetManufacturers([FromQuery] ListQueryDto queryDto)
    {
        var page = Math.Max(queryDto.Page, 1);
        var pageSize = Math.Clamp(queryDto.PageSize, 1, 200);
        var query = _context.Manufacturers.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(queryDto.Search))
        {
            var search = queryDto.Search.Trim().ToLower();
            query = query.Where(x =>
                x.Name.ToLower().Contains(search) ||
                (x.Country != null && x.Country.ToLower().Contains(search)));
        }

        query = (queryDto.SortBy?.Trim().ToLowerInvariant(), queryDto.SortDirection?.Trim().ToLowerInvariant()) switch
        {
            ("country", "desc") => query.OrderByDescending(x => x.Country),
            ("country", _) => query.OrderBy(x => x.Country),
            ("createdat", "desc") => query.OrderByDescending(x => x.CreatedAt),
            ("createdat", _) => query.OrderBy(x => x.CreatedAt),
            ("name", "desc") => query.OrderByDescending(x => x.Name),
            _ => query.OrderBy(x => x.Name),
        };

        var total = await query.CountAsync();
        var manufacturers = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        return Success(manufacturers, page, pageSize, total);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ApiResponse<Manufacturer>>> GetManufacturer(int id)
    {
        var manufacturer = await _context.Manufacturers.FindAsync(id);
        if (manufacturer == null)
            return NotFound<Manufacturer>("Manufacturer not found");
        return Success(manufacturer);
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<Manufacturer>>> CreateManufacturer([FromBody] Manufacturer manufacturer)
    {
        _context.Manufacturers.Add(manufacturer);
        await _context.SaveChangesAsync();
        return Success(manufacturer, "Manufacturer created successfully");
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<ApiResponse<Manufacturer>>> UpdateManufacturer(int id, [FromBody] Manufacturer manufacturer)
    {
        if (id != manufacturer.Id)
            return BadRequest<Manufacturer>("ID mismatch");

        _context.Entry(manufacturer).State = EntityState.Modified;

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            if (!ManufacturerExists(id))
                return NotFound<Manufacturer>("Manufacturer not found");
            throw;
        }

        return Success(manufacturer, "Manufacturer updated successfully");
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult<ApiResponse>> DeleteManufacturer(int id)
    {
        var manufacturer = await _context.Manufacturers.FindAsync(id);
        if (manufacturer == null)
            return NotFound("Manufacturer not found");

        _context.Manufacturers.Remove(manufacturer);
        await _context.SaveChangesAsync();

        return Ok("Manufacturer deleted successfully");
    }

    private bool ManufacturerExists(int id) => _context.Manufacturers.Any(e => e.Id == id);

    [HttpPost("upload")]
    [DisableRequestSizeLimit]
    [RequestFormLimits(MultipartBodyLengthLimit = 104857600)]
    public async Task<ActionResult<ApiResponse<ImportResultDto>>> UploadExcel(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest<ImportResultDto>("Please upload a valid Excel file");

        if (!file.FileName.EndsWith(".xlsx", StringComparison.OrdinalIgnoreCase) &&
            !file.FileName.EndsWith(".xls", StringComparison.OrdinalIgnoreCase))
            return BadRequest<ImportResultDto>("Only Excel files (.xlsx, .xls) are allowed");

        var result = new ImportResultDto();

        try
        {
            using var stream = file.OpenReadStream();
            using var workbook = new XLWorkbook(stream);
            var worksheet = workbook.Worksheet(1);

            var existingManufacturers = await _context.Manufacturers.ToListAsync();
            var manufacturerCache = new Dictionary<string, Manufacturer>(StringComparer.OrdinalIgnoreCase);
            foreach (var m in existingManufacturers)
            {
                manufacturerCache[m.Name] = m;
            }

            var rows = worksheet.RowsUsed().Skip(1).ToList();
            foreach (var row in rows)
            {
                try
                {
                    var name = row.Cell(1).GetValue<string>().Trim();
                    if (string.IsNullOrWhiteSpace(name))
                    {
                        result.Errors.Add($"Row {row.RowNumber()}: Manufacturer name is required");
                        continue;
                    }

                    var country = row.Cell(2).GetValue<string>();
                    var address = row.Cell(3).GetValue<string>();

                    if (!manufacturerCache.ContainsKey(name))
                    {
                        var newManufacturer = new Manufacturer
                        {
                            Name = name,
                            Country = string.IsNullOrWhiteSpace(country) ? null : country,
                            Address = string.IsNullOrWhiteSpace(address) ? null : address
                        };
                        _context.Manufacturers.Add(newManufacturer);
                        manufacturerCache[name] = newManufacturer;
                        result.ImportedCount++;
                    }
                }
                catch (Exception ex)
                {
                    result.Errors.Add($"Row {row.RowNumber()}: {ex.Message}");
                }
            }

            if (result.ImportedCount > 0)
            {
                await _context.SaveChangesAsync();
            }

            result.Success = true;
            return Success(result, $"Imported {result.ImportedCount} manufacturers");
        }
        catch (Exception ex)
        {
            return Error<ImportResultDto>($"Error processing file: {ex.Message}");
        }
    }
}
