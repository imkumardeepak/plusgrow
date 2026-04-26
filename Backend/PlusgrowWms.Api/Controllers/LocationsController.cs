using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PlusgrowWms.Api.Data;
using PlusgrowWms.Api.Helpers;
using PlusgrowWms.Api.Models;
using PlusgrowWms.Api.DTOs;
using AutoMapper;
using ClosedXML.Excel;
using Newtonsoft.Json;

namespace PlusgrowWms.Api.Controllers;

public class LocationsController : BaseController
{
    private readonly PlusgrowDbContext _context;
    private readonly IMapper _mapper;
    private readonly ILogger<LocationsController> _logger;
    
    public LocationsController(PlusgrowDbContext context, IMapper mapper, ILogger<LocationsController> logger)
    {
        _context = context;
        _mapper = mapper;
        _logger = logger;
    }
    

    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<LocationDto>>>> GetLocations()
    {
        try
        {
            var locations = await _context.Locations.OrderBy(l => l.LocationCode).ToListAsync();
            _logger.LogInformation("Fetched {Count} locations from DB", locations.Count);
            return Success(_mapper.Map<List<LocationDto>>(locations));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching locations");
            return Error<List<LocationDto>>($"Error fetching locations: {ex.Message}");
        }
    }
    
    [HttpGet("{id}")]
    public async Task<ActionResult<ApiResponse<LocationDto>>> GetLocation(int id)
    {
        var location = await _context.Locations.FindAsync(id);
        if (location == null)
            return NotFound<LocationDto>("Location not found");
        return Success(_mapper.Map<LocationDto>(location));
    }
    
    [HttpPost]
    public async Task<ActionResult<ApiResponse<LocationDto>>> CreateLocation([FromBody] CreateLocationDto createLocationDto)
    {
        try 
        {
            var location = _mapper.Map<Location>(createLocationDto);
            _context.Locations.Add(location);
            await _context.SaveChangesAsync();
            var totalCount = await _context.Locations.CountAsync();
            return Success(_mapper.Map<LocationDto>(location), $"Location created successfully. Total in DB: {totalCount}");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating location");
            return Error<LocationDto>($"Failed to save location: {ex.InnerException?.Message ?? ex.Message}");
        }
    }
    
    [HttpPut("{id}")]
    public async Task<ActionResult<ApiResponse<LocationDto>>> UpdateLocation(int id, [FromBody] UpdateLocationDto updateLocationDto)
    {
        if (id != updateLocationDto.Id)
            return BadRequest<LocationDto>("ID mismatch");
            
        try 
        {
            var location = await _context.Locations.FindAsync(id);
            if (location == null)
                return NotFound<LocationDto>("Location not found");
                
            _mapper.Map(updateLocationDto, location);
            
            // Explicitly reassign and mark Bins as modified because EF Core JSON array tracking 
            // might miss internal changes made by AutoMapper
            location.Bins = updateLocationDto.Bins?.ToList() ?? new List<string>();
            _context.Entry(location).Property(l => l.Bins).IsModified = true;
            
            await _context.SaveChangesAsync();
            
            return Success(_mapper.Map<LocationDto>(location), "Location updated successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating location");
            return Error<LocationDto>($"Failed to update location: {ex.InnerException?.Message ?? ex.Message}");
        }
    }
    
    [HttpDelete("{id}")]
    public async Task<ActionResult<ApiResponse>> DeleteLocation(int id)
    {
        var location = await _context.Locations.FindAsync(id);
        if (location == null)
            return NotFound("Location not found");
            
        _context.Locations.Remove(location);
        await _context.SaveChangesAsync();
        
        return Ok("Location deleted successfully");
    }

    [HttpPost("upload")]
    [DisableRequestSizeLimit]
    public async Task<ActionResult<ApiResponse<ImportResultDto>>> UploadExcel(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest<ImportResultDto>("Please upload a valid Excel file");

        var result = new ImportResultDto();
        
        try
        {
            using var stream = new MemoryStream();
            await file.CopyToAsync(stream);
            stream.Position = 0;
            
            using var workbook = new XLWorkbook(stream);
            var worksheet = workbook.Worksheets.First();
            var rows = worksheet.RangeUsed().RowsUsed().Skip(1);
            
            var addedLocationCodes = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            
            foreach (var row in rows)
            {
                var col1 = row.Cell(1).GetString()?.Trim();
                var col2 = row.Cell(2).GetString()?.Trim();
                var col3 = row.Cell(3).GetString()?.Trim();
                var col4 = row.Cell(4).GetString()?.Trim();
                var col5 = row.Cell(5).GetString()?.Trim();

                string locationCode = "";
                string aisle = "";
                string rack = "";
                string shelf = "";
                string binsStr = "";

                // Heuristics to detect column layout
                if (string.IsNullOrEmpty(col2) && string.IsNullOrEmpty(col3))
                {
                    // 1-column layout: Col 1 is LocationCode
                    locationCode = col1 ?? "";
                }
                else if (string.IsNullOrEmpty(col5) && !string.IsNullOrEmpty(col2) && string.IsNullOrEmpty(col4))
                {
                    // Maybe 2 columns: LocationCode and Bins? (Unlikely)
                    locationCode = col1 ?? "";
                    binsStr = col2 ?? "";
                }
                else
                {
                    // Standard 5-column layout: Aisle, Rack, Shelf, LocationCode, Bins
                    aisle = col1 ?? "";
                    rack = col2 ?? "";
                    shelf = col3 ?? "";
                    locationCode = col4 ?? "";
                    binsStr = col5 ?? "";
                }

                if (string.IsNullOrEmpty(locationCode)) 
                {
                    if (!string.IsNullOrEmpty(col1) && col1.Contains("-"))
                        locationCode = col1;
                    else
                        continue;
                }

                if (string.IsNullOrEmpty(aisle) && string.IsNullOrEmpty(rack) && string.IsNullOrEmpty(shelf))
                {
                    var parts = locationCode.Split('-');
                    if (parts.Length >= 3)
                    {
                        aisle = parts[0];
                        rack = parts[1];
                        shelf = parts[2];
                    }
                    else
                    {
                        aisle = "N/A";
                        rack = "N/A";
                        shelf = "N/A";
                    }
                }

                var bins = new List<string>();
                if (!string.IsNullOrEmpty(binsStr))
                {
                    if (binsStr.StartsWith("[") && binsStr.EndsWith("]"))
                    {
                        try {
                            bins = JsonConvert.DeserializeObject<List<string>>(binsStr) ?? new List<string>();
                        } catch {
                            bins = binsStr.Trim('[', ']').Split(',', StringSplitOptions.RemoveEmptyEntries)
                                          .Select(b => b.Trim(' ', '"', '\''))
                                          .ToList();
                        }
                    }
                    else if (binsStr.StartsWith("{") && binsStr.EndsWith("}"))
                    {
                         bins = binsStr.Trim('{', '}').Split(',', StringSplitOptions.RemoveEmptyEntries)
                                      .Select(b => b.Trim(' ', '"', '\''))
                                      .ToList();
                    }
                    else
                    {
                        bins = binsStr.Split(',', StringSplitOptions.RemoveEmptyEntries)
                                      .Select(b => b.Trim())
                                      .ToList();
                    }
                }

                if (addedLocationCodes.Contains(locationCode))
                {
                    result.Errors.Add($"Row {row.RowNumber()}: Location code '{locationCode}' is duplicated in this file.");
                    continue;
                }

                var existing = await _context.Locations.FirstOrDefaultAsync(l => l.LocationCode == locationCode);
                if (existing == null)
                {
                    _context.Locations.Add(new Location 
                    { 
                        Aisle = aisle ?? "",
                        Rack = rack ?? "",
                        Shelf = shelf ?? "",
                        LocationCode = locationCode,
                        Bins = bins
                    });
                    addedLocationCodes.Add(locationCode);
                    result.ImportedCount++;
                }
                else
                {
                    // UPSERT logic: If bins are provided in Excel, update them
                    if (bins != null && bins.Any())
                    {
                        // Merge or replace bins? Let's merge unique bins
                        var newBins = new HashSet<string>(existing.Bins);
                        foreach (var bin in bins)
                        {
                            newBins.Add(bin);
                        }
                        existing.Bins = newBins.ToList();
                        
                        // We also optionally update Aisle/Rack/Shelf if they were explicitly provided
                        if (aisle != "N/A" && !string.IsNullOrEmpty(col1) && string.IsNullOrEmpty(col2) == false)
                        {
                            existing.Aisle = aisle;
                            existing.Rack = rack;
                            existing.Shelf = shelf;
                        }
                        
                        // Count as updated/imported
                        result.ImportedCount++;
                    }
                    else
                    {
                        result.Errors.Add($"Row {row.RowNumber()}: Location code '{locationCode}' already exists in the database and no new bins were provided.");
                    }
                }
            }
            
            await _context.SaveChangesAsync();
            result.Success = true;
            return Success(result, $"Imported {result.ImportedCount} locations successfully");
        }
        catch (Exception ex)
        {
            return Error<ImportResultDto>($"Error processing file: {ex.Message}");
        }
    }
}
