using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using ClosedXML.Excel;
using System.Globalization;
using System.Security.Claims;
using PlusgrowWms.Api.Data;
using PlusgrowWms.Api.DTOs;
using PlusgrowWms.Api.Helpers;
using PlusgrowWms.Api.Hubs;
using PlusgrowWms.Api.Models;
using PlusgrowWms.Api.Services;

namespace PlusgrowWms.Api.Controllers;

public class OutwardOrdersController : BaseController
{
    private readonly PlusgrowDbContext _context;
    private readonly IHubContext<NotificationHub> _notificationHub;
    private readonly IAuditLogService _auditLogService;

    public OutwardOrdersController(PlusgrowDbContext context, IHubContext<NotificationHub> notificationHub, IAuditLogService auditLogService)
    {
        _context = context;
        _notificationHub = notificationHub;
        _auditLogService = auditLogService;
    }

    [HttpGet("sales-orders")]
    public async Task<ActionResult<ApiResponse<List<SalesOrderDto>>>> GetSalesOrders([FromQuery] SalesOrderFilterDto filter)
    {
        var page = Math.Max(filter.Page, 1);
        var pageSize = Math.Clamp(filter.PageSize, 1, 500);
        var query = _context.SalesOrders
            .Include(x => x.Items)
                .ThenInclude(x => x.Product)
            .AsNoTracking()
            .Where(x => x.IsReadyForProcessing)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var search = filter.Search.Trim().ToLower();
            query = query.Where(x =>
                x.OrderNumber.ToLower().Contains(search) ||
                (x.ReferenceNumber != null && x.ReferenceNumber.ToLower().Contains(search)) ||
                x.CustomerName.ToLower().Contains(search) ||
                x.Status.ToLower().Contains(search) ||
                (x.Notes != null && x.Notes.ToLower().Contains(search)) ||
                x.Items.Any(item =>
                    (item.Product != null && item.Product.Name.ToLower().Contains(search)) ||
                    (item.Product != null && item.Product.Sku != null && item.Product.Sku.ToLower().Contains(search)) ||
                    (item.Product != null && item.Product.Alias != null && item.Product.Alias.ToLower().Contains(search))));
        }

        if (!string.IsNullOrWhiteSpace(filter.Status) && !string.Equals(filter.Status, "all", StringComparison.OrdinalIgnoreCase))
        {
            var statuses = filter.Status.Split(',', StringSplitOptions.RemoveEmptyEntries)
                                        .Select(s => s.Trim().ToLowerInvariant())
                                        .ToList();
            query = query.Where(x => statuses.Contains(x.Status.ToLower()));
        }

        var total = await query.CountAsync();
        var rows = await query
            .OrderByDescending(x => x.OrderDate)
            .ThenByDescending(x => x.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Success(rows.Select(MapSalesOrder).ToList(), page, pageSize, total);
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<OutwardOrderDto>>>> GetOrders([FromQuery] OutwardOrderFilterDto filter)
    {
        var page = Math.Max(filter.Page, 1);
        var pageSize = Math.Clamp(filter.PageSize, 1, 1000);
        var query = _context.OutwardOrders
            .Include(x => x.SalesOrder)
            .Include(x => x.Product)
            .AsNoTracking()
            .Where(x => x.SalesOrder == null || x.SalesOrder.IsReadyForProcessing)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var search = filter.Search.Trim().ToLower();
            query = query.Where(x =>
                (x.SalesOrder != null && x.SalesOrder.OrderNumber.ToLower().Contains(search)) ||
                (x.SalesOrder != null && x.SalesOrder.ReferenceNumber != null && x.SalesOrder.ReferenceNumber.ToLower().Contains(search)) ||
                (x.SalesOrder != null && x.SalesOrder.CustomerName.ToLower().Contains(search)) ||
                (x.SalesOrder != null && x.SalesOrder.Notes != null && x.SalesOrder.Notes.ToLower().Contains(search)) ||
                x.Status.ToLower().Contains(search) ||
                (x.Notes != null && x.Notes.ToLower().Contains(search)) ||
                (x.Product != null && x.Product.Name.ToLower().Contains(search)) ||
                (x.Product != null && x.Product.Sku != null && x.Product.Sku.ToLower().Contains(search)) ||
                (x.Product != null && x.Product.Alias != null && x.Product.Alias.ToLower().Contains(search)));
        }

        if (!string.IsNullOrWhiteSpace(filter.Status) && !string.Equals(filter.Status, "all", StringComparison.OrdinalIgnoreCase))
        {
            var statuses = filter.Status.Split(',', StringSplitOptions.RemoveEmptyEntries)
                                        .Select(s => s.Trim().ToLowerInvariant())
                                        .ToList();
            query = query.Where(x => statuses.Contains(x.Status.ToLower()));
        }

        if (DateTime.TryParse(filter.FromDate, out var fromDate) && DateTime.TryParse(filter.ToDate, out var toDate))
        {
            query = query.Where(x => 
                (x.CreatedAt.Date >= fromDate.Date && x.CreatedAt.Date <= toDate.Date) ||
                (x.PickedAt != null && x.PickedAt.Value.Date >= fromDate.Date && x.PickedAt.Value.Date <= toDate.Date) ||
                (x.PackedAt != null && x.PackedAt.Value.Date >= fromDate.Date && x.PackedAt.Value.Date <= toDate.Date) ||
                (x.DispatchedAt != null && x.DispatchedAt.Value.Date >= fromDate.Date && x.DispatchedAt.Value.Date <= toDate.Date));
        }

        var total = await query.CountAsync();
        var rows = await query
            .OrderByDescending(x => x.SalesOrder != null ? x.SalesOrder.OrderDate : x.CreatedAt)
            .ThenByDescending(x => x.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Success(rows.Select(MapOrder).ToList(), page, pageSize, total);
    }

    [HttpGet("sales-orders/unprocessed")]
    public async Task<ActionResult<ApiResponse<List<SalesOrderDto>>>> GetUnprocessedSalesOrders([FromQuery] SalesOrderFilterDto filter)
    {
        var page = Math.Max(filter.Page, 1);
        var pageSize = Math.Clamp(filter.PageSize, 1, 500);
        var query = _context.SalesOrders
            .Include(x => x.Items)
                .ThenInclude(x => x.Product)
            .AsNoTracking()
            .Where(x => !x.IsReadyForProcessing)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var search = filter.Search.Trim().ToLower();
            query = query.Where(x =>
                x.OrderNumber.ToLower().Contains(search) ||
                x.CustomerName.ToLower().Contains(search) ||
                x.Status.ToLower().Contains(search) ||
                (x.Notes != null && x.Notes.ToLower().Contains(search)));
        }

        if (DateTime.TryParse(filter.FromDate, out var fromDate))
        {
            query = query.Where(x => x.OrderDate.Date >= fromDate.Date);
        }
        if (DateTime.TryParse(filter.ToDate, out var toDate))
        {
            query = query.Where(x => x.OrderDate.Date <= toDate.Date);
        }

        var total = await query.CountAsync();
        var rows = await query
            .OrderByDescending(x => x.OrderDate)
            .ThenByDescending(x => x.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Success(rows.Select(MapSalesOrder).ToList(), page, pageSize, total);
    }

    [HttpPost("sales-orders/{id}/process")]
    public async Task<ActionResult<ApiResponse<SalesOrderDto>>> ProcessSalesOrder(long id)
    {
        var salesOrder = await _context.SalesOrders
            .Include(x => x.Items)
                .ThenInclude(x => x.Product)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (salesOrder == null)
            return NotFound<SalesOrderDto>("Sales order not found");

        if (salesOrder.IsReadyForProcessing)
            return BadRequest<SalesOrderDto>("Sales order is already processed");

        salesOrder.IsReadyForProcessing = true;
        salesOrder.UpdatedAt = DateTime.Now;

        await _context.SaveChangesAsync();

        return Success(MapSalesOrder(salesOrder), "Sales order processed successfully");
    }

    [HttpDelete("sales-orders/{id}")]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteSalesOrder(long id)
    {
        var salesOrder = await _context.SalesOrders
            .Include(x => x.Items)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (salesOrder == null)
            return NotFound<bool>("Sales order not found");

        // Fetch associated outward orders and remove them explicitly
        var outwardOrders = await _context.OutwardOrders.Where(x => x.SalesOrderId == id).ToListAsync();
        if (outwardOrders.Any())
        {
            _context.OutwardOrders.RemoveRange(outwardOrders);
        }

        if (salesOrder.Items != null && salesOrder.Items.Any())
        {
            _context.RemoveRange(salesOrder.Items);
        }
        
        _context.SalesOrders.Remove(salesOrder);
        await _context.SaveChangesAsync();

        return Success(true, "Sales order deleted successfully");
    }


    [HttpGet("quick-sale-products")]
    public async Task<ActionResult<ApiResponse<List<QuickSaleProductDto>>>> GetQuickSaleProducts([FromQuery] int days = 30, [FromQuery] int limit = 20)
    {
        var safeDays = Math.Clamp(days, 1, 3650);
        var safeLimit = Math.Clamp(limit, 1, 100);
        var fromDate = DateTime.SpecifyKind(DateTime.Now.Date.AddDays(-(safeDays - 1)), DateTimeKind.Unspecified);

        var rows = await _context.OutwardOrders
            .Include(x => x.Product)
            .Include(x => x.SalesOrder)
            .AsNoTracking()
            .Where(x =>
                x.SalesOrder != null &&
                x.SalesOrder.OrderDate >= fromDate &&
                x.Status != "Canceled" &&
                x.SalesOrder.Status != "Canceled")
            .GroupBy(x => new
            {
                x.ProductId,
                SkuCode = x.Product != null ? x.Product.Sku : null,
                ProductName = x.Product != null ? x.Product.Name : null,
                Alias = x.Product != null ? x.Product.Alias : null,
            })
            .Select(g => new
            {
                g.Key.ProductId,
                g.Key.SkuCode,
                g.Key.ProductName,
                g.Key.Alias,
                TotalQuantity = g.Select(x => x.SalesOrderId).Distinct().Count(),
                OrderCount = g.Select(x => x.SalesOrderId).Distinct().Count(),
                CustomerCount = g.Select(x => x.SalesOrder!.CustomerName).Distinct().Count(),
                LastSaleAt = g.Max(x => (DateTime?)x.SalesOrder!.OrderDate),
            })
            .OrderByDescending(x => x.OrderCount)
            .ThenByDescending(x => x.CustomerCount)
            .ThenByDescending(x => x.LastSaleAt)
            .ThenBy(x => x.ProductName)
            .Take(safeLimit)
            .ToListAsync();

        var productIds = rows.Select(x => x.ProductId).ToList();
        var stockByProduct = await _context.ProductQuantities
            .AsNoTracking()
            .Where(x => productIds.Contains(x.ProductId))
            .ToDictionaryAsync(x => x.ProductId, x => x.CurrentQuantity);

        var result = rows.Select(row => new QuickSaleProductDto
        {
            ProductId = row.ProductId,
            SkuCode = row.SkuCode ?? string.Empty,
            ProductName = row.ProductName ?? string.Empty,
            Alias = row.Alias,
            TotalQuantity = row.TotalQuantity,
            OrderCount = row.OrderCount,
            CustomerCount = row.CustomerCount,
            CurrentQuantity = stockByProduct.GetValueOrDefault(row.ProductId),
            LastSaleAt = row.LastSaleAt,
        }).ToList();

        return Success(result);
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<OutwardOrderDto>>> CreateOrder([FromBody] CreateOutwardOrderDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.CustomerName))
            return BadRequest<OutwardOrderDto>("Customer name is required");

        var requestedItems = BuildRequestedItems(dto);
        if (requestedItems.Count == 0)
            return BadRequest<OutwardOrderDto>("At least one product item is required");

        if (requestedItems.Any(item => item.ProductId <= 0))
            return BadRequest<OutwardOrderDto>("Product is required");

        if (requestedItems.Any(item => item.Quantity <= 0))
            return BadRequest<OutwardOrderDto>("Quantity must be greater than zero");

        var productIds = requestedItems
            .Select(item => item.ProductId)
            .Distinct()
            .ToList();
        var products = await _context.Products
            .Where(x => productIds.Contains(x.Id))
            .ToDictionaryAsync(x => x.Id);
        var missingProductId = productIds.FirstOrDefault(productId => !products.ContainsKey(productId));
        if (missingProductId > 0)
            return BadRequest<OutwardOrderDto>($"Selected product {missingProductId} does not exist");

        // Validate stock availability for each product
        var stockQtyMap = await _context.ProductQuantities
            .AsNoTracking()
            .Where(q => productIds.Contains(q.ProductId))
            .ToDictionaryAsync(q => q.ProductId, q => q.CurrentQuantity);

        foreach (var item in requestedItems)
        {
            var availableStock = stockQtyMap.GetValueOrDefault(item.ProductId, 0);
            var product = products[item.ProductId];
            var productLabel = !string.IsNullOrWhiteSpace(product.Sku)
                ? $"{product.Sku} - {product.Name}"
                : product.Name;

            if (item.Quantity > availableStock)
                return BadRequest<OutwardOrderDto>(
                    $"Insufficient stock for '{productLabel}'. Available: {availableStock}, Requested: {item.Quantity}.");
        }

        var orderNumber = await GenerateOrderNumberAsync();
        var now = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified);
        var normalizedOrderDate = DateTime.SpecifyKind(dto.OrderDate.Date, DateTimeKind.Unspecified);
        var normalizedCustomerName = dto.CustomerName.Trim();
        var normalizedNotes = string.IsNullOrWhiteSpace(dto.Notes) ? null : dto.Notes.Trim();
        var normalizedReferenceNumber = string.IsNullOrWhiteSpace(dto.ReferenceNumber) ? null : dto.ReferenceNumber.Trim();

        var salesOrder = new SalesOrder
        {
            OrderNumber = orderNumber,
            OrderDate = normalizedOrderDate,
            CustomerName = normalizedCustomerName,
            ReferenceNumber = normalizedReferenceNumber,
            Status = "Open",
            Notes = normalizedNotes,
            CreatedAt = now,
            UpdatedAt = now,
        };

        var orders = requestedItems.Select(item => new OutwardOrder
        {
            SalesOrder = salesOrder,
            ProductId = item.ProductId,
            Quantity = item.Quantity,
            Mrp = item.Mrp ?? products[item.ProductId].Mrp,
            PickedQuantity = 0,
            Status = "Open",
            Notes = normalizedNotes,
            CreatedAt = now,
            UpdatedAt = now,
        }).ToList();

        _context.SalesOrders.Add(salesOrder);
        _context.OutwardOrders.AddRange(orders);
        await _context.SaveChangesAsync();

        var createdOrders = await _context.OutwardOrders
            .Include(x => x.SalesOrder)
            .Include(x => x.Product)
            .Where(x => x.SalesOrderId == salesOrder.Id)
            .OrderBy(x => x.Id)
            .ToListAsync();
        var created = createdOrders.First();
        var response = MapOrder(created);
        var totalQuantity = createdOrders.Sum(order => order.Quantity);

        await SendNotificationAsync(new RealtimeNotificationDto
        {
            Type = "outward.created",
            Title = "Outward order created",
            Message = $"{response.OrderNumber} created for {response.CustomerName} with {createdOrders.Count} item(s).",
            Severity = "info",
            Data = new Dictionary<string, object?>
            {
                ["orderId"] = response.Id,
                ["orderNumber"] = response.OrderNumber,
                ["customerName"] = response.CustomerName,
                ["skuCode"] = response.SkuCode,
                ["quantity"] = totalQuantity,
                ["itemCount"] = createdOrders.Count,
            },
        });

        return Success(response, createdOrders.Count > 1
            ? $"Outward order created successfully with {createdOrders.Count} items"
            : "Outward order created successfully");
    }

    [HttpPost("sales-orders/upload")]
    public async Task<ActionResult<ApiResponse<ImportResultDto>>> UploadSalesOrders(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest<ImportResultDto>("Please upload a valid Excel file");

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (extension != ".xlsx" && extension != ".xls")
            return BadRequest<ImportResultDto>("Only Excel files (.xlsx, .xls) are allowed");

        var result = new ImportResultDto();

        try
        {
            using var stream = new MemoryStream();
            await file.CopyToAsync(stream);
            stream.Position = 0;

            using var workbook = new XLWorkbook(stream);
            var worksheet = workbook.Worksheets.First();
            var headerRow = worksheet.FirstRowUsed();
            if (headerRow == null)
                return BadRequest<ImportResultDto>("The uploaded file does not contain a header row");

            var headerMap = BuildUploadHeaderMap(headerRow);
            var requiredHeaders = new[]
            {
                "invoiceno",
                "invdate",
                "partyname",
                "partno",
                "mrp",
                "itemname",
                "billedqty",
            };

            var missingHeaders = requiredHeaders.Where(header => !headerMap.ContainsKey(header)).ToList();
            if (missingHeaders.Count > 0)
                return BadRequest<ImportResultDto>($"Missing required columns: {string.Join(", ", missingHeaders)}");

            var uploadRows = new List<SalesOrderUploadRow>();
            foreach (var row in worksheet.RowsUsed().Skip(headerRow.RowNumber()))
            {
                try
                {
                    var referenceNumber = row.Cell(headerMap["invoiceno"]).GetString().Trim();
                    var orderDateCell = row.Cell(headerMap["invdate"]);
                    var customerName = row.Cell(headerMap["partyname"]).GetString().Trim();
                    var partNo = row.Cell(headerMap["partno"]).GetString().Trim();
                    var itemName = row.Cell(headerMap["itemname"]).GetString().Trim();
                    var quantity = ReadIntCell(row.Cell(headerMap["billedqty"]));
                    var mrp = ReadDecimalCell(row.Cell(headerMap["mrp"]));

                    if (string.IsNullOrWhiteSpace(referenceNumber) &&
                        string.IsNullOrWhiteSpace(customerName) &&
                        string.IsNullOrWhiteSpace(partNo) &&
                        string.IsNullOrWhiteSpace(itemName))
                    {
                        continue;
                    }

                    if (string.IsNullOrWhiteSpace(referenceNumber))
                    {
                        result.Errors.Add($"Row {row.RowNumber()}: Invoice No. is required.");
                        continue;
                    }

                    if (string.IsNullOrWhiteSpace(customerName))
                    {
                        result.Errors.Add($"Row {row.RowNumber()}: Party Name is required.");
                        continue;
                    }

                    var orderDate = TryParseUploadDate(orderDateCell);
                    if (orderDate == null)
                    {
                        result.Errors.Add($"Row {row.RowNumber()}: Inv. Date is invalid.");
                        continue;
                    }

                    if (quantity <= 0)
                    {
                        result.Errors.Add($"Row {row.RowNumber()}: Billed Qty. must be greater than zero.");
                        continue;
                    }

                    var product = await FindUploadProductAsync(partNo, itemName);
                    if (product == null)
                    {
                        result.Errors.Add($"Row {row.RowNumber()}: Product not found in Product Master for Part No. '{partNo}' or Item Name '{itemName}'.");
                        continue;
                    }

                    uploadRows.Add(new SalesOrderUploadRow(
                        row.RowNumber(),
                        referenceNumber,
                        orderDate.Value,
                        customerName,
                        product,
                        quantity,
                        mrp > 0 ? mrp : product.Mrp));
                }
                catch (Exception ex)
                {
                    result.Errors.Add($"Row {row.RowNumber()}: {ex.Message}");
                }
            }

            var groupedRows = uploadRows
                .GroupBy(row => row.ReferenceNumber.Trim(), StringComparer.OrdinalIgnoreCase)
                .ToList();

            var incomingReferences = groupedRows.Select(group => group.Key).ToList();
            var existingReferences = await _context.SalesOrders
                .AsNoTracking()
                .Where(x => x.ReferenceNumber != null && incomingReferences.Contains(x.ReferenceNumber))
                .Select(x => new { x.ReferenceNumber, x.Status })
                .ToListAsync();

            var activeReferenceSet = new HashSet<string>(
                existingReferences
                    .Where(x => !string.Equals(x.Status, "Canceled", StringComparison.OrdinalIgnoreCase))
                    .Select(x => x.ReferenceNumber!)
                    .Where(x => !string.IsNullOrWhiteSpace(x)),
                StringComparer.OrdinalIgnoreCase);

            var now = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified);
            var orderNumberPrefix = $"SO-{DateTime.Now:yyMMdd}";
            var nextOrderSequence = await GetNextOrderSequenceAsync(orderNumberPrefix);

            foreach (var group in groupedRows)
            {
                if (activeReferenceSet.Contains(group.Key))
                {
                    result.Errors.Add($"Invoice {group.Key}: Sales order already exists for this reference.");
                    continue;
                }

                var rows = group.ToList();
                var firstRow = rows.First();
                var groupedItems = rows
                    .GroupBy(row => new { row.Product.Id, Mrp = decimal.Round(row.Mrp ?? 0m, 2) })
                    .Select(itemGroup => new
                    {
                        Product = itemGroup.First().Product,
                        Quantity = itemGroup.Sum(row => row.Quantity),
                        Mrp = itemGroup.First().Mrp,
                    })
                    .ToList();

                var productIds = groupedItems.Select(item => item.Product.Id).ToList();
                var stockQtyMap = await _context.ProductQuantities
                    .AsNoTracking()
                    .Where(q => productIds.Contains(q.ProductId))
                    .ToDictionaryAsync(q => q.ProductId, q => q.CurrentQuantity);

                var stockErrors = groupedItems
                    .Where(item => item.Quantity > stockQtyMap.GetValueOrDefault(item.Product.Id, 0))
                    .Select(item =>
                    {
                        var available = stockQtyMap.GetValueOrDefault(item.Product.Id, 0);
                        var label = !string.IsNullOrWhiteSpace(item.Product.Sku)
                            ? $"{item.Product.Sku} - {item.Product.Name}"
                            : item.Product.Name;
                        return $"Invoice {group.Key}: Insufficient stock for '{label}'. Available: {available}, Requested: {item.Quantity}.";
                    })
                    .ToList();

                if (stockErrors.Count > 0)
                {
                    result.Errors.AddRange(stockErrors);
                    continue;
                }

                var salesOrder = new SalesOrder
                {
                    OrderNumber = $"{orderNumberPrefix}-{nextOrderSequence++:000}",
                    OrderDate = firstRow.OrderDate,
                    CustomerName = firstRow.CustomerName.Trim(),
                    Status = "Open",
                    Notes = "Imported from Excel",
                    ReferenceNumber = group.Key,
                    CreatedAt = now,
                    UpdatedAt = now,
                    Items = groupedItems.Select(item => new OutwardOrder
                    {
                        ProductId = item.Product.Id,
                        Quantity = item.Quantity,
                        Mrp = item.Mrp,
                        PickedQuantity = 0,
                        Status = "Open",
                        Notes = "Imported from Excel",
                        CreatedAt = now,
                        UpdatedAt = now,
                    }).ToList(),
                };

                _context.SalesOrders.Add(salesOrder);
                result.ImportedCount += rows.Count;
                activeReferenceSet.Add(group.Key);
            }

            await _context.SaveChangesAsync();
            result.Success = true;

            if (result.ImportedCount > 0)
            {
                await SendNotificationAsync(new RealtimeNotificationDto
                {
                    Type = "sales_order.imported",
                    Title = "Sales orders imported",
                    Message = result.Errors.Count > 0
                        ? $"{result.ImportedCount} sales order rows imported, {result.Errors.Count} skipped."
                        : $"{result.ImportedCount} sales order rows were imported.",
                    Severity = "success",
                    Data = new Dictionary<string, object?>
                    {
                        ["importedCount"] = result.ImportedCount,
                        ["errorCount"] = result.Errors.Count,
                    },
                });
            }

            var message = result.ImportedCount > 0
                ? $"Imported {result.ImportedCount} sales order rows successfully"
                : "No rows were imported. Check skipped rows for details.";

            return Success(result, message);
        }
        catch (Exception ex)
        {
            return Error<ImportResultDto>($"Error processing file: {ex.Message}");
        }
    }

    [HttpPost("sales-orders/{id}/short-close")]
    public async Task<ActionResult<ApiResponse<SalesOrderDto>>> ShortCloseSalesOrder(int id, [FromBody] ShortCloseSalesOrderDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Remark))
            return BadRequest<SalesOrderDto>("Remark is required for short closing");

        var salesOrder = await _context.SalesOrders
            .Include(x => x.Items)
                .ThenInclude(x => x.Product)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (salesOrder == null)
            return NotFound<SalesOrderDto>("Sales order not found");

        if (salesOrder.Status == "Dispatched" || salesOrder.Status == "Canceled")
            return BadRequest<SalesOrderDto>($"Order is already {salesOrder.Status.ToLower()}");

        var now = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified);
        
        var remarkLine = $"[Short Closed: {dto.Remark.Trim()}]";
        salesOrder.CancelRemark = string.IsNullOrWhiteSpace(salesOrder.CancelRemark) 
            ? remarkLine 
            : $"{salesOrder.CancelRemark}\n{remarkLine}";

        foreach (var item in salesOrder.Items)
        {
            if (item.Status == "Dispatched" || item.Status == "Canceled")
                continue;

            if (item.PickedQuantity < item.Quantity)
            {
                if (item.PickedQuantity == 0)
                {
                    item.Status = "Canceled";
                    item.Notes = string.IsNullOrWhiteSpace(item.Notes) ? remarkLine : $"{item.Notes}\n{remarkLine}";
                }
                else
                {
                    var originalQty = item.Quantity;
                    item.Quantity = item.PickedQuantity;
                    item.Status = "Picked";
                    
                    var itemRemark = $"[Original Qty: {originalQty}. Short Closed: {dto.Remark.Trim()}]";
                    item.Notes = string.IsNullOrWhiteSpace(item.Notes) ? itemRemark : $"{item.Notes}\n{itemRemark}";
                }
                item.UpdatedAt = now;
            }
        }

        salesOrder.UpdatedAt = now;
        await _context.SaveChangesAsync();
        
        await UpdateSalesOrderStatusAsync(salesOrder.Id);
        await _context.SaveChangesAsync();

        var updatedOrder = await _context.SalesOrders
            .Include(x => x.Items)
                .ThenInclude(x => x.Product)
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id);

        var response = MapSalesOrder(updatedOrder!);

        await SendNotificationAsync(new RealtimeNotificationDto
        {
            Type = "sales_order.short_closed",
            Title = "Sales order short-closed",
            Message = $"{response.OrderNumber} was short-closed. Remark: {dto.Remark.Trim()}",
            Severity = "warning",
            Data = new Dictionary<string, object?>
            {
                ["orderId"] = response.Id,
                ["orderNumber"] = response.OrderNumber,
                ["remark"] = dto.Remark.Trim(),
            },
        });

        return Success(response, "Sales order short-closed successfully and ready for packing");
    }

    [HttpPost("{id}/pick")]
    public async Task<ActionResult<ApiResponse<OutwardOrderDto>>> PickOrder(int id, [FromBody] UpdateOutwardPickingDto dto)
    {
        var order = await _context.OutwardOrders.Include(x => x.Product).Include(x => x.SalesOrder).FirstOrDefaultAsync(x => x.Id == id);
        if (order == null)
            return NotFound<OutwardOrderDto>("Outward order not found");

        if (order.Status == "Dispatched")
            return BadRequest<OutwardOrderDto>("Dispatched orders cannot be picked");

        if (order.Status == "Canceled" || order.SalesOrder?.Status == "Canceled")
            return BadRequest<OutwardOrderDto>("Canceled orders cannot be picked");

        var requestedPickQty = dto.Quantity <= 0 ? 1 : dto.Quantity;
        var pickQty = Math.Min(requestedPickQty, Math.Max(order.Quantity - order.PickedQuantity, 0));
        var nextPicked = order.PickedQuantity + pickQty;
        if (nextPicked == order.PickedQuantity)
            return BadRequest<OutwardOrderDto>("Order is already fully picked");

        var expectedSku = order.Product?.Sku?.Trim();
        var expectedAlias = order.Product?.Alias?.Trim();
        if (!string.IsNullOrWhiteSpace(dto.SkuCode))
        {
            var scanned = dto.SkuCode.Trim();
            var matchesSku = !string.IsNullOrWhiteSpace(expectedSku) && string.Equals(expectedSku, scanned, StringComparison.OrdinalIgnoreCase);
            var matchesAlias = !string.IsNullOrWhiteSpace(expectedAlias) && string.Equals(expectedAlias, scanned, StringComparison.OrdinalIgnoreCase);
            if (!matchesSku && !matchesAlias)
            {
                return BadRequest<OutwardOrderDto>($"Scanned code {scanned} does not match product SKU ({expectedSku}) or Alias ({expectedAlias})");
            }
        }

        if (dto.Mrp.HasValue &&
            order.Mrp.HasValue &&
            decimal.Round(dto.Mrp.Value, 2) != decimal.Round(order.Mrp.Value, 2) &&
            !dto.MrpMismatchConfirmed)
        {
            return BadRequest<OutwardOrderDto>($"MRP mismatch. Sticker MRP Rs.{dto.Mrp.Value:N2} does not match sales order MRP Rs.{order.Mrp.Value:N2}");
        }

        if (string.IsNullOrWhiteSpace(dto.LocationCode))
            return BadRequest<OutwardOrderDto>("Location scan is required");

        var (resolvedLocationCode, resolvedBin) = await ResolveLocationCodeAsync(dto.LocationCode.Trim());
        if (string.IsNullOrWhiteSpace(resolvedLocationCode))
            return BadRequest<OutwardOrderDto>($"Scanned location {dto.LocationCode.Trim()} was not found");

        var effectiveMrp = dto.Mrp ?? order.Mrp;
        var (pickUserId, pickUserName) = ResolvePerformedBy();

        await using var transaction = await _context.Database.BeginTransactionAsync();
        await _context.LockProductAsync(order.ProductId);

        var reduceLocationResult = await ReduceAllocatedLocationAsync(
            order.ProductId,
            resolvedLocationCode,
            resolvedBin,
            pickQty,
            effectiveMrp,
            pickUserId,
            pickUserName,
            "outward",
            BuildSalesOrderMovementReference(order.SalesOrder));
        if (!reduceLocationResult.Success)
            return BadRequest<OutwardOrderDto>(reduceLocationResult.Message!);

        AddPickedLocation(order, reduceLocationResult.LocationCode!, pickQty);
        order.PickedQuantity = nextPicked;
        order.Status = order.PickedQuantity >= order.Quantity ? "Picked" : "Picking";
        order.UpdatedAt = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified);
        if (order.Status == "Picked" && order.PickedAt == null)
            order.PickedAt = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified);
        _context.Entry(order).Property(x => x.PickedLocationJson).IsModified = true;

        await _context.SaveChangesAsync();
        if (order.SalesOrderId > 0)
        {
            await UpdateSalesOrderStatusAsync(order.SalesOrderId);
            await _context.SaveChangesAsync();
        }
        await transaction.CommitAsync();

        var response = MapOrder(order);

        if (order.Status == "Picked")
        {
            await SendNotificationAsync(new RealtimeNotificationDto
            {
                Type = "outward.picked",
                Title = "Order picked",
                Message = $"{response.OrderNumber} is ready for packing.",
                Severity = "success",
                Data = new Dictionary<string, object?>
                {
                    ["orderId"] = response.Id,
                    ["orderNumber"] = response.OrderNumber,
                    ["customerName"] = response.CustomerName,
                    ["locationCode"] = resolvedLocationCode,
                },
            });
        }

        return Success(response, "Picking progress updated successfully");
    }

    [HttpPost("direct-pick")]
    public async Task<ActionResult<ApiResponse<OutwardOrderDto>>> DirectPick([FromBody] DirectOutwardPickDto dto)
    {
        if (dto.ProductId <= 0)
            return BadRequest<OutwardOrderDto>("Product is required");

        var pickQty = dto.Quantity <= 0 ? 1 : dto.Quantity;

        if (string.IsNullOrWhiteSpace(dto.LocationCode))
            return BadRequest<OutwardOrderDto>("Location scan is required");

        if (string.IsNullOrWhiteSpace(dto.Remark))
            return BadRequest<OutwardOrderDto>("Remark is required for direct outward picking");

        var product = await _context.Products.FirstOrDefaultAsync(x => x.Id == dto.ProductId);
        if (product == null)
            return BadRequest<OutwardOrderDto>("Selected product does not exist");

        var expectedSku = product.Sku?.Trim();
        var expectedAlias = product.Alias?.Trim();
        if (!string.IsNullOrWhiteSpace(dto.SkuCode))
        {
            var scanned = dto.SkuCode.Trim();
            var matchesSku = !string.IsNullOrWhiteSpace(expectedSku) && string.Equals(expectedSku, scanned, StringComparison.OrdinalIgnoreCase);
            var matchesAlias = !string.IsNullOrWhiteSpace(expectedAlias) && string.Equals(expectedAlias, scanned, StringComparison.OrdinalIgnoreCase);
            if (!matchesSku && !matchesAlias)
            {
                return BadRequest<OutwardOrderDto>($"Scanned code {scanned} does not match product SKU ({expectedSku}) or Alias ({expectedAlias})");
            }
        }

        var (resolvedLocationCode, resolvedBin) = await ResolveLocationCodeAsync(dto.LocationCode.Trim());
        if (string.IsNullOrWhiteSpace(resolvedLocationCode))
            return BadRequest<OutwardOrderDto>($"Scanned location {dto.LocationCode.Trim()} was not found");

        var effectiveMrp = dto.Mrp ?? product.Mrp;
        var (pickUserId, pickUserName) = ResolvePerformedBy();
        var orderNumber = await GenerateDirectOrderNumberAsync();

        await using var transaction = await _context.Database.BeginTransactionAsync();
        await _context.LockProductAsync(product.Id);

        var reduceLocationResult = await ReduceAllocatedLocationAsync(
            product.Id,
            resolvedLocationCode,
            resolvedBin,
            pickQty,
            effectiveMrp,
            pickUserId,
            pickUserName,
            "direct",
            $"Direct Outward: {orderNumber}; Remark: {dto.Remark.Trim()}");
        if (!reduceLocationResult.Success)
            return BadRequest<OutwardOrderDto>(reduceLocationResult.Message!);

        var now = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified);
        var salesOrder = new SalesOrder
        {
            OrderNumber = orderNumber,
            OrderDate = now.Date,
            CustomerName = string.IsNullOrWhiteSpace(dto.CustomerName) ? "Direct Outward" : dto.CustomerName.Trim(),
            Status = "Picked",
            Notes = $"Direct outward pick. Remark: {dto.Remark.Trim()}",
            CreatedAt = now,
            UpdatedAt = now,
        };

        var order = new OutwardOrder
        {
            SalesOrder = salesOrder,
            ProductId = product.Id,
            Product = product,
            Quantity = pickQty,
            Mrp = effectiveMrp,
            PickedQuantity = pickQty,
            PickedLocationJson = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase)
            {
                [reduceLocationResult.LocationCode!] = pickQty,
            },
            Status = "Picked",
            Notes = salesOrder.Notes,
            CreatedAt = now,
            UpdatedAt = now,
            PickedAt = now,
        };

        _context.SalesOrders.Add(salesOrder);
        _context.OutwardOrders.Add(order);
        await _context.SaveChangesAsync();
        await transaction.CommitAsync();

        var response = MapOrder(order);
        await SendNotificationAsync(new RealtimeNotificationDto
        {
            Type = "outward.direct-picked",
            Title = "Direct outward picked",
            Message = $"{response.OrderNumber} picked without sales order and is ready for packing.",
            Severity = "success",
            Data = new Dictionary<string, object?>
            {
                ["orderId"] = response.Id,
                ["orderNumber"] = response.OrderNumber,
                ["skuCode"] = response.SkuCode,
                ["quantity"] = response.Quantity,
                ["locationCode"] = resolvedLocationCode,
                ["remark"] = dto.Remark.Trim(),
            },
        });

        return Success(response, "Direct outward picked successfully and moved to packing");
    }

    [HttpPost("bulk-direct-pick")]
    public async Task<ActionResult<ApiResponse<List<OutwardOrderDto>>>> BulkDirectPick([FromBody] BulkDirectOutwardPickDto dto)
    {
        if (dto.Items == null || dto.Items.Count == 0)
            return BadRequest<List<OutwardOrderDto>>("At least one item is required");

        if (string.IsNullOrWhiteSpace(dto.Remark))
            return BadRequest<List<OutwardOrderDto>>("Remark is required for direct outward picking");

        var now = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified);
        var orderNumber = await GenerateDirectOrderNumberAsync();
        var salesOrder = new SalesOrder
        {
            OrderNumber = orderNumber,
            OrderDate = now.Date,
            CustomerName = string.IsNullOrWhiteSpace(dto.CustomerName) ? "Direct Outward" : dto.CustomerName.Trim(),
            Status = "Picked",
            Notes = $"Direct outward pick. Remark: {dto.Remark.Trim()}",
            CreatedAt = now,
            UpdatedAt = now,
        };

        var createdOrders = new List<OutwardOrder>();

        // Pre-fetch all products
        var productIds = dto.Items.Select(x => x.ProductId).Distinct().ToList();
        var products = await _context.Products.Where(p => productIds.Contains(p.Id)).ToDictionaryAsync(p => p.Id);

        var (bulkPickUserId, bulkPickUserName) = ResolvePerformedBy();

        await using var transaction = await _context.Database.BeginTransactionAsync();
        await _context.LockProductsAsync(productIds.Where(id => id > 0));

        foreach (var item in dto.Items)
        {
            if (item.ProductId <= 0)
                return BadRequest<List<OutwardOrderDto>>("Product is required for all items");

            var pickQty = item.Quantity <= 0 ? 1 : item.Quantity;

            if (string.IsNullOrWhiteSpace(item.LocationCode))
                return BadRequest<List<OutwardOrderDto>>("Location scan is required for all items");

            if (!products.TryGetValue(item.ProductId, out var product))
                return BadRequest<List<OutwardOrderDto>>($"Selected product ID {item.ProductId} does not exist");

            var expectedSku = product.Sku?.Trim();
            var expectedAlias = product.Alias?.Trim();
            if (!string.IsNullOrWhiteSpace(item.SkuCode))
            {
                var scanned = item.SkuCode.Trim();
                var matchesSku = !string.IsNullOrWhiteSpace(expectedSku) && string.Equals(expectedSku, scanned, StringComparison.OrdinalIgnoreCase);
                var matchesAlias = !string.IsNullOrWhiteSpace(expectedAlias) && string.Equals(expectedAlias, scanned, StringComparison.OrdinalIgnoreCase);
                if (!matchesSku && !matchesAlias)
                {
                    return BadRequest<List<OutwardOrderDto>>($"Scanned code {scanned} does not match product SKU ({expectedSku}) or Alias ({expectedAlias})");
                }
            }

            var (resolvedLocationCode, resolvedBin) = await ResolveLocationCodeAsync(item.LocationCode.Trim());
            if (string.IsNullOrWhiteSpace(resolvedLocationCode))
                return BadRequest<List<OutwardOrderDto>>($"Scanned location {item.LocationCode.Trim()} was not found");

            var effectiveMrp = item.Mrp ?? product.Mrp;
            var reduceLocationResult = await ReduceAllocatedLocationAsync(
                product.Id,
                resolvedLocationCode,
                resolvedBin,
                pickQty,
                effectiveMrp,
                bulkPickUserId,
                bulkPickUserName,
                "bulk-direct",
                $"Direct Outward: {orderNumber}; Remark: {dto.Remark.Trim()}");
            if (!reduceLocationResult.Success)
                return BadRequest<List<OutwardOrderDto>>(reduceLocationResult.Message!);

            var order = new OutwardOrder
            {
                SalesOrder = salesOrder,
                ProductId = product.Id,
                Product = product,
                Quantity = pickQty,
                Mrp = effectiveMrp,
                PickedQuantity = pickQty,
                PickedLocationJson = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase)
                {
                    [reduceLocationResult.LocationCode!] = pickQty,
                },
                Status = "Picked",
                Notes = salesOrder.Notes,
                CreatedAt = now,
                UpdatedAt = now,
                PickedAt = now,
            };
            createdOrders.Add(order);
        }

        _context.SalesOrders.Add(salesOrder);
        _context.OutwardOrders.AddRange(createdOrders);
        await _context.SaveChangesAsync();
        await transaction.CommitAsync();

        var responses = createdOrders.Select(row => MapOrder(row)).ToList();
        
        await SendNotificationAsync(new RealtimeNotificationDto
        {
            Type = "outward.bulk-direct-picked",
            Title = "Bulk direct outward picked",
            Message = $"{orderNumber} picked with {createdOrders.Count} items.",
            Severity = "success",
            Data = new Dictionary<string, object?>
            {
                ["orderNumber"] = orderNumber,
                ["itemCount"] = createdOrders.Count,
                ["remark"] = dto.Remark.Trim(),
            },
        });

        return Success(responses, $"Direct outward picked successfully with {createdOrders.Count} items");
    }

    // Consolidated picking: pick the combined quantity of a single product across multiple
    // selected (open/in-progress) sales orders from one location in a single action. The picked
    // quantity is distributed across the contributing order lines oldest-first. This is additive
    // and does not affect the existing per-item PickOrder or DirectPick flows.
    [HttpPost("consolidated-pick")]
    public async Task<ActionResult<ApiResponse<ConsolidatedPickResultDto>>> ConsolidatedPick([FromBody] ConsolidatedPickDto dto)
    {
        if (dto.ProductId <= 0)
            return BadRequest<ConsolidatedPickResultDto>("Product is required");

        if (dto.SalesOrderIds == null || dto.SalesOrderIds.Count == 0)
            return BadRequest<ConsolidatedPickResultDto>("Select at least one sales order");

        var requestedQty = dto.Quantity <= 0 ? 1 : dto.Quantity;

        if (string.IsNullOrWhiteSpace(dto.LocationCode))
            return BadRequest<ConsolidatedPickResultDto>("Location scan is required");

        var product = await _context.Products.FirstOrDefaultAsync(x => x.Id == dto.ProductId);
        if (product == null)
            return BadRequest<ConsolidatedPickResultDto>("Selected product does not exist");

        var expectedSku = product.Sku?.Trim();
        var expectedAlias = product.Alias?.Trim();
        if (!string.IsNullOrWhiteSpace(dto.SkuCode))
        {
            var scanned = dto.SkuCode.Trim();
            var matchesSku = !string.IsNullOrWhiteSpace(expectedSku) && string.Equals(expectedSku, scanned, StringComparison.OrdinalIgnoreCase);
            var matchesAlias = !string.IsNullOrWhiteSpace(expectedAlias) && string.Equals(expectedAlias, scanned, StringComparison.OrdinalIgnoreCase);
            if (!matchesSku && !matchesAlias)
                return BadRequest<ConsolidatedPickResultDto>($"Scanned code {scanned} does not match product SKU ({expectedSku}) or Alias ({expectedAlias})");
        }

        var (resolvedLocationCode, resolvedBin) = await ResolveLocationCodeAsync(dto.LocationCode.Trim());
        if (string.IsNullOrWhiteSpace(resolvedLocationCode))
            return BadRequest<ConsolidatedPickResultDto>($"Scanned location {dto.LocationCode.Trim()} was not found");

        var salesOrderIds = dto.SalesOrderIds.Distinct().ToList();
        var groupMrp = dto.Mrp ?? product.Mrp;
        var (pickUserId, pickUserName) = ResolvePerformedBy();
        var now = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified);

        await using var transaction = await _context.Database.BeginTransactionAsync();
        await _context.LockProductAsync(product.Id);

        // Candidate lines: matching product, in the selected sales orders, still pending and not
        // canceled/dispatched. Allocation order is oldest order first so earlier orders complete first.
        var candidateLines = await _context.OutwardOrders
            .Include(x => x.SalesOrder)
            .Include(x => x.Product)
            .Where(x =>
                salesOrderIds.Contains(x.SalesOrderId) &&
                x.ProductId == product.Id &&
                x.Status != "Dispatched" &&
                x.Status != "Canceled" &&
                x.PickedQuantity < x.Quantity &&
                (x.SalesOrder == null || x.SalesOrder.Status != "Canceled"))
            .ToListAsync();

        // Match the exact (raw) MRP of the selected product group so allocation lines up precisely
        // with the grouping shown in the UI. A null-MRP group only fills null-MRP lines, and a
        // priced group only fills lines with the same MRP. This preserves price integrity.
        var orderedLines = candidateLines
            .Where(line =>
            {
                if (!dto.Mrp.HasValue)
                    return !line.Mrp.HasValue;
                if (!line.Mrp.HasValue)
                    return false;
                return decimal.Round(line.Mrp.Value, 2) == decimal.Round(dto.Mrp.Value, 2);
            })
            .OrderBy(line => line.SalesOrder != null ? line.SalesOrder.OrderDate : line.CreatedAt)
            .ThenBy(line => line.SalesOrder != null ? line.SalesOrder.OrderNumber : string.Empty)
            .ThenBy(line => line.Id)
            .ToList();

        if (orderedLines.Count == 0)
            return BadRequest<ConsolidatedPickResultDto>("No pending quantity for this product in the selected sales orders");

        var totalPending = orderedLines.Sum(line => Math.Max(line.Quantity - line.PickedQuantity, 0));
        if (totalPending <= 0)
            return BadRequest<ConsolidatedPickResultDto>("No pending quantity for this product in the selected sales orders");

        var pickQty = Math.Min(requestedQty, totalPending);
        var consolidatedReferences = string.Join(
            ", ",
            orderedLines
                .Select(line => line.SalesOrder?.OrderNumber)
                .Where(orderNumber => !string.IsNullOrWhiteSpace(orderNumber))
                .Distinct());

        var reduceLocationResult = await ReduceAllocatedLocationAsync(
            product.Id,
            resolvedLocationCode,
            resolvedBin,
            pickQty,
            groupMrp,
            pickUserId,
            pickUserName,
            "consolidated",
            $"Sales Orders: {consolidatedReferences}");
        if (!reduceLocationResult.Success)
            return BadRequest<ConsolidatedPickResultDto>(reduceLocationResult.Message!);

        var allocations = new List<ConsolidatedPickAllocationDto>();
        var affectedSalesOrderIds = new HashSet<int>();
        var remaining = pickQty;

        foreach (var line in orderedLines)
        {
            if (remaining <= 0)
                break;

            var linePending = line.Quantity - line.PickedQuantity;
            if (linePending <= 0)
                continue;

            var take = Math.Min(remaining, linePending);
            line.PickedQuantity += take;
            AddPickedLocation(line, reduceLocationResult.LocationCode!, take);
            line.Status = line.PickedQuantity >= line.Quantity ? "Picked" : "Picking";
            line.UpdatedAt = now;
            if (line.Status == "Picked" && line.PickedAt == null)
                line.PickedAt = now;
            _context.Entry(line).Property(x => x.PickedLocationJson).IsModified = true;

            remaining -= take;
            affectedSalesOrderIds.Add(line.SalesOrderId);

            allocations.Add(new ConsolidatedPickAllocationDto
            {
                OrderItemId = line.Id,
                SalesOrderId = line.SalesOrderId,
                OrderNumber = line.SalesOrder?.OrderNumber ?? string.Empty,
                CustomerName = line.SalesOrder?.CustomerName ?? string.Empty,
                AllocatedQuantity = take,
                PickedQuantity = line.PickedQuantity,
                Quantity = line.Quantity,
                PendingQuantity = Math.Max(line.Quantity - line.PickedQuantity, 0),
                Status = line.Status,
            });
        }

        await _context.SaveChangesAsync();

        foreach (var salesOrderId in affectedSalesOrderIds)
        {
            await UpdateSalesOrderStatusAsync(salesOrderId);
        }
        await _context.SaveChangesAsync();
        await transaction.CommitAsync();

        var updatedItems = orderedLines
            .Where(line => affectedSalesOrderIds.Contains(line.SalesOrderId) && allocations.Any(a => a.OrderItemId == line.Id))
            .Select(MapOrder)
            .ToList();

        var result = new ConsolidatedPickResultDto
        {
            ProductId = product.Id,
            SkuCode = product.Sku ?? string.Empty,
            ProductName = product.Name,
            LocationCode = reduceLocationResult.LocationCode!,
            RequestedQuantity = requestedQty,
            PickedQuantity = pickQty,
            Allocations = allocations,
            UpdatedItems = updatedItems,
        };

        await SendNotificationAsync(new RealtimeNotificationDto
        {
            Type = "outward.consolidated-picked",
            Title = "Consolidated pick completed",
            Message = $"Picked {pickQty} x {product.Sku ?? product.Name} from {reduceLocationResult.LocationCode} across {affectedSalesOrderIds.Count} order(s).",
            Severity = "success",
            Data = new Dictionary<string, object?>
            {
                ["productId"] = product.Id,
                ["skuCode"] = product.Sku,
                ["quantity"] = pickQty,
                ["locationCode"] = reduceLocationResult.LocationCode,
                ["orderCount"] = affectedSalesOrderIds.Count,
            },
        });

        return Success(result, $"Picked {pickQty} unit(s) across {affectedSalesOrderIds.Count} sales order(s)");
    }

    [HttpPost("consolidated-short-pick")]
    public async Task<ActionResult<ApiResponse<ConsolidatedShortPickResultDto>>> ConsolidatedShortPick([FromBody] ConsolidatedShortPickDto dto)
    {
        if (dto.SalesOrderIds == null || dto.SalesOrderIds.Count == 0)
            return BadRequest<ConsolidatedShortPickResultDto>("No sales orders provided");
        if (dto.ProductId <= 0)
            return BadRequest<ConsolidatedShortPickResultDto>("Invalid product ID");
        if (string.IsNullOrWhiteSpace(dto.Remark))
            return BadRequest<ConsolidatedShortPickResultDto>("Remark is required for short pick");

        await using var transaction = await _context.Database.BeginTransactionAsync();
        var now = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified);

        var orders = await _context.OutwardOrders
            .Include(x => x.Product)
            .Include(x => x.SalesOrder)
            .Where(x => x.ProductId == dto.ProductId && dto.SalesOrderIds.Contains(x.SalesOrderId))
            .ToListAsync();

        var remarkLine = $"[Short Picked: {dto.Remark.Trim()}]";
        var updatedItems = new List<OutwardOrder>();

        foreach (var order in orders)
        {
            if (order.Status == "Dispatched" || order.Status == "Canceled")
                continue;

            if (order.PickedQuantity < order.Quantity)
            {
                if (order.PickedQuantity == 0)
                {
                    order.Status = "Canceled";
                    order.Notes = string.IsNullOrWhiteSpace(order.Notes) ? remarkLine : $"{order.Notes}\n{remarkLine}";
                }
                else
                {
                    var originalQty = order.Quantity;
                    order.Quantity = order.PickedQuantity;
                    order.Status = "Picked";
                    
                    var itemRemark = $"[Original Qty: {originalQty}. Short Picked: {dto.Remark.Trim()}]";
                    order.Notes = string.IsNullOrWhiteSpace(order.Notes) ? itemRemark : $"{order.Notes}\n{itemRemark}";
                }
                order.UpdatedAt = now;
                updatedItems.Add(order);

                if (order.SalesOrder != null)
                {
                    var soRemark = $"[{order.Product?.Sku ?? "Item"} Short Picked: {dto.Remark.Trim()}]";
                    order.SalesOrder.CancelRemark = string.IsNullOrWhiteSpace(order.SalesOrder.CancelRemark) 
                        ? soRemark 
                        : $"{order.SalesOrder.CancelRemark}\n{soRemark}";
                    order.SalesOrder.UpdatedAt = now;
                }
            }
        }

        await _context.SaveChangesAsync();

        foreach (var salesOrderId in dto.SalesOrderIds.Distinct())
        {
            await UpdateSalesOrderStatusAsync(salesOrderId);
        }
        await _context.SaveChangesAsync();
        await transaction.CommitAsync();

        var result = new ConsolidatedShortPickResultDto
        {
            ProductId = dto.ProductId,
            UpdatedItems = updatedItems.Select(MapOrder).ToList(),
        };

        if (updatedItems.Count > 0)
        {
            await SendNotificationAsync(new RealtimeNotificationDto
            {
                Type = "outward.consolidated-short-picked",
                Title = "Consolidated short pick",
                Message = $"Short picked {updatedItems.Count} item(s) for product ID {dto.ProductId}. Reason: {dto.Remark.Trim()}",
                Severity = "warning",
                Data = new Dictionary<string, object?>
                {
                    ["productId"] = dto.ProductId,
                    ["orderCount"] = updatedItems.Count,
                    ["remark"] = dto.Remark.Trim(),
                },
            });
        }

        return Success(result, $"Short picked {updatedItems.Count} item(s) successfully");
    }

    [HttpPost("{id}/mark-packed")]
    public async Task<ActionResult<ApiResponse<OutwardOrderDto>>> MarkPacked(int id)
    {
        var order = await _context.OutwardOrders
            .Include(x => x.Product)
            .Include(x => x.SalesOrder)
            .FirstOrDefaultAsync(x => x.Id == id);
        if (order == null)
            return NotFound<OutwardOrderDto>("Outward order not found");

        if (order.Status == "Dispatched")
            return BadRequest<OutwardOrderDto>("Dispatched orders cannot be packed");

        if (order.Status == "Canceled" || order.SalesOrder?.Status == "Canceled")
            return BadRequest<OutwardOrderDto>("Canceled orders cannot be packed");

        if (order.PickedQuantity < order.Quantity)
            return BadRequest<OutwardOrderDto>("Order must be fully picked before it can be packed");

        if (order.PackedQuantity < order.PickedQuantity)
            return BadRequest<OutwardOrderDto>(
                $"Scan all picked units before completing packing. Packed {order.PackedQuantity} of {order.PickedQuantity}.");

        if (order.Status != "Packed")
        {
            order.Status = "Packed";
            order.PackedAt = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified);
            order.UpdatedAt = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified);
            await _context.SaveChangesAsync();

            if (order.SalesOrderId > 0)
            {
                await UpdateSalesOrderStatusAsync(order.SalesOrderId);
                await _context.SaveChangesAsync();
            }
        }

        var response = MapOrder(order);
        await SendNotificationAsync(new RealtimeNotificationDto
        {
            Type = "outward.packed",
            Title = "Order packed",
            Message = $"{response.OrderNumber} is ready for dispatch.",
            Severity = "success",
            Data = new Dictionary<string, object?>
            {
                ["orderId"] = response.Id,
                ["orderNumber"] = response.OrderNumber,
                ["customerName"] = response.CustomerName,
            },
        });

        return Success(response, "Order marked as packed");
    }

    [HttpPost("{id}/pack")]
    public async Task<ActionResult<ApiResponse<OutwardOrderDto>>> UpdatePackingQuantity(
        int id,
        [FromBody] UpdatePackingQuantityDto dto)
    {
        var order = await _context.OutwardOrders
            .Include(x => x.Product)
            .Include(x => x.SalesOrder)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (order == null)
            return NotFound<OutwardOrderDto>("Outward order not found");

        if (order.Status == "Dispatched")
            return BadRequest<OutwardOrderDto>("Dispatched orders cannot be packed");

        if (order.Status == "Packed")
            return BadRequest<OutwardOrderDto>("This item is already packed");

        if (order.Status == "Canceled" || order.SalesOrder?.Status == "Canceled")
            return BadRequest<OutwardOrderDto>("Canceled orders cannot be packed");

        if (order.PickedQuantity < order.Quantity)
            return BadRequest<OutwardOrderDto>("Order must be fully picked before it can be packed");

        var requestedQuantity = dto.Quantity <= 0 ? 1 : dto.Quantity;
        var remainingQuantity = Math.Max(order.PickedQuantity - order.PackedQuantity, 0);
        if (remainingQuantity == 0)
            return BadRequest<OutwardOrderDto>("All picked units are already scanned. Save packing to continue.");

        var packedNow = Math.Min(requestedQuantity, remainingQuantity);
        order.PackedQuantity += packedNow;
        order.UpdatedAt = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified);
        await _context.SaveChangesAsync();

        return Success(
            MapOrder(order),
            $"Packed quantity updated to {order.PackedQuantity} of {order.PickedQuantity}");
    }

    [HttpPost("{id}/short-pack")]
    public async Task<ActionResult<ApiResponse<OutwardOrderDto>>> ShortPack(int id, [FromBody] ShortPackDto dto)
    {
        var order = await _context.OutwardOrders
            .Include(x => x.Product)
            .Include(x => x.SalesOrder)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (order == null)
            return NotFound<OutwardOrderDto>("Outward order not found");

        if (order.Status == "Dispatched")
            return BadRequest<OutwardOrderDto>("Dispatched orders cannot be short-packed");

        if (order.Status == "Canceled" || order.SalesOrder?.Status == "Canceled")
            return BadRequest<OutwardOrderDto>("Canceled orders cannot be short-packed");

        if (order.PickedQuantity < order.Quantity)
            return BadRequest<OutwardOrderDto>("Order must be fully picked before it can be packed");

        if (dto.PackedQuantity > order.PickedQuantity)
            return BadRequest<OutwardOrderDto>("Packed quantity cannot exceed picked quantity");

        if (dto.PackedQuantity > order.PackedQuantity)
            return BadRequest<OutwardOrderDto>(
                $"Only {order.PackedQuantity} units were scanned for packing. Scan the remaining units first.");

        if (dto.PackedQuantity == order.PickedQuantity)
            return BadRequest<OutwardOrderDto>("Use the standard 'Mark Packed' operation for full quantities");

        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        int? performedByUserId = int.TryParse(userIdClaim, out var parsedUserId) ? parsedUserId : null;
        var performedByName = User.FindFirstValue(ClaimTypes.GivenName)
            ?? User.Identity?.Name
            ?? "System User";

        var shortage = order.PickedQuantity - dto.PackedQuantity;
        var now = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified);

        // Revert the shortage back into stock
        if (shortage > 0)
        {
            var productQty = await _context.ProductQuantities
                .FirstOrDefaultAsync(x => x.ProductId == order.ProductId);

            if (productQty != null)
            {
                var qtyBefore = productQty.CurrentQuantity;
                productQty.CurrentQuantity += shortage;
                productQty.UpdatedAt = now;

                _context.ProductStockMovements.Add(new ProductStockMovement
                {
                    ProductId = order.ProductId,
                    MovementType = "adjustment",
                    QuantityChange = shortage,
                    QuantityBefore = qtyBefore,
                    QuantityAfter = productQty.CurrentQuantity,
                    Reason = "Packing Shortage",
                    Notes = $"{BuildSalesOrderMovementReference(order.SalesOrder)}; Returned Qty: {shortage}; Remark: {dto.Remark.Trim()}",
                    PerformedByUserId = performedByUserId,
                    PerformedByName = performedByName,
                    CreatedAt = now
                });
            }

            var productLoc = await _context.ProductAllottedLocations
                .FirstOrDefaultAsync(x => x.ProductId == order.ProductId);

            if (productLoc == null)
            {
                productLoc = new ProductAllottedLocation
                {
                    ProductId = order.ProductId,
                    LocationJson = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase),
                    UpdatedAt = now
                };
                _context.ProductAllottedLocations.Add(productLoc);
            }
            else if (productLoc.LocationJson == null)
            {
                productLoc.LocationJson = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
            }

            if (order.PickedLocationJson != null && order.PickedLocationJson.Count > 0)
            {
                var remainingShortage = shortage;
                var keys = order.PickedLocationJson.Keys.ToList();
                
                foreach (var key in keys)
                {
                    if (remainingShortage <= 0) break;
                    
                    var pickedQty = order.PickedLocationJson[key];
                    if (pickedQty <= 0) continue;
                    
                    var qtyToReturn = Math.Min(pickedQty, remainingShortage);
                    order.PickedLocationJson[key] -= qtyToReturn;
                    remainingShortage -= qtyToReturn;
                    
                    productLoc.LocationJson.TryGetValue(key, out var existingLocQty);
                    productLoc.LocationJson[key] = existingLocQty + qtyToReturn;
                }
                
                // Cleanup empty locations from the pick record
                foreach (var key in keys)
                {
                    if (order.PickedLocationJson[key] <= 0)
                        order.PickedLocationJson.Remove(key);
                }
                _context.Entry(order).Property(x => x.PickedLocationJson).IsModified = true;
            }
            else
            {
                // Fallback if PickedLocationJson was empty
                string targetLocation = "UNKNOWN";
                productLoc.LocationJson.TryGetValue(targetLocation, out var existingLocQty);
                productLoc.LocationJson[targetLocation] = existingLocQty + shortage;
            }

            productLoc.UpdatedAt = now;
            _context.Entry(productLoc).Property(x => x.LocationJson).IsModified = true;
        }

        var skuLabel = order.Product?.Sku ?? "Item";
        var remarkLine = $"[Short Packed: {shortage} less. Reason: {dto.Remark.Trim()}]";

        if (order.SalesOrder != null)
        {
            var soRemark = $"[{skuLabel} Short Packed: {shortage} less. Reason: {dto.Remark.Trim()}]";
            order.SalesOrder.CancelRemark = string.IsNullOrWhiteSpace(order.SalesOrder.CancelRemark) 
                ? soRemark 
                : $"{order.SalesOrder.CancelRemark}\n{soRemark}";
            order.SalesOrder.UpdatedAt = now;
        }

        if (dto.PackedQuantity == 0)
        {
            order.Status = "Canceled";
            order.PickedQuantity = 0;
            order.PackedQuantity = 0;
            order.Notes = string.IsNullOrWhiteSpace(order.Notes) ? remarkLine : $"{order.Notes}\n{remarkLine}";
        }
        else
        {
            order.Status = "Packed";
            order.Quantity = dto.PackedQuantity;
            order.PickedQuantity = dto.PackedQuantity;
            order.PackedQuantity = dto.PackedQuantity;
            order.PackedAt = now;
            order.Notes = string.IsNullOrWhiteSpace(order.Notes) ? remarkLine : $"{order.Notes}\n{remarkLine}";
        }

        order.UpdatedAt = now;
        await _context.SaveChangesAsync();

        if (order.SalesOrderId > 0)
        {
            await UpdateSalesOrderStatusAsync(order.SalesOrderId);
            await _context.SaveChangesAsync();
        }

        var response = MapOrder(order);
        
        await SendNotificationAsync(new RealtimeNotificationDto
        {
            Type = "outward.short-packed",
            Title = "Order short-packed",
            Message = $"{response.OrderNumber} was short-packed. Reason: {dto.Remark.Trim()}",
            Severity = "warning",
            Data = new Dictionary<string, object?>
            {
                ["orderId"] = response.Id,
                ["orderNumber"] = response.OrderNumber,
                ["customerName"] = response.CustomerName,
            },
        });

        return Success(response, "Order short-packed successfully");
    }

    [HttpPost("{id}/dispatch")]
    public async Task<ActionResult<ApiResponse<OutwardOrderDto>>> DispatchOrder(int id, [FromBody] DispatchOutwardOrderDto dto)
    {
        var order = await _context.OutwardOrders.Include(x => x.Product).Include(x => x.SalesOrder).FirstOrDefaultAsync(x => x.Id == id);
        if (order == null)
            return NotFound<OutwardOrderDto>("Outward order not found");

        if (order.Status == "Canceled" || order.SalesOrder?.Status == "Canceled")
            return BadRequest<OutwardOrderDto>("Canceled orders cannot be dispatched");

        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        int? performedByUserId = int.TryParse(userIdClaim, out var parsedUserId) ? parsedUserId : null;
        var performedByName = User.FindFirstValue(ClaimTypes.GivenName)
            ?? User.Identity?.Name
            ?? "System User";

        var dispatchResult = await DispatchOrderInternalAsync(order, performedByUserId, performedByName);
        if (!dispatchResult.Success)
            return BadRequest<OutwardOrderDto>(dispatchResult.Message!);

        // Save tracking number if provided
        if (!string.IsNullOrWhiteSpace(dto?.TrackingNumber) && order.SalesOrder != null)
        {
            order.SalesOrder.TrackingNumber = dto.TrackingNumber.Trim();
            order.SalesOrder.UpdatedAt = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified);
        }

        await _context.SaveChangesAsync();
        if (order.SalesOrderId > 0)
        {
            await UpdateSalesOrderStatusAsync(order.SalesOrderId);
            await _context.SaveChangesAsync();
        }

        var response = MapOrder(order);

        await SendNotificationAsync(new RealtimeNotificationDto
        {
            Type = "outward.dispatched",
            Title = "Order dispatched",
            Message = $"{response.OrderNumber} dispatched for {response.CustomerName}.",
            Severity = "success",
            Data = new Dictionary<string, object?>
            {
                ["orderId"] = response.Id,
                ["orderNumber"] = response.OrderNumber,
                ["customerName"] = response.CustomerName,
                ["skuCode"] = response.SkuCode,
                ["quantity"] = response.Quantity,
            },
        });

        return Success(response, "Order dispatched successfully");
    }

    [HttpPost("sales-orders/{salesOrderId}/dispatch")]
    public async Task<ActionResult<ApiResponse<DispatchSalesOrderResultDto>>> DispatchSalesOrder(int salesOrderId, [FromBody] DispatchSalesOrderDto? dto)
    {
        var salesOrder = await _context.SalesOrders.AsNoTracking().FirstOrDefaultAsync(x => x.Id == salesOrderId);
        if (salesOrder == null)
            return NotFound<DispatchSalesOrderResultDto>("Sales order not found");

        if (salesOrder.Status == "Canceled")
            return BadRequest<DispatchSalesOrderResultDto>("Canceled sales order cannot be dispatched");

        var orders = await _context.OutwardOrders
            .Include(x => x.Product)
            .Include(x => x.SalesOrder)
            .Where(x => x.SalesOrderId == salesOrderId)
            .OrderBy(x => x.Id)
            .ToListAsync();

        if (orders.Count == 0)
            return NotFound<DispatchSalesOrderResultDto>("Sales order items not found");

        var pendingOrders = orders
            .Where(x => x.Status != "Dispatched" && x.Status != "Canceled")
            .ToList();
        if (pendingOrders.Count == 0)
            return BadRequest<DispatchSalesOrderResultDto>("Sales order is already fully dispatched");

        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        int? performedByUserId = int.TryParse(userIdClaim, out var parsedUserId) ? parsedUserId : null;
        var performedByName = User.FindFirstValue(ClaimTypes.GivenName)
            ?? User.Identity?.Name
            ?? "System User";

        foreach (var order in pendingOrders)
        {
            var dispatchResult = await DispatchOrderInternalAsync(order, performedByUserId, performedByName);
            if (!dispatchResult.Success)
                return BadRequest<DispatchSalesOrderResultDto>(dispatchResult.Message!);
        }

        await _context.SaveChangesAsync();

        // Save tracking number if provided
        var trackingNumber = dto?.TrackingNumber?.Trim();
        if (!string.IsNullOrWhiteSpace(trackingNumber))
        {
            var salesOrderEntity = await _context.SalesOrders.FirstOrDefaultAsync(x => x.Id == salesOrderId);
            if (salesOrderEntity != null)
            {
                salesOrderEntity.TrackingNumber = trackingNumber;
                salesOrderEntity.UpdatedAt = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified);
            }
        }

        await UpdateSalesOrderStatusAsync(salesOrderId);
        await _context.SaveChangesAsync();

        var response = new DispatchSalesOrderResultDto
        {
            SalesOrderId = salesOrderId,
            OrderNumber = salesOrder.OrderNumber,
            DispatchedItemCount = pendingOrders.Count,
            Items = pendingOrders.Select(row => MapOrder(row)).ToList(),
        };

        return Success(response, pendingOrders.Count > 1
            ? $"Sales order {salesOrder.OrderNumber} dispatched successfully"
            : "Sales order dispatched successfully");
    }

    [HttpPost("sales-orders/{salesOrderId}/cancel")]
    public async Task<ActionResult<ApiResponse<SalesOrderDto>>> CancelSalesOrder(int salesOrderId, [FromBody] CancelSalesOrderDto dto)
    {
        var salesOrder = await _context.SalesOrders
            .Include(x => x.Items)
                .ThenInclude(x => x.Product)
            .FirstOrDefaultAsync(x => x.Id == salesOrderId);

        if (salesOrder == null)
            return NotFound<SalesOrderDto>("Sales order not found");

        if (salesOrder.Status == "Canceled")
            return BadRequest<SalesOrderDto>("Sales order is already canceled");

        if (string.IsNullOrWhiteSpace(dto.Remark))
            return BadRequest<SalesOrderDto>("Cancel remark is required");

        if (salesOrder.Status == "Dispatched" || salesOrder.Items.Any(item => item.Status == "Dispatched"))
            return BadRequest<SalesOrderDto>("Cannot cancel sales order after dispatch");

        await using var transaction = await _context.Database.BeginTransactionAsync();
        var now = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified);
        var (cancelUserId, cancelUserName) = ResolvePerformedBy();
        salesOrder.CancelRemark = dto.Remark.Trim();

        foreach (var item in salesOrder.Items.Where(item => item.PickedQuantity > 0))
        {
            await RestoreCanceledPickAsync(item, cancelUserId, cancelUserName);
        }

        salesOrder.Status = "Canceled";
        salesOrder.UpdatedAt = now;
        salesOrder.DispatchedAt = null;

        foreach (var item in salesOrder.Items)
        {
            item.Status = "Canceled";
            item.PickedQuantity = 0;
            item.PickedLocationJson = null;
            item.DispatchedAt = null;
            item.Notes = string.IsNullOrWhiteSpace(item.Notes)
                ? $"Canceled: {dto.Remark.Trim()}"
                : $"{item.Notes} | Canceled: {dto.Remark.Trim()}";
            item.UpdatedAt = salesOrder.UpdatedAt;
        }

        await _context.SaveChangesAsync();
        await transaction.CommitAsync();

        await _auditLogService.LogCustomActionAsync(
            "CancelSalesOrder",
            "SalesOrder",
            salesOrder.Id.ToString(),
            $"Canceled order {salesOrder.OrderNumber} with remark: {dto.Remark.Trim()}",
            null,
            new { Remark = dto.Remark.Trim(), OrderNumber = salesOrder.OrderNumber }
        );

        return Success(MapSalesOrder(salesOrder), $"Sales order {salesOrder.OrderNumber} canceled successfully");
    }

    [HttpPut("sales-orders/{salesOrderId}")]
    public async Task<ActionResult<ApiResponse<SalesOrderDto>>> UpdateSalesOrder(int salesOrderId, [FromBody] UpdateSalesOrderDto dto)
    {
        var salesOrder = await _context.SalesOrders
            .Include(x => x.Items)
                .ThenInclude(x => x.Product)
            .FirstOrDefaultAsync(x => x.Id == salesOrderId);

        if (salesOrder == null)
            return NotFound<SalesOrderDto>("Sales order not found");

        if (salesOrder.Status == "Canceled")
        {
            // Only allow reference number edit for canceled orders
            salesOrder.ReferenceNumber = dto.ReferenceNumber?.Trim();
            salesOrder.UpdatedAt = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified);
            await _context.SaveChangesAsync();
            return Success(MapSalesOrder(salesOrder), "Reference number updated");
        }

        // Full edit for non-canceled orders (except order number)
        if (!string.IsNullOrWhiteSpace(dto.CustomerName))
            salesOrder.CustomerName = dto.CustomerName.Trim();

        if (!string.IsNullOrWhiteSpace(dto.OrderDate) &&
            DateTime.TryParse(dto.OrderDate, out var parsedDate))
            salesOrder.OrderDate = DateTime.SpecifyKind(parsedDate, DateTimeKind.Unspecified);

        var previousNotes = string.IsNullOrWhiteSpace(salesOrder.Notes) ? null : salesOrder.Notes.Trim();
        var updatedNotes = string.IsNullOrWhiteSpace(dto.Notes) ? null : dto.Notes.Trim();

        salesOrder.Notes = updatedNotes;
        salesOrder.ReferenceNumber = dto.ReferenceNumber?.Trim();
        salesOrder.UpdatedAt = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified);

        foreach (var item in salesOrder.Items)
        {
            var itemNotes = string.IsNullOrWhiteSpace(item.Notes) ? null : item.Notes.Trim();
            if (itemNotes == previousNotes)
            {
                item.Notes = updatedNotes;
                item.UpdatedAt = salesOrder.UpdatedAt;
            }
        }

        await _context.SaveChangesAsync();

        await _auditLogService.LogCustomActionAsync(
            "UpdateSalesOrder",
            "SalesOrder",
            salesOrder.Id.ToString(),
            $"Updated order {salesOrder.OrderNumber}",
            null,
            new { dto.CustomerName, dto.OrderDate, dto.Notes, dto.ReferenceNumber }
        );

        return Success(MapSalesOrder(salesOrder), $"Sales order {salesOrder.OrderNumber} updated successfully");
    }

    private async Task<string> GenerateOrderNumberAsync()
    {
        var prefix = $"SO-{DateTime.Now:yyMMdd}";
        var nextSequence = await GetNextOrderSequenceAsync(prefix);

        return $"{prefix}-{nextSequence:000}";
    }

    private async Task<int> GetNextOrderSequenceAsync(string prefix)
    {
        var lastOrder = await _context.SalesOrders
            .Where(x => x.OrderNumber.StartsWith(prefix))
            .OrderByDescending(x => x.OrderNumber)
            .FirstOrDefaultAsync();

        var nextSequence = 1;
        if (lastOrder != null)
        {
            var suffix = lastOrder.OrderNumber.Split('-').LastOrDefault();
            if (int.TryParse(suffix, out var parsed))
                nextSequence = parsed + 1;
        }

        return nextSequence;
    }

    private async Task<Product?> FindUploadProductAsync(string partNo, string itemName)
    {
        if (!string.IsNullOrWhiteSpace(partNo))
        {
            var normalizedPartNo = partNo.Trim().ToLower();
            var product = await _context.Products.FirstOrDefaultAsync(x =>
                (x.Sku != null && x.Sku.ToLower() == normalizedPartNo) ||
                (x.Alias != null && x.Alias.ToLower() == normalizedPartNo));

            if (product != null)
                return product;
        }

        if (!string.IsNullOrWhiteSpace(itemName))
        {
            var normalizedItemName = itemName.Trim().ToLower();
            return await _context.Products.FirstOrDefaultAsync(x => x.Name.ToLower() == normalizedItemName);
        }

        return null;
    }

    private static string NormalizeUploadHeader(string value)
    {
        return new string(value.Where(char.IsLetterOrDigit).ToArray()).ToLowerInvariant();
    }

    private static Dictionary<string, int> BuildUploadHeaderMap(IXLRow headerRow)
    {
        var headerMap = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        foreach (var cell in headerRow.CellsUsed())
        {
            var normalizedHeader = NormalizeUploadHeader(cell.GetString());
            if (!string.IsNullOrWhiteSpace(normalizedHeader) && !headerMap.ContainsKey(normalizedHeader))
                headerMap[normalizedHeader] = cell.Address.ColumnNumber;
        }

        if (headerMap.Count > 1)
            return headerMap;

        var firstHeaderCell = headerRow.CellsUsed().FirstOrDefault();
        if (firstHeaderCell == null)
            return headerMap;

        var concatenatedHeader = NormalizeUploadHeader(firstHeaderCell.GetString());
        var expectedHeaders = new[]
        {
            "invoiceno",
            "invdate",
            "partyname",
            "partno",
            "mrp",
            "itemname",
            "billedqty",
        };

        var expectedConcatenatedHeader = string.Concat(expectedHeaders);
        if (!string.Equals(concatenatedHeader, expectedConcatenatedHeader, StringComparison.OrdinalIgnoreCase))
            return headerMap;

        var startColumn = firstHeaderCell.Address.ColumnNumber;
        return expectedHeaders
            .Select((header, index) => new { header, column = startColumn + index })
            .ToDictionary(item => item.header, item => item.column, StringComparer.OrdinalIgnoreCase);
    }

    private static DateTime NormalizeUploadDate(DateTime value)
    {
        return DateTime.SpecifyKind(value.Date, DateTimeKind.Unspecified);
    }

    private static DateTime? TryParseUploadDate(IXLCell cell)
    {
        if (cell.TryGetValue<DateTime>(out var date))
            return NormalizeUploadDate(date);

        var raw = cell.GetString().Trim();
        if (string.IsNullOrWhiteSpace(raw))
            return null;

        var formats = new[]
        {
            "dd-MMM-yy",
            "d-MMM-yy",
            "dd/MM/yyyy",
            "d/M/yyyy",
            "dd-MM-yyyy",
            "d-M-yyyy",
            "yyyy-MM-dd",
        };

        if (DateTime.TryParseExact(raw, formats, CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsed))
            return NormalizeUploadDate(parsed);

        if (DateTime.TryParse(raw, CultureInfo.InvariantCulture, DateTimeStyles.None, out parsed))
            return NormalizeUploadDate(parsed);

        return null;
    }

    private static decimal ReadDecimalCell(IXLCell cell)
    {
        var text = cell.GetString().Trim();
        if (decimal.TryParse(text, NumberStyles.Any, CultureInfo.InvariantCulture, out var parsed))
            return parsed;

        try
        {
            return (decimal)cell.GetDouble();
        }
        catch
        {
            return 0m;
        }
    }

    private static int ReadIntCell(IXLCell cell)
    {
        var text = cell.GetString().Trim();
        if (int.TryParse(text, NumberStyles.Any, CultureInfo.InvariantCulture, out var parsed))
            return parsed;

        if (decimal.TryParse(text, NumberStyles.Any, CultureInfo.InvariantCulture, out var decimalParsed))
            return Convert.ToInt32(decimalParsed);

        try
        {
            return Convert.ToInt32(cell.GetDouble());
        }
        catch
        {
            return 0;
        }
    }

    private async Task<string> GenerateDirectOrderNumberAsync()
    {
        var prefix = $"DO-{DateTime.Now:yyMMdd}";
        var lastOrder = await _context.SalesOrders
            .Where(x => x.OrderNumber.StartsWith(prefix))
            .OrderByDescending(x => x.OrderNumber)
            .FirstOrDefaultAsync();

        var nextSequence = 1;
        if (lastOrder != null)
        {
            var suffix = lastOrder.OrderNumber.Split('-').LastOrDefault();
            if (int.TryParse(suffix, out var parsed))
                nextSequence = parsed + 1;
        }

        return $"{prefix}-{nextSequence:000}";
    }

    // Resolves a scanned code to a canonical (LocationCode, BinCode?) pair.
    // Accepts a plain location code, a bare bin code (bins are linked to a location),
    // or a composed "LOCATION::BIN" key. When a bin is identified, BinCode is returned
    // so the caller can deduct from the exact bin slot.
    private async Task<(string? LocationCode, string? BinCode)> ResolveLocationCodeAsync(string scannedLocationCode)
    {
        var normalized = scannedLocationCode.Trim();
        if (string.IsNullOrWhiteSpace(normalized))
            return (null, null);

        // Composed "LOCATION::BIN" key (e.g. sent by the picking screens).
        if (normalized.Contains("::"))
        {
            var parts = normalized.Split("::", 2);
            var locPart = parts[0].Trim();
            var binPart = parts.Length > 1 ? parts[1].Trim() : null;

            var loc = await _context.Locations
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.LocationCode.ToLower() == locPart.ToLower());
            if (loc == null)
                return (null, null);

            var canonicalBin = string.IsNullOrWhiteSpace(binPart)
                ? null
                : loc.Bins.FirstOrDefault(b => b.ToLower() == binPart.ToLower()) ?? binPart;
            return (loc.LocationCode, canonicalBin);
        }

        // Plain location code.
        var directLocation = await _context.Locations
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.LocationCode.ToLower() == normalized.ToLower());
        if (directLocation != null)
            return (directLocation.LocationCode, null);

        // Bare bin code → resolve to its parent location plus the canonical bin name.
        var binLocation = await _context.Locations
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Bins.Any(bin => bin.ToLower() == normalized.ToLower()));
        if (binLocation != null)
        {
            var canonicalBin = binLocation.Bins.FirstOrDefault(b => b.ToLower() == normalized.ToLower()) ?? normalized;
            return (binLocation.LocationCode, canonicalBin);
        }

        return (null, null);
    }

    private async Task<(bool Success, string? Message, string? LocationCode)> ReduceAllocatedLocationAsync(
        int productId,
        string resolvedLocationCode,
        string? scannedBin,
        int quantity,
        decimal? mrp,
        int? performedByUserId,
        string performedByName,
        string flow,
        string movementReference)
    {
        var row = await _context.ProductAllottedLocations.FirstOrDefaultAsync(x => x.ProductId == productId);
        if (row == null || row.LocationJson == null || row.LocationJson.Count == 0)
            return (false, "No allotted location stock found for this product", null);

        string? matchingKey;

        if (!string.IsNullOrWhiteSpace(scannedBin))
        {
            // A bin was scanned: deduct from the exact "LOCATION::BIN" slot, and if the product
            // is stored at the location level (no bin key), fall back to the plain location.
            var binFullKey = $"{resolvedLocationCode}::{scannedBin}";
            matchingKey =
                row.LocationJson.Keys.FirstOrDefault(key =>
                    string.Equals(key, binFullKey, StringComparison.OrdinalIgnoreCase))
                ?? row.LocationJson.Keys.FirstOrDefault(key =>
                    string.Equals(key, resolvedLocationCode, StringComparison.OrdinalIgnoreCase));

            if (matchingKey == null)
                return (false, $"Scanned bin {scannedBin} at {resolvedLocationCode} is not allotted for this SKU.", null);
        }
        else
        {
            matchingKey = row.LocationJson.Keys.FirstOrDefault(key =>
                string.Equals(key, resolvedLocationCode, StringComparison.OrdinalIgnoreCase));

            if (matchingKey == null)
            {
                var binKey = row.LocationJson.Keys.FirstOrDefault(key =>
                    key.StartsWith(resolvedLocationCode + "::", StringComparison.OrdinalIgnoreCase) &&
                    row.LocationJson[key] > 0);

                if (binKey != null)
                {
                    var binName = binKey.Split("::")[1];
                    return (false, $"This product is located on bin {binName}. Please scan that bin to process.", null);
                }

                return (false, $"Scanned location {resolvedLocationCode} is not allotted for this SKU.", null);
            }
        }

        var available = row.LocationJson[matchingKey];
        if (available < quantity)
            return (false, $"Only {available} units are available in {matchingKey}", null);

        var quantityRow = await _context.ProductQuantities.FirstOrDefaultAsync(x => x.ProductId == productId);
        if (quantityRow == null)
            return (false, "Stock quantity row is missing for this product", null);

        if (quantityRow.CurrentQuantity < quantity)
            return (false, $"Only {quantityRow.CurrentQuantity} units are available in product stock", null);

        var nextQty = available - quantity;
        if (nextQty <= 0)
            row.LocationJson.Remove(matchingKey);
        else
            row.LocationJson[matchingKey] = nextQty;

        row.UpdatedAt = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified);
        _context.Entry(row).Property(x => x.LocationJson).IsModified = true;

        // Reduce total product stock in the same operation as the location decrement so the two
        // stock representations always stay in sync, and log an auditable movement for the pick.
        var quantityBefore = quantityRow.CurrentQuantity;
        quantityRow.CurrentQuantity -= quantity;
        quantityRow.UpdatedAt = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified);

        _context.ProductStockMovements.Add(new ProductStockMovement
        {
            ProductId = productId,
            QuantityChange = -quantity,
            QuantityBefore = quantityBefore,
            QuantityAfter = quantityRow.CurrentQuantity,
            Reason = "Outward Pick",
            MovementType = "pick",
            Notes = $"{movementReference}; Picked Qty: {quantity}; Location: {matchingKey}; Flow: {flow}",
            PerformedByUserId = performedByUserId,
            PerformedByName = performedByName,
            CreatedAt = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified),
        });

        return (true, null, matchingKey);
    }

    private async Task RestoreCanceledPickAsync(OutwardOrder order, int? performedByUserId, string performedByName)
    {
        var pickedQuantity = order.PickedQuantity;
        if (pickedQuantity <= 0)
            return;

        await _context.LockProductAsync(order.ProductId);

        var quantityRow = await _context.ProductQuantities.FirstOrDefaultAsync(x => x.ProductId == order.ProductId);
        if (quantityRow == null)
        {
            quantityRow = new ProductQuantity
            {
                ProductId = order.ProductId,
                CurrentQuantity = 0,
                UpdatedAt = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified),
            };
            _context.ProductQuantities.Add(quantityRow);
        }

        var quantityBefore = quantityRow.CurrentQuantity;
        quantityRow.CurrentQuantity += pickedQuantity;
        quantityRow.UpdatedAt = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified);

        var pickedLocations = order.PickedLocationJson is { Count: > 0 }
            ? new Dictionary<string, int>(order.PickedLocationJson, StringComparer.OrdinalIgnoreCase)
            : new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase)
            {
                [Location.DefaultLocationCode] = pickedQuantity,
            };

        var allocationRow = await _context.ProductAllottedLocations.FirstOrDefaultAsync(x => x.ProductId == order.ProductId);
        if (allocationRow == null)
        {
            allocationRow = new ProductAllottedLocation
            {
                ProductId = order.ProductId,
                LocationJson = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase),
                UpdatedAt = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified),
            };
            _context.ProductAllottedLocations.Add(allocationRow);
        }
        else if (allocationRow.LocationJson == null)
        {
            allocationRow.LocationJson = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        }

        var locationJson = new Dictionary<string, int>(allocationRow.LocationJson, StringComparer.OrdinalIgnoreCase);
        foreach (var pickedLocation in pickedLocations)
        {
            if (pickedLocation.Value <= 0)
                continue;

            locationJson.TryGetValue(pickedLocation.Key, out var existingQty);
            locationJson[pickedLocation.Key] = existingQty + pickedLocation.Value;
        }

        allocationRow.LocationJson = locationJson;
        allocationRow.UpdatedAt = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified);
        _context.Entry(allocationRow).Property(x => x.LocationJson).IsModified = true;

        _context.ProductStockMovements.Add(new ProductStockMovement
        {
            ProductId = order.ProductId,
            QuantityChange = pickedQuantity,
            QuantityBefore = quantityBefore,
            QuantityAfter = quantityRow.CurrentQuantity,
            Reason = "Sales Order Cancel",
            MovementType = "cancel",
            Notes = $"{BuildSalesOrderMovementReference(order.SalesOrder)}; Restored Qty: {pickedQuantity}" +
                    (string.IsNullOrWhiteSpace(order.SalesOrder?.CancelRemark)
                        ? ""
                        : $"; Remark: {order.SalesOrder.CancelRemark.Trim()}"),
            PerformedByUserId = performedByUserId,
            PerformedByName = performedByName,
            CreatedAt = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified),
        });
    }

    private static void AddPickedLocation(OutwardOrder order, string locationCode, int quantity)
    {
        order.PickedLocationJson ??= new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        order.PickedLocationJson.TryGetValue(locationCode, out var existingQty);
        order.PickedLocationJson[locationCode] = existingQty + quantity;
    }

    private (int? UserId, string Name) ResolvePerformedBy()
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        int? performedByUserId = int.TryParse(userIdClaim, out var parsedUserId) ? parsedUserId : null;
        var performedByName = User.FindFirstValue(ClaimTypes.GivenName)
            ?? User.Identity?.Name
            ?? "System User";
        return (performedByUserId, performedByName);
    }

    private static string BuildSalesOrderMovementReference(SalesOrder? salesOrder)
    {
        if (salesOrder == null)
            return "Sales Order: Unknown";

        var reference = $"Sales Order: {salesOrder.OrderNumber}";
        if (!string.IsNullOrWhiteSpace(salesOrder.ReferenceNumber) &&
            !string.Equals(
                salesOrder.ReferenceNumber.Trim(),
                salesOrder.OrderNumber.Trim(),
                StringComparison.OrdinalIgnoreCase))
        {
            reference += $"; Customer Reference: {salesOrder.ReferenceNumber.Trim()}";
        }

        return reference;
    }

    private async Task<(bool Success, string? Message)> DispatchOrderInternalAsync(
        OutwardOrder order,
        int? performedByUserId,
        string performedByName)
    {
        if (order.Status == "Dispatched")
            return (false, $"Order {order.SalesOrder?.OrderNumber ?? order.Id.ToString()} is already dispatched");

        if (order.Status == "Canceled" || order.SalesOrder?.Status == "Canceled")
            return (false, $"Order {order.SalesOrder?.OrderNumber ?? order.Id.ToString()} is canceled");

        if (order.PickedQuantity < order.Quantity)
            return (false, $"Order {order.SalesOrder?.OrderNumber ?? order.Id.ToString()} must be fully picked before dispatch");

        if (order.Status != "Packed")
            return (false, $"Order {order.SalesOrder?.OrderNumber ?? order.Id.ToString()} must be fully packed before dispatch");

        // Product stock and the per-location quantity are already reduced (and a stock movement
        // logged) at pick time. Dispatch is status-only and must not reduce stock again.
        order.Status = "Dispatched";
        order.DispatchedAt = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified);
        order.UpdatedAt = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified);

        return (true, null);
    }

    private async Task UpdateSalesOrderStatusAsync(int salesOrderId)
    {
        var header = await _context.SalesOrders.FirstOrDefaultAsync(x => x.Id == salesOrderId);
        if (header == null)
            return;

        var items = await _context.OutwardOrders
            .AsNoTracking()
            .Where(x => x.SalesOrderId == salesOrderId)
            .Select(x => new { x.Status, x.Quantity, x.PickedQuantity })
            .ToListAsync();

        if (items.Count == 0)
            return;

        if (items.All(item => item.Status == "Canceled"))
        {
            header.Status = "Canceled";
            header.DispatchedAt = null;
            header.UpdatedAt = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified);
            _context.SalesOrders.Update(header);
            return;
        }

        var activeItems = items.Where(item => item.Status != "Canceled").ToList();

        if (activeItems.All(item => item.Status == "Dispatched"))
        {
            header.Status = "Dispatched";
            header.DispatchedAt = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified);
        }
        else if (activeItems.All(item => item.Status == "Packed"))
        {
            header.Status = "Packed";
            header.DispatchedAt = null;
        }
        else if (activeItems.All(item => item.Status == "Picked" || item.Status == "Packed"))
        {
            header.Status = "Picked";
            header.DispatchedAt = null;
        }
        else if (activeItems.Any(item => item.Status == "Picking" || item.Status == "Picked" || item.PickedQuantity > 0))
        {
            header.Status = "Picking";
            header.DispatchedAt = null;
        }
        else
        {
            header.Status = "Open";
            header.DispatchedAt = null;
        }

        header.UpdatedAt = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified);
        _context.SalesOrders.Update(header);
    }

    private static OutwardOrderDto MapOrder(OutwardOrder row)
    {
        var salesOrder = row.SalesOrder;
        return new OutwardOrderDto
        {
            Id = row.Id,
            OrderNumber = salesOrder?.OrderNumber ?? string.Empty,
            ReferenceNumber = salesOrder?.ReferenceNumber,
            SalesOrderId = row.SalesOrderId,
            SalesOrderStatus = salesOrder?.Status ?? row.Status,
            SalesOrderNotes = salesOrder?.Notes,
            SalesOrderCreatedAt = salesOrder?.CreatedAt ?? row.CreatedAt,
            SalesOrderUpdatedAt = salesOrder?.UpdatedAt ?? row.UpdatedAt,
            SalesOrderDispatchedAt = salesOrder?.DispatchedAt,
            OrderDate = salesOrder?.OrderDate ?? row.CreatedAt,
            CustomerName = salesOrder?.CustomerName ?? string.Empty,
            ProductId = row.ProductId,
            SkuCode = row.Product?.Sku ?? string.Empty,
            ProductName = row.Product?.Name ?? string.Empty,
            Ownership = row.Product?.Ownership,
            Alias = row.Product?.Alias,
            CartonQr = row.Product?.CartonQr,
            CartonPerItem = row.Product?.CartonPerItem,
            Quantity = row.Quantity,
            Mrp = row.Mrp,
            PickedQuantity = row.PickedQuantity,
            PackedQuantity = row.PackedQuantity,
            PendingQuantity = Math.Max(row.Quantity - row.PickedQuantity, 0),
            Status = row.Status,
            Notes = row.Notes,
            CreatedAt = row.CreatedAt,
            UpdatedAt = row.UpdatedAt,
            DispatchedAt = row.DispatchedAt,
            PickedAt = row.PickedAt,
            PackedAt = row.PackedAt,
            TrackingNumber = salesOrder?.TrackingNumber,
        };
    }

    private static SalesOrderDto MapSalesOrder(SalesOrder row)
    {
        var items = row.Items
            .OrderBy(x => x.Id)
            .Select(item => MapOrder(item))
            .ToList();

        return new SalesOrderDto
        {
            Id = row.Id,
            OrderNumber = row.OrderNumber,
            OrderDate = row.OrderDate,
            CustomerName = row.CustomerName,
            Status = row.Status,
            Notes = row.Notes,
            ReferenceNumber = row.ReferenceNumber,
            CancelRemark = row.CancelRemark,
            TrackingNumber = row.TrackingNumber,
            ItemCount = items.Count,
            TotalQuantity = items.Sum(x => x.Quantity),
            TotalPickedQuantity = items.Sum(x => x.PickedQuantity),
            PendingQuantity = items.Sum(x => x.PendingQuantity),
            CreatedAt = row.CreatedAt,
            UpdatedAt = row.UpdatedAt,
            DispatchedAt = row.DispatchedAt,
            Items = items,
        };
    }

    private Task SendNotificationAsync(RealtimeNotificationDto notification)
    {
        return _notificationHub.Clients.All.SendAsync("ReceiveNotification", notification);
    }

    private static List<CreateOutwardOrderItemDto> BuildRequestedItems(CreateOutwardOrderDto dto)
    {
        if (dto.Items != null && dto.Items.Count > 0)
        {
            return dto.Items;
        }

        if (dto.ProductId.HasValue && dto.Quantity.HasValue)
        {
            return
            [
                new CreateOutwardOrderItemDto
                {
                    ProductId = dto.ProductId.Value,
                    Quantity = dto.Quantity.Value,
                },
            ];
        }

        return [];
    }

    private sealed record SalesOrderUploadRow(
        int RowNumber,
        string ReferenceNumber,
        DateTime OrderDate,
        string CustomerName,
        Product Product,
        int Quantity,
        decimal? Mrp);
}
