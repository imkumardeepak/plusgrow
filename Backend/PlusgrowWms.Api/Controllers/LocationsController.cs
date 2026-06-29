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
                var locationCode = row.Cell(1).GetString()?.Trim();

                // Skip empty rows
                if (string.IsNullOrEmpty(locationCode))
                    continue;

                // Split location code into Aisle-Rack-Shelf
                var parts = locationCode.Split('-');
                string aisle = parts.Length > 0 ? parts[0] : "N/A";
                string rack = parts.Length > 1 ? parts[1] : "N/A";
                string shelf = parts.Length > 2 ? parts[2] : "N/A";

                var bins = new List<string>();

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
                        Aisle = aisle,
                        Rack = rack,
                        Shelf = shelf,
                        LocationCode = locationCode,
                        Bins = bins
                    });
                    addedLocationCodes.Add(locationCode);
                    result.ImportedCount++;
                }
                else
                {
                    // Update Aisle/Rack/Shelf from the location code split
                    existing.Aisle = aisle;
                    existing.Rack = rack;
                    existing.Shelf = shelf;
                    result.ImportedCount++;
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

    [HttpPost("{id}/map-bins")]
    public async Task<ActionResult<ApiResponse<LocationDto>>> MapBinsToLocation(int id, [FromBody] MapBinsRequestDto request)
    {
        try
        {
            var location = await _context.Locations.FindAsync(id);
            if (location == null)
                return NotFound<LocationDto>("Location not found");

            // Validate bins exist in master
            var existingBins = await _context.Bins.Where(b => request.BinCodes.Contains(b.BinCode)).ToListAsync();
            var existingBinCodes = existingBins.Select(b => b.BinCode).ToHashSet();

            var invalidBins = request.BinCodes.Where(code => !existingBinCodes.Contains(code)).ToList();
            if (invalidBins.Any())
            {
                return BadRequest<LocationDto>($"Invalid bin codes: {string.Join(", ", invalidBins)}. Please add them to Bin Master first.");
            }

            // Find bins that are already assigned to other locations (to unmap them)
            var allLocations = await _context.Locations.Where(l => l.Id != id).ToListAsync();
            var binsToUnmap = new Dictionary<string, string>(); // binCode -> oldLocationCode

            foreach (var binCode in request.BinCodes)
            {
                foreach (var otherLocation in allLocations)
                {
                    if (otherLocation.Bins.Contains(binCode))
                    {
                        binsToUnmap[binCode] = otherLocation.LocationCode;
                        otherLocation.Bins.Remove(binCode);
                        _context.Entry(otherLocation).Property(l => l.Bins).IsModified = true;
                        _logger.LogInformation("Unmapped bin {BinCode} from location {OldLocationCode}", binCode, otherLocation.LocationCode);
                    }
                }
            }

            // Map bins to current location
            location.Bins = request.BinCodes.ToList();
            _context.Entry(location).Property(l => l.Bins).IsModified = true;

            // Move products from old location bins to new location bins
            if (binsToUnmap.Count > 0)
            {
                var allAllocations = await _context.ProductAllottedLocations.ToListAsync();
                foreach (var allocation in allAllocations)
                {
                    if (allocation.LocationJson == null) continue;
                    
                    bool changed = false;
                    var newLocationJson = new Dictionary<string, int>(allocation.LocationJson, StringComparer.OrdinalIgnoreCase);

                    foreach (var unmapped in binsToUnmap)
                    {
                        var binCode = unmapped.Key;
                        var oldLocationCode = unmapped.Value;
                        var oldKey = $"{oldLocationCode}::{binCode.ToUpper()}";
                        var newKey = $"{location.LocationCode}::{binCode.ToUpper()}";

                        // Also check for case-insensitive match by looking through keys manually if needed
                        // StringComparer.OrdinalIgnoreCase on Dictionary handles it
                        if (newLocationJson.TryGetValue(oldKey, out var qty))
                        {
                            newLocationJson.Remove(oldKey);
                            newLocationJson.TryGetValue(newKey, out var existingQty);
                            newLocationJson[newKey] = existingQty + qty;
                            changed = true;
                        }
                    }

                    if (changed)
                    {
                        allocation.LocationJson = newLocationJson;
                        allocation.UpdatedAt = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified);
                        _context.Entry(allocation).Property(a => a.LocationJson).IsModified = true;
                    }
                }
            }

            await _context.SaveChangesAsync();

            var unmappedCount = binsToUnmap.Count;
            var message = unmappedCount > 0
                ? $"Successfully mapped {request.BinCodes.Count} bins to {location.LocationCode}. Unmapped {unmappedCount} bins from other locations."
                : $"Successfully mapped {request.BinCodes.Count} bins to {location.LocationCode}";

            return Success(_mapper.Map<LocationDto>(location), message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error mapping bins to location {LocationId}", id);
            return Error<LocationDto>($"Failed to map bins: {ex.InnerException?.Message ?? ex.Message}");
        }
    }
}

public class MapBinsRequestDto
{
    public List<string> BinCodes { get; set; } = new();
}
