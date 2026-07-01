using System;
using System.IO;
using System.Net.Http;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Xml;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using PlusgrowWms.Api.DTOs;
using TallyERPWebApi.Model;
using static System.Runtime.InteropServices.JavaScript.JSType;

public class TallyService
{
	private readonly HttpClient _httpClient;
	private readonly IConfiguration _configuration;
	private readonly IWebHostEnvironment _environment;
	private readonly ILogger<TallyService> _logger;

	public TallyService(HttpClient httpClient, IConfiguration configuration, IWebHostEnvironment environment, ILogger<TallyService> logger)
	{
		_httpClient = httpClient;
		_configuration = configuration;
		_environment = environment;
		_logger = logger;
	}
	public async Task<bool> GetTestConnection()
	{
		try
		{
			// Send a GET request to the Tally server
			string tallyUrl = _configuration["TallySettings:TallyUrl"];
			var response = await _httpClient.GetAsync(tallyUrl);

			// Tally often returns a 400 Bad Request to a simple GET without XML payload.
			// As long as we get a response (and no exception is thrown), Tally is reachable.
			return true;
		}
		catch (Exception ex)
		{
			_logger.LogWarning(ex, "Tally Server is unreachable at {TallyUrl}", _configuration["TallySettings:TallyUrl"]);
			return false;
		}
	}
	public async Task<string> GetCurrentCompanyAsync(string xmlFilePath)
	{
		try
		{
			// Validate Tally URL
			string tallyUrl = _configuration["TallySettings:TallyUrl"];
			if (string.IsNullOrWhiteSpace(tallyUrl))
			{
				throw new InvalidOperationException("Tally URL is not configured.");
			}

			// Validate XML file
			if (!File.Exists(xmlFilePath))
			{
				throw new FileNotFoundException("The specified XML file was not found.", xmlFilePath);
			}

			// Read the XML content from the file
			string xmlContent = await File.ReadAllTextAsync(xmlFilePath);

			// Create HTTP request
			var request = new HttpRequestMessage(HttpMethod.Post, tallyUrl)
			{
				Content = new StringContent(xmlContent, Encoding.UTF8, "text/xml")
			};

			// Send request and get response
			var response = await _httpClient.SendAsync(request);
			response.EnsureSuccessStatusCode();

			var responseContent = await response.Content.ReadAsStringAsync();

			// Parse XML response to JSON
			XmlDocument doc = new XmlDocument();
			doc.LoadXml(responseContent);

			var jsonContent = JsonConvert.SerializeXmlNode(doc, Newtonsoft.Json.Formatting.Indented);
			var jsonObject = JObject.Parse(jsonContent);

			// Extract CURRENTCOMPANY
			string currentCompany = (string)jsonObject["ENVELOPE"]?["BODY"]?["DATA"]?["COLLECTION"]?["CURRENTCOMPANY"]?["CURRENTCOMPANY"]?["#text"];

			return currentCompany;
		}
		catch (Exception ex)
		{
			_logger.LogError(ex, "An error occurred while communicating with Tally.");
			throw;
		}
	}


	public async Task<List<Voucher>> GetVoucherAsync(string xmlFilePath)
	{
		if (!File.Exists(xmlFilePath))
			throw new FileNotFoundException("The specified XML file was not found.", xmlFilePath);

		string xmlContent = await File.ReadAllTextAsync(xmlFilePath);
		return await GetVouchersFromXmlContentAsync(xmlContent);
	}

	/// <summary>
	/// Fetch vouchers using the static GetVoucher.xml template, replacing only the date range.
	/// Tally date format is yyyyMMdd.
	/// </summary>
	public async Task<List<Voucher>> GetVoucherByDateRangeAsync(DateTime from, DateTime to)
	{
		string fromDate = from.ToString("yyyyMMdd");
		string toDate = to.ToString("yyyyMMdd");
		string xmlFilePath = Path.Combine(_environment.ContentRootPath, "wwwroot", "TallyXML", "GetVoucher.xml");

		if (!File.Exists(xmlFilePath))
			throw new FileNotFoundException("The specified XML file was not found.", xmlFilePath);

		string xmlContent = await File.ReadAllTextAsync(xmlFilePath);

		if (!xmlContent.Contains("{fromdate}") || !xmlContent.Contains("{todate}"))
			throw new InvalidOperationException("GetVoucher.xml must contain {fromdate} and {todate} placeholders.");

		xmlContent = xmlContent
			.Replace("{fromdate}", fromDate)
			.Replace("{todate}", toDate);

		return await GetVouchersFromXmlContentAsync(xmlContent);
	}

	public async Task<string> PostSalesOrderAsync(ResellerPendingOrder order)
	{
		string tallyUrl = _configuration["TallySettings:TallyUrl"];
		if (string.IsNullOrWhiteSpace(tallyUrl))
			throw new InvalidOperationException("Tally URL is not configured.");

		// Build Tally XML
		// Tally Date format: yyyyMMdd
		var parsedDate = DateTime.TryParseExact(order.OrderDate, "dd/MM/yyyy", null, System.Globalization.DateTimeStyles.None, out var d) ? d : DateTime.Now;
		var tallyDate = parsedDate.ToString("yyyyMMdd");

		var sb = new StringBuilder();
		sb.AppendLine("<ENVELOPE>");
		sb.AppendLine("  <HEADER>");
		sb.AppendLine("    <TALLYREQUEST>Import Data</TALLYREQUEST>");
		sb.AppendLine("  </HEADER>");
		sb.AppendLine("  <BODY>");
		sb.AppendLine("    <IMPORTDATA>");
		sb.AppendLine("      <REQUESTDESC>");
		sb.AppendLine("        <REPORTNAME>Vouchers</REPORTNAME>");
		sb.AppendLine("      </REQUESTDESC>");
		sb.AppendLine("      <REQUESTDATA>");
		sb.AppendLine("        <TALLYMESSAGE xmlns:UDF=\"TallyUDF\">");
		sb.AppendLine("          <VOUCHER VCHTYPE=\"Sales Order\" ACTION=\"Create\">");
		sb.AppendLine($"            <DATE>{tallyDate}</DATE>");
		sb.AppendLine("            <VOUCHERTYPENAME>Sales Order</VOUCHERTYPENAME>");
		sb.AppendLine($"            <VOUCHERNUMBER>{order.OrderNo}</VOUCHERNUMBER>");
		sb.AppendLine($"            <PARTYLEDGERNAME>{System.Security.SecurityElement.Escape(order.BillingAddress?.Name ?? \"Cash\")}</PARTYLEDGERNAME>");
		sb.AppendLine($"            <EFFECTIVEDATE>{tallyDate}</EFFECTIVEDATE>");
		sb.AppendLine("            <ISINVOICE>Yes</ISINVOICE>");

		// Party Ledger Entry (Debit)
		decimal totalItemAmount = 0;
		foreach (var item in order.Items)
		{
			totalItemAmount += item.Quantity * item.Rate;
		}
		decimal grandTotal = totalItemAmount + order.CompositeShippingCharges;

		sb.AppendLine("            <ALLLEDGERENTRIES.LIST>");
		sb.AppendLine($"              <LEDGERNAME>{System.Security.SecurityElement.Escape(order.BillingAddress?.Name ?? \"Cash\")}</LEDGERNAME>");
		sb.AppendLine("              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>");
		sb.AppendLine($"              <AMOUNT>-{grandTotal:F2}</AMOUNT>");
		sb.AppendLine("            </ALLLEDGERENTRIES.LIST>");

		// Shipping Ledger Entry (Credit)
		if (order.CompositeShippingCharges > 0)
		{
			sb.AppendLine("            <ALLLEDGERENTRIES.LIST>");
			sb.AppendLine("              <LEDGERNAME>Shipping Charges</LEDGERNAME>");
			sb.AppendLine("              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>");
			sb.AppendLine($"              <AMOUNT>{order.CompositeShippingCharges:F2}</AMOUNT>");
			sb.AppendLine("            </ALLLEDGERENTRIES.LIST>");
		}

		// Inventory Entries
		foreach (var item in order.Items)
		{
			decimal itemAmount = item.Quantity * item.Rate;
			sb.AppendLine("            <ALLINVENTORYENTRIES.LIST>");
			sb.AppendLine($"              <STOCKITEMNAME>{System.Security.SecurityElement.Escape(item.Sku)}</STOCKITEMNAME>");
			sb.AppendLine("              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>");
			sb.AppendLine($"              <RATE>{item.Rate:F2}</RATE>");
			sb.AppendLine($"              <AMOUNT>{itemAmount:F2}</AMOUNT>");
			sb.AppendLine($"              <ACTUALQTY>{item.Quantity}</ACTUALQTY>");
			sb.AppendLine($"              <BILLEDQTY>{item.Quantity}</BILLEDQTY>");
			sb.AppendLine("              <ACCOUNTINGALLOCATIONS.LIST>");
			sb.AppendLine("                <LEDGERNAME>Sales Order</LEDGERNAME>");
			sb.AppendLine("                <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>");
			sb.AppendLine($"                <AMOUNT>{itemAmount:F2}</AMOUNT>");
			sb.AppendLine("              </ACCOUNTINGALLOCATIONS.LIST>");
			sb.AppendLine("            </ALLINVENTORYENTRIES.LIST>");
		}

		sb.AppendLine("          </VOUCHER>");
		sb.AppendLine("        </TALLYMESSAGE>");
		sb.AppendLine("      </REQUESTDATA>");
		sb.AppendLine("    </IMPORTDATA>");
		sb.AppendLine("  </BODY>");
		sb.AppendLine("</ENVELOPE>");

		var request = new HttpRequestMessage(HttpMethod.Post, tallyUrl)
		{
			Content = new StringContent(sb.ToString(), Encoding.UTF8, "text/xml")
		};

		var response = await _httpClient.SendAsync(request);
		response.EnsureSuccessStatusCode();

		var responseContent = await response.Content.ReadAsStringAsync();
		
		// Typically Tally returns <CREATED>1</CREATED> on success.
		if (responseContent.Contains("<CREATED>0</CREATED>") && responseContent.Contains("<ERRORS>"))
		{
			throw new Exception($"Tally returned an error: {responseContent}");
		}

		return responseContent;
	}

	private async Task<List<Voucher>> GetVouchersFromXmlContentAsync(string xmlContent)
	{
		try
		{
			string tallyUrl = _configuration["TallySettings:TallyUrl"];
			if (string.IsNullOrWhiteSpace(tallyUrl))
				throw new InvalidOperationException("Tally URL is not configured.");

			var request = new HttpRequestMessage(HttpMethod.Post, tallyUrl)
			{
				Content = new StringContent(xmlContent, Encoding.UTF8, "text/xml")
			};

			var response = await _httpClient.SendAsync(request);
			response.EnsureSuccessStatusCode();

			var responseContent = await response.Content.ReadAsStringAsync();
			responseContent = RemoveInvalidCharacters(responseContent);

			var xmlDocument = new XmlDocument();
			xmlDocument.LoadXml(responseContent);

			string jsonData = JsonConvert.SerializeXmlNode(xmlDocument, Newtonsoft.Json.Formatting.Indented);
			var jsonObject = JsonConvert.DeserializeObject<JObject>(jsonData);
			RemoveEmptyValues(jsonObject);

			var tallyMessageNode = jsonObject["ENVELOPE"]?["BODY"]?["IMPORTDATA"]?["REQUESTDATA"]?["TALLYMESSAGE"];

			if (tallyMessageNode != null && tallyMessageNode.Type == JTokenType.Object)
			{
				tallyMessageNode = new JArray(tallyMessageNode);
			}

			string tallyMessageJson = JsonConvert.SerializeObject(tallyMessageNode, Newtonsoft.Json.Formatting.Indented);
			var data = JsonConvert.DeserializeObject<List<Dictionary<string, dynamic>>>(tallyMessageJson);

			var voucherList = new List<Voucher>();
			if (data != null)
			{
				foreach (var entry in data)
				{
					if (entry.ContainsKey("VOUCHER"))
					{
						var voucherData = entry["VOUCHER"];
						var itemData = voucherData["ALLINVENTORYENTRIES.LIST"];

						string voucherTypeName = GetInventoryLedgerName(itemData);
						string overallAmount = GetPartyLedgerAmount(voucherData["LEDGERENTRIES.LIST"]);

						var voucher = new Voucher
						{
							RemoteID = voucherData["@REMOTEID"]?.ToString() ?? "NA",
							VoucherType = voucherData["@VCHTYPE"]?.ToString() ?? "NA",
							Date = voucherData["DATE"]?.ToString() ?? "NA",
							PartyName = voucherData["PARTYNAME"]?.ToString() ?? "NA",
							Reference = voucherData["REFERENCE"]?.ToString() ?? "NA",
							AccountType = voucherTypeName,
							overallamount = overallAmount,
							Items = new List<ItemDetails>()
						};

						if (itemData is JArray itemArray)
						{
							foreach (var item in itemArray)
							{
								var actualQty = item["ACTUALQTY"]?.ToString() ?? "NA";
								var rate = item["RATE"]?.ToString() ?? "NA";

								voucher.Items.Add(new ItemDetails
								{
									StockItemName = item["STOCKITEMNAME"]?.ToString() ?? "NA",
									Rate = rate,
									Amount = item["AMOUNT"]?.ToString() ?? "NA",
									ActualQty = actualQty,
									Unit = GetUnit(actualQty, rate)
								});
							}
						}
						else if (itemData is JObject singleItem)
						{
							var actualQty = singleItem["ACTUALQTY"]?.ToString() ?? "NA";
							var rate = singleItem["RATE"]?.ToString() ?? "NA";

							voucher.Items.Add(new ItemDetails
							{
								StockItemName = singleItem["STOCKITEMNAME"]?.ToString() ?? "NA",
								Rate = rate,
								Amount = singleItem["AMOUNT"]?.ToString() ?? "NA",
								ActualQty = actualQty,
								Unit = GetUnit(actualQty, rate)
							});
						}

						voucherList.Add(voucher);
					}
				}
			}

			return voucherList;
		}
		catch (Exception ex)
		{
			_logger.LogError(ex, "An error occurred while communicating with Tally.");
			throw;
		}
	}

	private string GetInventoryLedgerName(dynamic itemData)
	{
		if (itemData is JArray itemArray)
		{
			foreach (var item in itemArray.OfType<JObject>())
			{
				var ledgerName = GetAccountingLedgerName(item["ACCOUNTINGALLOCATIONS.LIST"]);
				if (ledgerName != "NA")
					return ledgerName;
			}
		}

		if (itemData is JObject itemObject)
			return GetAccountingLedgerName(itemObject["ACCOUNTINGALLOCATIONS.LIST"]);

		return "NA";
	}

	private string GetAccountingLedgerName(JToken accountingAllocations)
	{
		if (accountingAllocations is JArray accountingArray)
		{
			var firstAccountingEntry = accountingArray.FirstOrDefault() as JObject;
			return firstAccountingEntry?["LEDGERNAME"]?.ToString() ?? "NA";
		}

		if (accountingAllocations is JObject accountingObject)
			return accountingObject["LEDGERNAME"]?.ToString() ?? "NA";

		return "NA";
	}

	private string GetPartyLedgerAmount(dynamic ledgerEntries)
	{
		if (ledgerEntries is JArray ledgerArray)
		{
			foreach (var ledger in ledgerArray.OfType<JObject>())
			{
				if (ledger["ISPARTYLEDGER"]?.ToString() == "Yes")
					return CleanAmount(ledger["AMOUNT"]?.ToString());
			}
		}

		if (ledgerEntries is JObject ledgerObject && ledgerObject["ISPARTYLEDGER"]?.ToString() == "Yes")
			return CleanAmount(ledgerObject["AMOUNT"]?.ToString());

		return "NA";
	}

	private string CleanAmount(string amount)
	{
		if (string.IsNullOrWhiteSpace(amount))
			return "NA";

		return amount.Trim().TrimStart('-');
	}

	private string GetUnit(string actualQty, string rate)
	{
		if (!string.IsNullOrWhiteSpace(actualQty) && actualQty != "NA")
		{
			var actualQtyMatch = Regex.Match(actualQty.Trim(), @"^[\d.,\s-]+(.+)$");
			if (actualQtyMatch.Success)
				return actualQtyMatch.Groups[1].Value.Trim();
		}

		if (!string.IsNullOrWhiteSpace(rate) && rate != "NA")
		{
			var rateParts = rate.Split('/', 2);
			if (rateParts.Length == 2 && !string.IsNullOrWhiteSpace(rateParts[1]))
				return rateParts[1].Trim();
		}

		return "NA";
	}

	public string RemoveInvalidCharacters(string input)
	{
		string pattern = @"[\u0000-\u001F]";
		return Regex.Replace(input, pattern, string.Empty);
	}
	public string RemoveJunkCharacters(string input)
	{
		// Remove all control characters except tab, newline, and carriage return
		string pattern = @"[\u0000-\u001F]"; // Matches all control characters (Unicode 0-31)
		return Regex.Replace(input, pattern, string.Empty).Trim();
	}
	void RemoveEmptyValues(JToken token)
	{
		if (token.Type == JTokenType.Object)
		{
			var properties = token.Children<JProperty>().ToList();
			foreach (var prop in properties)
			{
				if (prop.Value.Type == JTokenType.Null ||
					(prop.Value.Type == JTokenType.String && string.IsNullOrWhiteSpace(prop.Value.ToString())))
				{
					prop.Remove(); // Remove null or empty string values
				}
				else
				{
					RemoveEmptyValues(prop.Value); // Recursively clean nested objects or arrays
				}
			}
		}
		else if (token.Type == JTokenType.Array)
		{
			var items = token.Children().ToList();
			foreach (var item in items)
			{
				RemoveEmptyValues(item);
			}
		}
	}
	public async Task<List<StockItem>> GetStockItem(string xmlFilePath)
	{
		try
		{
			// Validate Tally URL
			string tallyUrl = _configuration["TallySettings:TallyUrl"];
			if (string.IsNullOrWhiteSpace(tallyUrl))
			{
				throw new InvalidOperationException("Tally URL is not configured.");
			}

			// Validate XML file
			if (!File.Exists(xmlFilePath))
			{
				throw new FileNotFoundException("The specified XML file was not found.", xmlFilePath);
			}

			// Read the XML content from the file
			string xmlContent = await File.ReadAllTextAsync(xmlFilePath);

			// Create HTTP request
			var request = new HttpRequestMessage(HttpMethod.Post, tallyUrl)
			{
				Content = new StringContent(xmlContent, Encoding.UTF8, "text/xml")
			};

			// Send request and get response
			var response = await _httpClient.SendAsync(request);
			response.EnsureSuccessStatusCode();

			var responseContent = await response.Content.ReadAsStringAsync();
			responseContent = RemoveInvalidCharacters(responseContent);

			// Parse the XML response directly using XmlDocument for reliable attribute access
			var xmlDocument = new XmlDocument();
			xmlDocument.LoadXml(responseContent);

			var stockItemNodes = xmlDocument.SelectNodes("//STOCKITEM");
			var stockItems = new List<StockItem>();

			if (stockItemNodes == null)
			{
				_logger.LogWarning("No STOCKITEM nodes found in Tally response.");
				return stockItems;
			}

			foreach (XmlNode node in stockItemNodes)
			{
				// NAME attribute on STOCKITEM element = product name
				var productName = node.Attributes?["NAME"]?.Value ?? "NA";

				// MAILINGNAME.LIST > MAILINGNAME = SKU code
				var mailingNameNode = node.SelectSingleNode("MAILINGNAME.LIST/MAILINGNAME");
				var skuCode = mailingNameNode?.InnerText?.Trim() ?? "";

				// CLOSINGBALANCE = stock quantity (e.g. "100 Nos" or "-5 Nos")
				var closingBalanceNode = node.SelectSingleNode("CLOSINGBALANCE");
				var closingBalanceRaw = closingBalanceNode?.InnerText?.Trim() ?? "0";
				decimal closingBalance = ExtractDecimal(closingBalanceRaw);

				// LANGUAGENAME.LIST > NAME.LIST > NAME = product name (alternative)
				// Some items may have multiple NAME entries; first one is the primary name
				var languageNameNode = node.SelectSingleNode("LANGUAGENAME.LIST/NAME.LIST/NAME");
				var languageName = languageNameNode?.InnerText?.Trim() ?? "";

				// Use @NAME attribute as the primary name, fallback to language name
				var finalName = !string.IsNullOrWhiteSpace(productName) && productName != "NA"
					? productName
					: languageName;

				// For backward compatibility, also try old fields if present via JSON fallback
				// But primarily use the new format
				var stockItem = new StockItem
				{
					name = RemoveJunkCharacters(finalName),
					skuCode = !string.IsNullOrWhiteSpace(skuCode) ? skuCode : "NA",
					closingBalance = closingBalance
				};

				stockItems.Add(stockItem);
			}

			_logger.LogInformation("Parsed {Count} stock items from Tally response.", stockItems.Count);
			return stockItems;
		}
		catch (Exception ex)
		{
			_logger.LogError(ex, "An error occurred while communicating with Tally.");
			throw;
		}
	}

	private int ConvertToInt(string value)
	{
		if (string.IsNullOrWhiteSpace(value)) return 0;
		var match = Regex.Match(value, @"-?\d+");
		return match.Success && int.TryParse(match.Value, out var num) ? num : 0;
	}

	private int ExtractNumericPart(string value)
	{
		if (string.IsNullOrWhiteSpace(value)) return 0;
		var match = Regex.Match(value, @"-?\d+");
		return match.Success && int.TryParse(match.Value, out var num) ? num : 0;
	}

	private decimal ExtractDecimal(string value)
	{
		if (string.IsNullOrWhiteSpace(value)) return 0m;
		var match = Regex.Match(value, @"-?\d+(\.\d+)?");
		return match.Success && decimal.TryParse(match.Value, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var num) ? num : 0m;
	}
}
