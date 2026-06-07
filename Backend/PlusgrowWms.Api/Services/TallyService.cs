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
	private readonly ILogger<TallyService> _logger;

	public TallyService(HttpClient httpClient, IConfiguration configuration, ILogger<TallyService> logger)
	{
		_httpClient = httpClient;
		_configuration = configuration;
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
			var tallyMessageArray = jsonObject["ENVELOPE"]?["BODY"]?["IMPORTDATA"]?["REQUESTDATA"]?["TALLYMESSAGE"];


			// Convert the TALLYMESSAGE array to a formatted JSON string
			string tallyMessageJson = JsonConvert.SerializeObject(tallyMessageArray, Newtonsoft.Json.Formatting.Indented);
			var data = JsonConvert.DeserializeObject<List<Dictionary<string, dynamic>>>(tallyMessageJson);

			// List to store processed vouchers
			var voucherList = new List<Voucher>();
			if (data != null)
			{
				foreach (var entry in data)
				{
					// Check if the entry contains the "VOUCHER" key
					if (entry.ContainsKey("VOUCHER"))
					{
						var voucherData = entry["VOUCHER"];
						var itemData = voucherData["ALLINVENTORYENTRIES.LIST"];

						// Initialize variables to store accounting allocation details
						string voucherTypeName = "NA";

						// Check if ACCOUNTINGALLOCATIONS.LIST exists and is valid
						if (itemData is JObject itemDataObject &&
							itemDataObject["ACCOUNTINGALLOCATIONS.LIST"] is JArray accountingArray)
						{
							// Handle multiple accounting allocations
							var firstAccountingEntry = accountingArray.FirstOrDefault() as JObject;
							if (firstAccountingEntry != null)
							{
								voucherTypeName = firstAccountingEntry["LEDGERNAME"]?.ToString() ?? "NA";
							}
						}
						else if (itemData is JObject singleAccountingEntry &&
								 singleAccountingEntry["ACCOUNTINGALLOCATIONS.LIST"] is JObject singleAccountingObject)
						{
							// Handle single accounting allocation
							voucherTypeName = singleAccountingObject["LEDGERNAME"]?.ToString() ?? "NA";
						}

						// Create a new Voucher object and handle null fields by assigning "NA"
						var voucher = new Voucher
						{
							RemoteID = voucherData["@REMOTEID"]?.ToString() ?? "NA",
							VoucherType = voucherData["@VCHTYPE"]?.ToString() ?? "NA",
							Date = voucherData["DATE"]?.ToString() ?? "NA",
							PartyName = voucherData["PARTYNAME"]?.ToString() ?? "NA",
							AccountType = voucherTypeName,
							Items = new List<ItemDetails>() // Initialize the Items list
						};

						// Check if the item data is a JArray or JObject
						if (itemData is JArray itemArray)
						{
							// Handle multiple items
							foreach (var item in itemArray)
							{
								var newItem = new ItemDetails
								{
									StockItemName = item["STOCKITEMNAME"]?.ToString() ?? "NA",
									Rate = item["RATE"]?.ToString() ?? "NA",
									Amount = item["AMOUNT"]?.ToString() ?? "NA",
									ActualQty = item["ACTUALQTY"]?.ToString() ?? "NA"
								};
								voucher.Items.Add(newItem);
							}
						}
						else if (itemData is JObject singleItem)
						{
							// Handle a single item
							var newItem = new ItemDetails
							{
								StockItemName = singleItem["STOCKITEMNAME"]?.ToString() ?? "NA",
								Rate = singleItem["RATE"]?.ToString() ?? "NA",
								Amount = singleItem["AMOUNT"]?.ToString() ?? "NA",
								ActualQty = singleItem["ACTUALQTY"]?.ToString() ?? "NA"
							};
							voucher.Items.Add(newItem);
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

