using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PlusgrowWms.Api.Data;
using PlusgrowWms.Api.DTOs;
using PlusgrowWms.Api.Helpers;

namespace PlusgrowWms.Api.Controllers;

public class PartyDashboardController : BaseController
{
    private readonly PlusgrowDbContext _context;

    public PartyDashboardController(PlusgrowDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<PartyDashboardSummaryDto>>> GetPartyDashboard()
    {
        var roleName = User.FindFirstValue(ClaimTypes.Role) ?? string.Empty;
        if (!string.Equals(roleName, "Party", StringComparison.OrdinalIgnoreCase))
            return BadRequest<PartyDashboardSummaryDto>("Only party users can access this dashboard");

        var userEmail = (User.FindFirstValue(ClaimTypes.Email) ?? User.Identity?.Name ?? string.Empty)
            .Trim()
            .ToLowerInvariant();
        var username = (User.FindFirstValue(ClaimTypes.Name) ?? string.Empty)
            .Trim()
            .ToLowerInvariant();

        var party = await _context.Parties
            .AsNoTracking()
            .FirstOrDefaultAsync(x =>
                x.Email.ToLower() == userEmail ||
                x.Email.ToLower() == username);

        if (party == null)
            return NotFound<PartyDashboardSummaryDto>("Party profile was not found for this user");

        var partyName = party.Name.Trim();
        var products = await _context.Products
            .Include(x => x.Commodity)
            .Include(x => x.Manufacturer)
            .AsNoTracking()
            .Where(x => x.Ownership != null && x.Ownership.ToLower() == partyName.ToLower())
            .OrderBy(x => x.Name)
            .ToListAsync();

        var productIds = products.Select(x => x.Id).ToList();
        var quantities = await _context.ProductQuantities
            .AsNoTracking()
            .Where(x => productIds.Contains(x.ProductId))
            .ToDictionaryAsync(x => x.ProductId);
        var allotments = await _context.ProductAllottedLocations
            .AsNoTracking()
            .Where(x => productIds.Contains(x.ProductId))
            .ToDictionaryAsync(x => x.ProductId);

        var productRows = products.Select(product =>
        {
            quantities.TryGetValue(product.Id, out var quantity);
            allotments.TryGetValue(product.Id, out var allotment);
            var locations = allotment?.LocationJson?
                .Where(x => x.Value > 0)
                .OrderBy(x => x.Key)
                .Select(x => new PartyDashboardLocationDto
                {
                    LocationCode = x.Key,
                    Quantity = x.Value,
                })
                .ToList() ?? new List<PartyDashboardLocationDto>();

            return new PartyDashboardProductDto
            {
                ProductId = product.Id,
                SkuCode = product.Sku ?? string.Empty,
                ProductName = product.Name,
                Alias = product.Alias,
                CommodityName = product.Commodity?.Name,
                ManufacturerName = product.Manufacturer?.Name,
                CountryOfOrigin = product.CountryOfOrigin,
                NetQuantity = product.NetQuantity,
                UnitType = product.UnitType,
                Mrp = product.Mrp,
                Weight = product.Weight,
                Factor = product.Factor,
                Ussp = product.Ussp,
                BestBeforeMonths = product.BestBeforeMonths,
                Note = product.Note,
                Ownership = product.Ownership,
                CurrentQuantity = quantity?.CurrentQuantity ?? 0,
                Locations = locations,
            };
        }).ToList();

        var totalStock = productRows.Sum(x => x.CurrentQuantity);
        var located = productRows.Sum(x => x.Locations.Sum(location => location.Quantity));

        return Success(new PartyDashboardSummaryDto
        {
            PartyName = party.Name,
            PartyEmail = party.Email,
            ProductCount = productRows.Count,
            TotalStockQuantity = totalStock,
            LocatedQuantity = located,
            UnlocatedQuantity = Math.Max(totalStock - located, 0),
            Products = productRows,
        });
    }
}
