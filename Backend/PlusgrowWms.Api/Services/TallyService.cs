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
			// Parse the cleaned XML response
			var xmlDocument = new XmlDocument();
			xmlDocument.LoadXml(responseContent);

			// Convert XML to JSON
			string jsonData = JsonConvert.SerializeXmlNode(xmlDocument, Newtonsoft.Json.Formatting.Indented);

			// Deserialize JSON into a JObject for manipulation
			var jsonObject = JsonConvert.DeserializeObject<JObject>(jsonData);
			// Remove empty or invalid values recursively
			RemoveEmptyValues(jsonObject);
			// Navigate to the TALLYMESSAGE array
			var tallyMessageArray = jsonObject["ENVELOPE"]?["BODY"]?["DATA"]?["COLLECTION"]?["STOCKITEM"];

			// Convert the TALLYMESSAGE array to a formatted JSON string
			string tallyMessageJson = JsonConvert.SerializeObject(tallyMessageArray, Newtonsoft.Json.Formatting.Indented);
			var finaldata = JsonConvert.DeserializeObject<List<Dictionary<string, dynamic>>>(tallyMessageJson);

			var voucherList = new List<StockItem>();

			if (finaldata != null)
			{
				foreach (var entry in finaldata)
				{
					// Safely access "HSNDETAILS.LIST" as a dictionary or null
					var hsnData = entry.ContainsKey("HSNDETAILS.LIST") && entry["HSNDETAILS.LIST"] is JObject
								  ? (JObject)entry["HSNDETAILS.LIST"]
								  : null;

					// Safely access nested properties for alias
					string alias = "NA";
					if (entry.ContainsKey("LANGUAGENAME.LIST") && entry["LANGUAGENAME.LIST"] is JObject languageNameList &&
						languageNameList.ContainsKey("NAME.LIST") && languageNameList["NAME.LIST"] is JObject nameList &&
						nameList.ContainsKey("NAME") && nameList["NAME"] is JArray names && names.Count > 1)
					{
						alias = names[1]?.ToString() ?? "NA";
					}

					// Create the StockItem object
					var voucher = new StockItem
					{
						name = entry.ContainsKey("@NAME") ? entry["@NAME"]?.ToString() ?? "NA" : "NA",
						GUID = entry.ContainsKey("GUID") ? entry["GUID"]?.ToString() ?? "NA" : "NA",
						openingrate = entry.ContainsKey("OPENINGRATE") && entry["OPENINGRATE"] != null
							 ? Convert.ToDouble(ConvertToInt(entry["OPENINGRATE"].ToString())) : 0,
						openingqnty = entry.ContainsKey("OPENINGBALANCE") && entry["OPENINGBALANCE"] != null
							 ? ExtractNumericPart(entry["OPENINGBALANCE"].ToString()) : 0,
						category = RemoveJunkCharacters(entry.ContainsKey("PARENT") ? entry["PARENT"]?.ToString() ?? "NA" : "NA"),
						unit = entry.ContainsKey("BASEUNITS") ? entry["BASEUNITS"]?.ToString() ?? "NA" : "NA",
						hsncode = hsnData?.ContainsKey("HSNCODE") == true ? hsnData["HSNCODE"]?.ToString() ?? "NA" : "NA",
						alias = alias,
						partNo = entry.ContainsKey("PARTNO") ? entry["PARTNO"]?.ToString() ?? "NA" : "NA",
					};

					voucherList.Add(voucher);
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
}
