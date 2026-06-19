using System;
using System.IO;
using System.Net.Http;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Xml;
using System.Xml.Linq;
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

			if (response.IsSuccessStatusCode)
			{
				// Server is running
				return true;
			}
			else
			{
				// Server is reachable but returned an error
				return false;
			}
		}
		catch (Exception ex)
		{

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

		var xmlDocument = XDocument.Load(xmlFilePath, LoadOptions.PreserveWhitespace);
		var fromDateElement = xmlDocument.Descendants().FirstOrDefault(x => x.Name.LocalName == "SVFROMDATE");
		var toDateElement = xmlDocument.Descendants().FirstOrDefault(x => x.Name.LocalName == "SVTODATE");

		if (fromDateElement is null || toDateElement is null)
			throw new InvalidOperationException("GetVoucher.xml must contain SVFROMDATE and SVTODATE elements.");

		fromDateElement.Value = fromDate;
		toDateElement.Value = toDate;

		return await GetVouchersFromXmlContentAsync(xmlDocument.ToString(SaveOptions.DisableFormatting));
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

			var tallyMessageArray = jsonObject["ENVELOPE"]?["BODY"]?["IMPORTDATA"]?["REQUESTDATA"]?["TALLYMESSAGE"];

			string tallyMessageJson = JsonConvert.SerializeObject(tallyMessageArray, Newtonsoft.Json.Formatting.Indented);
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

						string voucherTypeName = "NA";

						if (itemData is JObject itemDataObject &&
							itemDataObject["ACCOUNTINGALLOCATIONS.LIST"] is JArray accountingArray)
						{
							var firstAccountingEntry = accountingArray.FirstOrDefault() as JObject;
							if (firstAccountingEntry != null)
								voucherTypeName = firstAccountingEntry["LEDGERNAME"]?.ToString() ?? "NA";
						}
						else if (itemData is JObject singleAccountingEntry &&
								 singleAccountingEntry["ACCOUNTINGALLOCATIONS.LIST"] is JObject singleAccountingObject)
						{
							voucherTypeName = singleAccountingObject["LEDGERNAME"]?.ToString() ?? "NA";
						}

						var voucher = new Voucher
						{
							RemoteID = voucherData["@REMOTEID"]?.ToString() ?? "NA",
							VoucherType = voucherData["@VCHTYPE"]?.ToString() ?? "NA",
							Date = voucherData["DATE"]?.ToString() ?? "NA",
							PartyName = voucherData["PARTYNAME"]?.ToString() ?? "NA",
							AccountType = voucherTypeName,
							Items = new List<ItemDetails>()
						};

						if (itemData is JArray itemArray)
						{
							foreach (var item in itemArray)
								voucher.Items.Add(new ItemDetails
								{
									StockItemName = item["STOCKITEMNAME"]?.ToString() ?? "NA",
									Rate = item["RATE"]?.ToString() ?? "NA",
									Amount = item["AMOUNT"]?.ToString() ?? "NA",
									ActualQty = item["ACTUALQTY"]?.ToString() ?? "NA"
								});
						}
						else if (itemData is JObject singleItem)
						{
							voucher.Items.Add(new ItemDetails
							{
								StockItemName = singleItem["STOCKITEMNAME"]?.ToString() ?? "NA",
								Rate = singleItem["RATE"]?.ToString() ?? "NA",
								Amount = singleItem["AMOUNT"]?.ToString() ?? "NA",
								ActualQty = singleItem["ACTUALQTY"]?.ToString() ?? "NA"
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
}

