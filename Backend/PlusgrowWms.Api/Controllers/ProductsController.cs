using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PlusgrowWms.Api.Data;
using PlusgrowWms.Api.Helpers;
using PlusgrowWms.Api.Models;
using PlusgrowWms.Api.DTOs;
using PlusgrowWms.Api.Services;
using ClosedXML.Excel;

namespace PlusgrowWms.Api.Controllers;

public class ProductsController : BaseController
{
	private readonly PlusgrowDbContext _context;
	private readonly IProductService _productService;
	private readonly ILogger<ProductsController> _logger;
	private readonly IAuditLogService _auditLogService;

	public ProductsController(PlusgrowDbContext context, IProductService productService, ILogger<ProductsController> logger, IAuditLogService auditLogService)
	{
		_context = context;
		_productService = productService;
		_logger = logger;
		_auditLogService = auditLogService;
	}

	[HttpGet]
	public async Task<ActionResult<ApiResponse<List<Product>>>> GetProducts([FromQuery] ListQueryDto queryDto)
	{
		var result = await _productService.GetPagedAsync(queryDto);
		return Success(result.Items, result.Page, result.PageSize, result.Total);
	}

	[HttpGet("{id}")]
	public async Task<ActionResult<ApiResponse<Product>>> GetProduct(int id)
	{
		var product = await _productService.GetByIdAsync(id);

		if (product == null)
			return NotFound<Product>("Product not found");

		return Success(product);
	}

	[HttpPost]
	public async Task<ActionResult<ApiResponse<Product>>> CreateProduct([FromBody] Product product)
	{
		var created = await _productService.CreateAsync(product);

		// Ensure the default location 0-0-0 exists in the locations table
		var defaultLocationExists = await _context.Locations
			.AnyAsync(l => l.LocationCode == Location.DefaultLocationCode);
		if (!defaultLocationExists)
			_context.Locations.Add(Location.CreateDefault());

		// Create a default allotment so the product immediately appears
		// in the StockMovement location dropdown (even before any stock is added)
		var hasAllotment = await _context.ProductAllottedLocations
			.AnyAsync(a => a.ProductId == created.Id);
		if (!hasAllotment)
		{
			_context.ProductAllottedLocations.Add(new ProductAllottedLocation
			{
				ProductId = created.Id,
				LocationJson = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase)
				{
					[Location.DefaultLocationCode] = 0,
				},
				UpdatedAt = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified)
			});
			await _context.SaveChangesAsync();
		}

		return Success(created, "Product created successfully");
	}

	[HttpPut("{id}")]
	public async Task<ActionResult<ApiResponse<Product>>> UpdateProduct(int id, [FromBody] Product product)
	{
		var (updated, error) = await _productService.UpdateAsync(id, product);
		if (error == "ID mismatch")
			return BadRequest<Product>(error);
		if (updated == null)
			return NotFound<Product>("Product not found");

		_logger.LogInformation("Product {ProductId} updated successfully", id);
		return Success(updated, "Product updated successfully");
	}

	[HttpDelete("{id}")]
	public async Task<ActionResult<ApiResponse>> DeleteProduct(int id)
	{
		if (!await _productService.DeleteAsync(id))
			return NotFound("Product not found");

		return Ok("Product deleted successfully");
	}

	[HttpGet("search")]
	public async Task<ActionResult<ApiResponse<List<Product>>>> Search([FromQuery] string? q)
	{
		var products = await _productService.SearchAsync(q);
		return Success(products);
	}

	[HttpPost("upload")]
	[DisableRequestSizeLimit]
	[RequestFormLimits(MultipartBodyLengthLimit = 104857600)]
	public async Task<ActionResult<ApiResponse<ProductUploadResult>>> UploadExcel(IFormFile file)
	{
		if (file == null || file.Length == 0)
			return BadRequest<ProductUploadResult>("Please upload a valid Excel file");

		if (!file.FileName.EndsWith(".xlsx", StringComparison.OrdinalIgnoreCase) &&
			!file.FileName.EndsWith(".xls", StringComparison.OrdinalIgnoreCase))
			return BadRequest<ProductUploadResult>("Only Excel files (.xlsx, .xls) are allowed");

		var result = new ProductUploadResult { Errors = new List<string>() };

		try
		{
			using var stream = new MemoryStream();
			await file.CopyToAsync(stream);
			stream.Position = 0;

			using var workbook = new XLWorkbook(stream);
			var worksheet = workbook.Worksheets.FirstOrDefault(w =>
				string.Equals(w.Name, "Product Template", StringComparison.OrdinalIgnoreCase))
				?? workbook.Worksheets.First();

			var headerRow = worksheet.Row(1);
			var headers = headerRow.CellsUsed().ToDictionary(
				c => c.GetString().Trim(),
				c => c.Address.ColumnNumber,
				StringComparer.OrdinalIgnoreCase
			);

			IXLCell GetCell(IXLRangeRow rangeRow, params string[] names)
			{
				foreach (var name in names)
				{
					if (headers.TryGetValue(name, out var colNum))
						return worksheet.Row(rangeRow.RowNumber()).Cell(colNum);
				}
				return worksheet.Row(rangeRow.RowNumber()).Cell(100);
			}

			var rangeUsed = worksheet.RangeUsed();
			if (rangeUsed == null)
			{
				result.Success = true;
				return Success(result, "Imported 0 products (empty sheet)");
			}
			var rows = rangeUsed.RowsUsed().Skip(1).ToList();

			// ─── 1. COLLECT all unique names from the sheet up front ───────────────
			var allManufacturerNames = rows
				.Select(r => GetCell(r, "Manufacturer Name").GetString()?.Trim())
				.Where(n => !string.IsNullOrEmpty(n))
				.ToHashSet(StringComparer.OrdinalIgnoreCase);

			var allCommodityNames = rows
				.Select(r => GetCell(r, "Commodity Name").GetString()?.Trim())
				.Where(n => !string.IsNullOrEmpty(n))
				.ToHashSet(StringComparer.OrdinalIgnoreCase);

			var allSkus = rows
				.Select(r => GetCell(r, "SKU").GetString()?.Trim())
				.Where(s => !string.IsNullOrEmpty(s))
				.Select(s => s!.ToUpperInvariant())
				.ToHashSet(StringComparer.OrdinalIgnoreCase);

			var allProductNames = rows
				.Select(r => GetCell(r, "Name", "Product Name").GetString()?.Trim())
				.Where(n => !string.IsNullOrEmpty(n))
				.Select(n => n!.ToUpperInvariant())
				.ToHashSet(StringComparer.OrdinalIgnoreCase);

			// ─── 2. BULK LOAD existing data ──────────────────────────────────────
			// Load ALL manufacturers & commodities to avoid case-sensitivity mismatches
			// with PostgreSQL's unique index (IX_commodities_name, etc.)
			var existingManufacturers = await _context.Manufacturers
				.ToDictionaryAsync(m => m.Name, StringComparer.OrdinalIgnoreCase);

			var existingCommodities = await _context.Commodities
				.ToDictionaryAsync(c => c.Name, StringComparer.OrdinalIgnoreCase);

			var existingSkus = await _context.Products
				.Where(p => p.Sku != null && allSkus.Contains(p.Sku.ToUpper()))
				.Select(p => p.Sku!.ToUpper())
				.ToHashSetAsync(StringComparer.OrdinalIgnoreCase);

			var existingProductNames = await _context.Products
				.Where(p => allProductNames.Contains(p.Name.ToUpper()))
				.Select(p => p.Name.ToUpper())
				.ToHashSetAsync(StringComparer.OrdinalIgnoreCase);

			// ─── 3. CREATE missing manufacturers & commodities in bulk ─────────────
			var newManufacturers = allManufacturerNames
				.Where(n => !existingManufacturers.ContainsKey(n!))
				.Select(n => new Manufacturer { Name = n! })
				.ToList();

			if (newManufacturers.Any())
			{
				await _context.Manufacturers.AddRangeAsync(newManufacturers);
				await _context.SaveChangesAsync();
				foreach (var m in newManufacturers)
					existingManufacturers[m.Name!] = m;
			}

			var newCommodities = allCommodityNames
				.Where(n => !existingCommodities.ContainsKey(n!))
				.Select(n => new Commodity { Name = n!.ToUpper() })
				.ToList();

			if (newCommodities.Any())
			{
				await _context.Commodities.AddRangeAsync(newCommodities);
				await _context.SaveChangesAsync();
				foreach (var c in newCommodities)
					existingCommodities[c.Name!] = c;
			}

			// ─── 4. BUILD all Product objects in memory (no DB calls in loop) ──────
			var newProducts = new List<Product>();
			var rowProductMap = new List<(IXLRangeRow Row, Product Product)>();
			var processedSkus = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
			var processedProductNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

			foreach (var row in rows)
			{
				try
				{
					var productName = GetCell(row, "Name", "Product Name").GetString()?.Trim();
					var sku = GetCell(row, "SKU").GetString()?.Trim();

					if (string.IsNullOrEmpty(productName))
					{
						result.SkippedRows.Add(new SkippedRowInfo
						{
							RowNumber = row.RowNumber(),
							Sku = sku,
							ProductName = productName,
							Reason = "Product Name is blank"
						});
						continue;
					}

					if (string.IsNullOrEmpty(sku))
					{
						result.SkippedRows.Add(new SkippedRowInfo
						{
							RowNumber = row.RowNumber(),
							Sku = null,
							ProductName = productName,
							Reason = "SKU code is blank"
						});
						continue;
					}

					var normalizedSku = sku.ToUpperInvariant();
					var normalizedProductName = productName.ToUpperInvariant();

					if (existingSkus.Contains(normalizedSku))
					{
						result.SkippedRows.Add(new SkippedRowInfo
						{
							RowNumber = row.RowNumber(),
							Sku = sku,
							ProductName = productName,
							Reason = "Product already exists in master with this SKU"
						});
						continue;
					}

					if (existingProductNames.Contains(normalizedProductName))
					{
						result.SkippedRows.Add(new SkippedRowInfo
						{
							RowNumber = row.RowNumber(),
							Sku = sku,
							ProductName = productName,
							Reason = "Product already exists in master with this Product Name"
						});
						continue;
					}

					if (processedSkus.Contains(normalizedSku))
					{
						result.SkippedRows.Add(new SkippedRowInfo
						{
							RowNumber = row.RowNumber(),
							Sku = sku,
							ProductName = productName,
							Reason = "Duplicate SKU in this file"
						});
						continue;
					}
					processedSkus.Add(normalizedSku);

					if (processedProductNames.Contains(normalizedProductName))
					{
						result.SkippedRows.Add(new SkippedRowInfo
						{
							RowNumber = row.RowNumber(),
							Sku = sku,
							ProductName = productName,
							Reason = "Duplicate Product Name in this file"
						});
						continue;
					}
					processedProductNames.Add(normalizedProductName);

					existingManufacturers.TryGetValue(
						GetCell(row, "Manufacturer Name").GetString()?.Trim() ?? "", out var manufacturer);
					existingCommodities.TryGetValue(
						GetCell(row, "Commodity Name").GetString()?.Trim() ?? "", out var commodity);

					decimal.TryParse(GetCell(row, "MRP").GetString(), out decimal mrp);
					int.TryParse(GetCell(row, "Best Before", "Best Before (Months)").GetString(), out int bestBefore);
					decimal.TryParse(GetCell(row, "Weight").GetString(), out decimal weight);
					var netQntyStr = GetCell(row, "MRP Quantity", "Net Qnty").GetString()?.Trim();
					var ownership = GetCell(row, "Ownership").GetString()?.Trim();
					if (string.IsNullOrEmpty(ownership)) ownership = "Self";

					var product = new Product
					{
						Name = productName,
						Sku = sku,
						Alias = GetCell(row, "Alias").GetString()?.Trim(),
						ManufacturerId = manufacturer?.Id,
						CommodityId = commodity?.Id,
						CountryOfOrigin = GetCell(row, "Country of Origin").GetString()?.Trim() ?? "India",
						Factor = GetCell(row, "Factor").GetString()?.Trim(),
						NetQuantity = string.IsNullOrEmpty(netQntyStr) ? null : netQntyStr,
						UnitType = (GetCell(row, "Unit Type").GetString()?.Trim() ?? "pcs").ToLowerInvariant(),
						Mrp = mrp,
						BestBeforeMonths = bestBefore > 0 ? bestBefore : 84,
						Weight = weight > 0 ? weight : null,
						Ownership = ownership,
						Note = GetCell(row, "Note").GetString()?.Trim()
					};

					product.CalculateUssp();
					newProducts.Add(product);
					rowProductMap.Add((row, product));
				}
				catch (Exception ex)
				{
					result.Errors.Add($"Row {row.RowNumber()}: {ex.Message}");
				}
			}

			// ─── 5. BULK INSERT all products in one shot ───────────────────────────
			if (newProducts.Any())
			{
				await _context.Products.AddRangeAsync(newProducts);
				await _context.SaveChangesAsync(); // single save for ALL products
				result.ImportedCount = newProducts.Count;
			}

			// ─── 6. BULK UPSERT stock quantities and default location allotments ───
			var productIds = newProducts.Select(p => p.Id).ToList();
			var existingQtys = await _context.ProductQuantities
				.Where(pq => productIds.Contains(pq.ProductId))
				.ToDictionaryAsync(pq => pq.ProductId);
			var existingAllotments = await _context.ProductAllottedLocations
				.Where(al => productIds.Contains(al.ProductId))
				.ToDictionaryAsync(al => al.ProductId);

			var now = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified);
			var newQtys = new List<ProductQuantity>();
			var newAllotments = new List<ProductAllottedLocation>();

			var defaultLocationExists = await _context.Locations
				.AnyAsync(l => l.LocationCode == Location.DefaultLocationCode);
			if (!defaultLocationExists)
			{
				_context.Locations.Add(Location.CreateDefault());
			}

			foreach (var (row, product) in rowProductMap)
			{
				var stockQntyStr = GetCell(row, "Stock", "Stock Qnty").GetString()?.Trim();

				// Skip blank or zero — only process rows with stock > 0
				if (string.IsNullOrEmpty(stockQntyStr) ||
					!int.TryParse(stockQntyStr, out int stockQnty) || stockQnty <= 0) continue;

				if (existingQtys.TryGetValue(product.Id, out var existing))
				{
					existing.CurrentQuantity = stockQnty;
					existing.UpdatedAt = now;
				}
				else
				{
					newQtys.Add(new ProductQuantity
					{
						ProductId = product.Id,
						CurrentQuantity = stockQnty,
						UpdatedAt = now
					});
				}

				if (existingAllotments.TryGetValue(product.Id, out var allotment))
				{
					allotment.LocationJson ??= new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
					allotment.LocationJson[Location.DefaultLocationCode] = stockQnty;
					allotment.UpdatedAt = now;
					_context.Entry(allotment).Property(x => x.LocationJson).IsModified = true;
				}
				else
				{
					newAllotments.Add(new ProductAllottedLocation
					{
						ProductId = product.Id,
						LocationJson = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase)
						{
							[Location.DefaultLocationCode] = stockQnty,
						},
						UpdatedAt = now
					});
				}
			}

			if (newQtys.Any())
				await _context.ProductQuantities.AddRangeAsync(newQtys);

			if (newAllotments.Any())
				await _context.ProductAllottedLocations.AddRangeAsync(newAllotments);

			await _context.SaveChangesAsync(); // final single save

			result.Success = true;
			_logger.LogInformation("Excel upload completed. Imported {Count} products", result.ImportedCount);
			return Success(result, $"Successfully imported {result.ImportedCount} products");
		}
		catch (Exception ex)
		{
			_logger.LogError(ex, "Error uploading Excel file");
			return Error<ProductUploadResult>($"Error processing file: {ex.Message}");
		}
	}

	[HttpPost("update-excel")]
	public async Task<ActionResult<ApiResponse<ProductUploadResult>>> UpdateExcel(IFormFile file)
	{
		if (file == null || file.Length == 0)
			return BadRequest<ProductUploadResult>("Please upload a valid Excel file");

		if (!file.FileName.EndsWith(".xlsx", StringComparison.OrdinalIgnoreCase) &&
			!file.FileName.EndsWith(".xls", StringComparison.OrdinalIgnoreCase))
			return BadRequest<ProductUploadResult>("Only Excel files (.xlsx, .xls) are allowed");

		var result = new ProductUploadResult { Errors = new List<string>() };

		try
		{
			using var stream = new MemoryStream();
			await file.CopyToAsync(stream);
			stream.Position = 0;

			using var workbook = new XLWorkbook(stream);
			var worksheet = workbook.Worksheet(1); // First sheet

			var headerRow = worksheet.Row(1);
			var headers = headerRow.CellsUsed().ToDictionary(
				c => c.GetString().Trim(),
				c => c.Address.ColumnNumber,
				StringComparer.OrdinalIgnoreCase
			);

			if (!headers.ContainsKey("SKU"))
			{
				return BadRequest<ProductUploadResult>("The uploaded template must contain a 'SKU' column.");
			}

			var rangeUsed = worksheet.RangeUsed();
			if (rangeUsed == null)
			{
				result.Success = true;
				return Success(result, "Updated 0 products (empty sheet)");
			}
			var rows = rangeUsed.RowsUsed().Skip(1); // Skip header row

			var createdManufacturers = new Dictionary<string, Manufacturer>(StringComparer.OrdinalIgnoreCase);
			var createdCommodities = new Dictionary<string, Commodity>(StringComparer.OrdinalIgnoreCase);
			var updatedProductIds = new List<int>();

			foreach (var row in rows)
			{
				try
				{
					var sku = row.Cell(headers["SKU"]).GetString()?.Trim();
					var productNameForLog = headers.ContainsKey("Name")
						? row.Cell(headers["Name"]).GetString()?.Trim()
						: headers.ContainsKey("Product Name")
							? row.Cell(headers["Product Name"]).GetString()?.Trim()
							: null;

					if (string.IsNullOrEmpty(sku))
					{
						result.SkippedRows.Add(new SkippedRowInfo
						{
							RowNumber = row.RowNumber(),
							Sku = null,
							ProductName = productNameForLog,
							Reason = "SKU code is blank"
						});
						continue;
					}

					var product = await _context.Products.FirstOrDefaultAsync(p => p.Sku == sku);
					if (product == null)
					{
						result.SkippedRows.Add(new SkippedRowInfo
						{
							RowNumber = row.RowNumber(),
							Sku = sku,
							ProductName = productNameForLog,
							Reason = "SKU not found in database"
						});
						continue;
					}

					// Update dynamically based on headers
					if (headers.ContainsKey("Name"))
					{
						var val = row.Cell(headers["Name"]).GetString()?.Trim();
						if (!string.IsNullOrEmpty(val)) product.Name = val;
					}
					else if (headers.ContainsKey("Product Name"))
					{
						var val = row.Cell(headers["Product Name"]).GetString()?.Trim();
						if (!string.IsNullOrEmpty(val)) product.Name = val;
					}

					if (headers.ContainsKey("Alias"))
						product.Alias = row.Cell(headers["Alias"]).GetString()?.Trim();

					if (headers.ContainsKey("Country of Origin"))
						product.CountryOfOrigin = row.Cell(headers["Country of Origin"]).GetString()?.Trim();

					if (headers.ContainsKey("Unit Type"))
						product.UnitType = row.Cell(headers["Unit Type"]).GetString()?.Trim();

					if (headers.ContainsKey("Ownership"))
						product.Ownership = row.Cell(headers["Ownership"]).GetString()?.Trim();

					if (headers.ContainsKey("Factor"))
						product.Factor = row.Cell(headers["Factor"]).GetString()?.Trim();

					if (headers.ContainsKey("Note"))
						product.Note = row.Cell(headers["Note"]).GetString()?.Trim();

					if (headers.ContainsKey("Carton QR"))
					{
						var val = row.Cell(headers["Carton QR"]).GetString()?.Trim();
						product.CartonQr = string.IsNullOrEmpty(val) ? null : val;
					}
					else if (headers.ContainsKey("CartonQr"))
					{
						var val = row.Cell(headers["CartonQr"]).GetString()?.Trim();
						product.CartonQr = string.IsNullOrEmpty(val) ? null : val;
					}

					if (headers.ContainsKey("Carton Per Item"))
					{
						var val = row.Cell(headers["Carton Per Item"]).GetString()?.Trim();
						product.CartonPerItem = int.TryParse(val, out var cartonPerItem) && cartonPerItem > 0
							? cartonPerItem
							: null;
					}
					else if (headers.ContainsKey("CartonPerItem"))
					{
						var val = row.Cell(headers["CartonPerItem"]).GetString()?.Trim();
						product.CartonPerItem = int.TryParse(val, out var cartonPerItem) && cartonPerItem > 0
							? cartonPerItem
							: null;
					}

					if (headers.ContainsKey("MRP Quantity"))
					{
						var val = row.Cell(headers["MRP Quantity"]).GetString()?.Trim();
						product.NetQuantity = string.IsNullOrEmpty(val) ? null : val;
					}
					else if (headers.ContainsKey("Net Qnty"))
					{
						var val = row.Cell(headers["Net Qnty"]).GetString()?.Trim();
						product.NetQuantity = string.IsNullOrEmpty(val) ? null : val;
					}

					if (headers.ContainsKey("Best Before"))
					{
						if (int.TryParse(row.Cell(headers["Best Before"]).GetString(), out int bestBefore))
							product.BestBeforeMonths = bestBefore > 0 ? bestBefore : 84;
					}
					else if (headers.ContainsKey("Best Before (Months)"))
					{
						if (int.TryParse(row.Cell(headers["Best Before (Months)"]).GetString(), out int bestBefore))
							product.BestBeforeMonths = bestBefore > 0 ? bestBefore : 84;
					}

					if (headers.ContainsKey("MRP"))
					{
						if (decimal.TryParse(row.Cell(headers["MRP"]).GetString(), out decimal mrp))
							product.Mrp = mrp;
					}

					if (headers.ContainsKey("USP"))
					{
						if (decimal.TryParse(row.Cell(headers["USP"]).GetString(), out decimal ussp))
							product.Ussp = ussp;
					}
					else if (headers.ContainsKey("USSP"))
					{
						if (decimal.TryParse(row.Cell(headers["USSP"]).GetString(), out decimal ussp))
							product.Ussp = ussp;
					}

					if (headers.ContainsKey("Weight"))
					{
						var val = row.Cell(headers["Weight"]).GetString()?.Trim();
						if (string.IsNullOrEmpty(val))
						{
							product.Weight = null;
						}
						else if (decimal.TryParse(val, out decimal weight))
						{
							product.Weight = weight > 0 ? weight : null;
						}
					}

					product.CalculateUssp();

					if (headers.ContainsKey("Manufacturer Name"))
					{
						var manufacturerName = row.Cell(headers["Manufacturer Name"]).GetString()?.Trim();
						if (!string.IsNullOrEmpty(manufacturerName))
						{
							if (!createdManufacturers.TryGetValue(manufacturerName, out var manufacturer))
							{
								manufacturer = await _context.Manufacturers
									.FirstOrDefaultAsync(m => m.Name.ToLower() == manufacturerName.ToLower());
								if (manufacturer == null)
								{
									manufacturer = new Manufacturer { Name = manufacturerName };
									_context.Manufacturers.Add(manufacturer);
									await _context.SaveChangesAsync();
								}
								createdManufacturers[manufacturerName] = manufacturer;
							}
							product.ManufacturerId = createdManufacturers[manufacturerName].Id;
						}
					}

					if (headers.ContainsKey("Commodity Name"))
					{
						var commodityName = row.Cell(headers["Commodity Name"]).GetString()?.Trim();
						if (!string.IsNullOrEmpty(commodityName))
						{
							if (!createdCommodities.TryGetValue(commodityName, out var commodity))
							{
								commodity = await _context.Commodities
									.FirstOrDefaultAsync(c => c.Name.ToLower() == commodityName.ToLower());
								if (commodity == null)
								{
									commodity = new Commodity { Name = commodityName.ToUpper() };
									_context.Commodities.Add(commodity);
									await _context.SaveChangesAsync();
								}
								createdCommodities[commodityName] = commodity;
							}
							product.CommodityId = createdCommodities[commodityName].Id;
						}
					}

					if (headers.ContainsKey("Stock Quantity"))
					{
						var stockStr = row.Cell(headers["Stock Quantity"]).GetString()?.Trim();
						// Skip blank or zero — only update when stock > 0
						if (int.TryParse(stockStr, out int stockQnty) && stockQnty > 0)
						{
							var now = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified);

							var productQuantity = await _context.ProductQuantities.FirstOrDefaultAsync(q => q.ProductId == product.Id);
							int quantityBefore = productQuantity?.CurrentQuantity ?? 0;
							int quantityChange = stockQnty - quantityBefore;

							if (productQuantity != null)
							{
								productQuantity.CurrentQuantity = stockQnty;
								productQuantity.UpdatedAt = now;
							}
							else
							{
								_context.ProductQuantities.Add(new ProductQuantity
								{
									ProductId = product.Id,
									CurrentQuantity = stockQnty,
									UpdatedAt = now
								});
							}

							var productLocation = await _context.ProductAllottedLocations.FirstOrDefaultAsync(l => l.ProductId == product.Id);
							var resetLocationStock = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase)
							{
								[Location.DefaultLocationCode] = stockQnty
							};

							if (productLocation != null)
							{
								productLocation.LocationJson = resetLocationStock;
								productLocation.UpdatedAt = now;
								_context.Entry(productLocation).Property(x => x.LocationJson).IsModified = true;
							}
							else
							{
								_context.ProductAllottedLocations.Add(new ProductAllottedLocation
								{
									ProductId = product.Id,
									LocationJson = resetLocationStock,
									UpdatedAt = now
								});
							}

							_context.ProductStockMovements.Add(new ProductStockMovement
							{
								ProductId = product.Id,
								QuantityChange = quantityChange,
								QuantityBefore = quantityBefore,
								QuantityAfter = stockQnty,
								Reason = "Excel Bulk Update",
								MovementType = "Bulk Update",
								Notes = "Updated via Excel upload",
								CreatedAt = now
							});

						}
					}

					result.ImportedCount++;
					updatedProductIds.Add(product.Id);
				}
				catch (Exception ex)
				{
					result.Errors.Add($"Row {row.RowNumber()}: {ex.Message}");
				}
			}

			// Ensure every updated product has a default 0-0-0 allotment so the
			// location dropdown in StockMovement is never empty.
			if (updatedProductIds.Any())
			{
				var nowFix = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified);

				// Products that already have an allotment row in the DB.
				var existingAllotmentIds = await _context.ProductAllottedLocations
					.Where(a => updatedProductIds.Contains(a.ProductId))
					.Select(a => a.ProductId)
					.ToHashSetAsync();

				// IMPORTANT: also exclude products whose allotment was already added
				// to the change tracker earlier in this request (e.g. from the
				// "Stock Quantity > 0" branch in the row loop above). Otherwise we'd
				// insert a duplicate row and violate IX_product_allotted_locations_product_id.
				var pendingAllotmentIds = _context.ChangeTracker
					.Entries<ProductAllottedLocation>()
					.Where(e => e.State == EntityState.Added)
					.Select(e => e.Entity.ProductId)
					.ToHashSet();
				existingAllotmentIds.UnionWith(pendingAllotmentIds);

				var defaultLocExists = await _context.Locations
					.AnyAsync(l => l.LocationCode == Location.DefaultLocationCode);
				if (!defaultLocExists)
					_context.Locations.Add(Location.CreateDefault());

				var missingAllotments = updatedProductIds
					.Distinct()
					.Where(id => !existingAllotmentIds.Contains(id))
					.Select(id => new ProductAllottedLocation
					{
						ProductId = id,
						LocationJson = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase)
						{
							[Location.DefaultLocationCode] = 0,
						},
						UpdatedAt = nowFix
					})
					.ToList();

				if (missingAllotments.Any())
					await _context.ProductAllottedLocations.AddRangeAsync(missingAllotments);
			}

			await _context.SaveChangesAsync();
			result.Success = true;

			_logger.LogInformation("Excel update completed. Updated {Count} products", result.ImportedCount);

			await _auditLogService.LogCustomActionAsync(
				"BulkStockUpload",
				"Product",
				null,
				$"Bulk updated {result.ImportedCount} products via Excel",
				null,
				new { ImportedCount = result.ImportedCount, SkippedCount = result.SkippedRows.Count }
			);

			return Success(result, $"Successfully updated {result.ImportedCount} products");
		}
		catch (Exception ex)
		{
			_logger.LogError(ex, "Error updating from Excel file");
			return Error<ProductUploadResult>($"Error processing file: {ex.Message}");
		}
	}

	[HttpGet("lookup")]
	public async Task<ActionResult<ApiResponse<ProductLookupDto>>> LookupProduct([FromQuery] string sku)
	{
		if (string.IsNullOrWhiteSpace(sku))
			return BadRequest<ProductLookupDto>("SKU is required");

		var normalizedSku = sku.Trim().ToLower();

		// Find the product by SKU or Alias (case-insensitive)
		var product = await _context.Products
			.Include(p => p.Commodity)
			.Include(p => p.Manufacturer)
			.AsNoTracking()
			.FirstOrDefaultAsync(p => (p.Sku != null && p.Sku.ToLower() == normalizedSku) || (p.Alias != null && p.Alias.ToLower() == normalizedSku));

		if (product == null)
			return NotFound<ProductLookupDto>("Product not found for the given SKU/Alias");

		// Get current stock quantity
		var quantity = await _context.ProductQuantities
			.AsNoTracking()
			.FirstOrDefaultAsync(pq => pq.ProductId == product.Id);

		// Get allotted locations
		var allottedLocation = await _context.ProductAllottedLocations
			.AsNoTracking()
			.FirstOrDefaultAsync(al => al.ProductId == product.Id);

		var locations = new List<LocationStockDto>();
		if (allottedLocation != null && allottedLocation.LocationJson != null)
		{
			locations = allottedLocation.LocationJson
				.Select(kvp => new LocationStockDto { LocationCode = kvp.Key, Quantity = kvp.Value })
				.Where(l => l.Quantity > 0)
				.OrderBy(l => l.LocationCode)
				.ToList();
		}

		var result = new ProductLookupDto
		{
			Sku = product.Sku ?? string.Empty,
			Product = product,
			CurrentStock = quantity?.CurrentQuantity ?? 0,
			Locations = locations
		};

		return Success(result);
	}

	private bool ProductExists(int id) => _context.Products.Any(e => e.Id == id);
}
