using System;
using System.Globalization;
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
using PlusgrowWms.Api.DTOs;
using TallyERPWebApi.Model;

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

		var salesOrderXml = BuildSalesOrderXml(order);

		var request = new HttpRequestMessage(HttpMethod.Post, tallyUrl)
		{
			Content = new StringContent(salesOrderXml, Encoding.UTF8, "text/xml")
		};

		var response = await _httpClient.SendAsync(request);
		response.EnsureSuccessStatusCode();

		var responseContent = await response.Content.ReadAsStringAsync();
		EnsureTallyImportSucceeded(responseContent);

		return responseContent;
	}

	private string BuildSalesOrderXml(ResellerPendingOrder order)
	{
		ValidateSalesOrder(order);

		var parsedDate = ParseResellerOrderDate(order.OrderDate);
		var tallyDate = parsedDate.ToString("yyyyMMdd", CultureInfo.InvariantCulture);
		var tallyDueDate = FormatTallyDisplayDate(parsedDate);
		var voucherTypeName = GetVoucherTypeName(order);
		var shippingLedgerName = GetTallySetting("ShippingLedgerName", "SHIPPING / PACKAGING CHARGES");
		var companyStateName = GetTallySetting("CompanyStateName", "Maharashtra");
		var companyGstin = NormalizeOptionalValue(_configuration["TallySettings:CompanyGstin"]);
		var companyGstRegistration = NormalizeOptionalValue(_configuration["TallySettings:CompanyGstRegistrationName"]);
		var godownName = GetTallySetting("GodownName", "PDC");
		var batchName = GetTallySetting("BatchName", "Primary Batch");
		var partyName = NormalizeConfigValue(order.BillingAddress?.Name, "Cash");
		var orderNo = NormalizeOrderNo(order.OrderNo);
		var stateName = NormalizeConfigValue(order.BillingAddress?.State ?? order.ShippingAddress?.State, companyStateName);
		var countryName = GetTallySetting("CountryName", "India");
		var placeOfSupply = NormalizeConfigValue(order.ShippingAddress?.State ?? order.BillingAddress?.State, stateName);
		var partyLedger = ResolvePartyLedger(orderNo, partyName);
		var amounts = CalculateTallyAmounts(order, placeOfSupply, companyStateName);
		var buyerPincode = order.BillingAddress?.Pincode > 0 ? order.BillingAddress.Pincode.ToString(CultureInfo.InvariantCulture) : null;
		var consigneePincode = order.ShippingAddress?.Pincode > 0 ? order.ShippingAddress.Pincode.ToString(CultureInfo.InvariantCulture) : buyerPincode;
		var paymentTerms = partyLedger.UsesCustomerLedger
			? null
			: NormalizeOptionalValue(_configuration["TallySettings:ConsumerPaymentTerms"]);

		var voucher = new XElement("VOUCHER",
			new XAttribute("VCHTYPE", voucherTypeName),
			new XAttribute("ACTION", "Create"),
			new XAttribute("OBJVIEW", "Invoice Voucher View"),
			new XElement("DATE", tallyDate),
			new XElement("VCHSTATUSDATE", tallyDate),
			new XElement("REFERENCEDATE", tallyDate),
			new XElement("GSTREGISTRATIONTYPE", partyLedger.UsesCustomerLedger ? GetTallySetting("CustomerLedgerGstRegistrationType", "Regular") : GetTallySetting("ConsumerGstRegistrationType", "Unregistered/Consumer")),
			new XElement("VATDEALERTYPE", "Regular"),
			new XElement("STATENAME", stateName),
			new XElement("COUNTRYOFRESIDENCE", countryName),
			new XElement("PLACEOFSUPPLY", placeOfSupply),
			new XElement("PARTYNAME", partyName),
			CreateGstRegistrationElement(companyGstRegistration, companyGstin),
			CreateOptionalElement("CMPGSTIN", companyGstin),
			new XElement("VOUCHERTYPENAME", voucherTypeName),
			new XElement("VOUCHERNUMBER", orderNo),
			new XElement("PARTYLEDGERNAME", partyLedger.PartyLedgerName),
			new XElement("REFERENCE", orderNo),
			new XElement("BASICORDERREF", orderNo),
			new XElement("PARTYMAILINGNAME", partyName),
			new XElement("BASICBUYERNAME", partyName),
			new XElement("CMPGSTREGISTRATIONTYPE", "Regular"),
			CreateOptionalElement("PARTYPINCODE", buyerPincode),
			new XElement("CONSIGNEEMAILINGNAME", NormalizeConfigValue(order.ShippingAddress?.Name, partyName)),
			CreateOptionalElement("CONSIGNEEPINCODE", consigneePincode),
			new XElement("CONSIGNEESTATENAME", placeOfSupply),
			new XElement("CMPGSTSTATE", companyStateName),
			new XElement("CONSIGNEECOUNTRYNAME", countryName),
			new XElement("BASICBASEPARTYNAME", partyLedger.PartyLedgerName),
			new XElement("NUMBERINGSTYLE", "Manual"),
			CreateAddressList("ADDRESS.LIST", "ADDRESS", order.BillingAddress),
			CreateAddressList("BASICBUYERADDRESS.LIST", "BASICBUYERADDRESS", order.ShippingAddress ?? order.BillingAddress),
			new XElement("PERSISTEDVIEW", "Invoice Voucher View"),
			new XElement("VCHSTATUSVOUCHERTYPE", voucherTypeName),
			CreateOptionalElement("VCHSTATUSTAXUNIT", companyGstRegistration),
			CreateOptionalElement("BASICDUEDATEOFPYMT", paymentTerms),
			new XElement("VOUCHERTYPEORIGNAME", voucherTypeName),
			new XElement("DIFFACTUALQTY", "No"),
			new XElement("ISMSTFROMSYNC", "No"),
			new XElement("ISDELETED", "No"),
			new XElement("ASORIGINAL", "No"),
			new XElement("ISCOMMONPARTY", partyLedger.UsesCustomerLedger ? "No" : "Yes"),
			new XElement("FORJOBCOSTING", "No"),
			new XElement("ISOPTIONAL", "No"),
			new XElement("VCHENTRYMODE", "Item Invoice"),
			new XElement("EFFECTIVEDATE", tallyDate),
			new XElement("USEFORINTEREST", "No"),
			new XElement("USEFORGODOWNTRANSFER", "No"),
			new XElement("ISGSTOVERRIDDEN", "No"),
			new XElement("ISCANCELLED", "No"),
			new XElement("ISECOMMERCESUPPLY", "No"),
			new XElement("ISINVOICE", "No"),
			new XElement("ORDERLINESTATUS", "No"));

		XNamespace udf = "TallyUDF";

		foreach (var line in amounts.Lines)
		{
			voucher.Add(CreateInventoryEntry(line, orderNo, tallyDueDate, partyLedger.SalesLedgerName, godownName, batchName, udf));
		}

		voucher.Add(CreatePartyLedgerEntry(partyLedger.PartyLedgerName, amounts.GrandTotal));

		if (amounts.ShippingBaseAmount > 0)
		{
			voucher.Add(CreateCreditLedgerEntry(shippingLedgerName, amounts.ShippingBaseAmount, includeVatAmount: false));
		}

		if (amounts.IntegratedTaxAmount > 0)
		{
			voucher.Add(CreateCreditLedgerEntry(GetTallySetting("IntegratedTaxLedgerName", "TAXES OUTPUT :- IGST (INTEGRATED) (MH)"), amounts.IntegratedTaxAmount, includeVatAmount: true));
		}

		if (amounts.CentralTaxAmount > 0)
		{
			voucher.Add(CreateCreditLedgerEntry(GetTallySetting("CentralTaxLedgerName", "TAXES OUTPUT :- CGST (CENTRAL) (MH)"), amounts.CentralTaxAmount, includeVatAmount: true));
		}

		if (amounts.StateTaxAmount > 0)
		{
			voucher.Add(CreateCreditLedgerEntry(GetTallySetting("StateTaxLedgerName", "TAXES OUTPUT :- SGST (STATE) (MH)"), amounts.StateTaxAmount, includeVatAmount: true));
		}

		if (amounts.RoundOffAmount != 0)
		{
			voucher.Add(CreateRoundOffLedgerEntry(GetTallySetting("RoundOffLedgerName", "Round Off"), amounts.RoundOffAmount));
		}

		var document = new XDocument(
			new XElement("ENVELOPE",
				new XElement("HEADER",
					new XElement("TALLYREQUEST", "Import Data")),
				new XElement("BODY",
					new XElement("IMPORTDATA",
						CreateRequestDescription(),
						new XElement("REQUESTDATA",
							new XElement("TALLYMESSAGE",
								new XAttribute(XNamespace.Xmlns + "UDF", udf),
								voucher))))));

		return document.ToString(SaveOptions.DisableFormatting);
	}

	private XElement CreateRequestDescription()
	{
		var requestDesc = new XElement("REQUESTDESC", new XElement("REPORTNAME", "Vouchers"));
		var shouldSendCurrentCompany = _configuration.GetValue("TallySettings:SendCurrentCompany", false);
		var currentCompany = NormalizeOptionalValue(_configuration["TallySettings:CurrentCompany"]);

		if (shouldSendCurrentCompany && !string.IsNullOrWhiteSpace(currentCompany))
		{
			requestDesc.Add(new XElement("STATICVARIABLES", new XElement("SVCURRENTCOMPANY", currentCompany)));
		}

		return requestDesc;
	}

	private static XElement CreatePartyLedgerEntry(string partyLedgerName, decimal grandTotal)
	{
		return new XElement("LEDGERENTRIES.LIST",
			new XElement("LEDGERNAME", partyLedgerName),
			new XElement("ISDEEMEDPOSITIVE", "Yes"),
			new XElement("LEDGERFROMITEM", "No"),
			new XElement("ISPARTYLEDGER", "Yes"),
			new XElement("ISLASTDEEMEDPOSITIVE", "Yes"),
			new XElement("AMOUNT", $"-{FormatMoney(grandTotal)}"));
	}

	private static XElement CreateCreditLedgerEntry(string ledgerName, decimal amount, bool includeVatAmount)
	{
		var ledgerEntry = new XElement("LEDGERENTRIES.LIST",
			new XElement("LEDGERNAME", ledgerName),
			new XElement("GSTCLASS", "Not Applicable"),
			new XElement("ISDEEMEDPOSITIVE", amount < 0 ? "Yes" : "No"),
			new XElement("LEDGERFROMITEM", "No"),
			new XElement("ISPARTYLEDGER", "No"),
			new XElement("ISLASTDEEMEDPOSITIVE", amount < 0 ? "Yes" : "No"),
			new XElement("AMOUNT", FormatMoney(amount)));

		if (includeVatAmount)
		{
			ledgerEntry.Add(new XElement("VATEXPAMOUNT", FormatMoney(amount)));
		}

		return ledgerEntry;
	}

	private static XElement CreateRoundOffLedgerEntry(string ledgerName, decimal amount)
	{
		var ledgerEntry = CreateCreditLedgerEntry(ledgerName, amount, includeVatAmount: true);
		ledgerEntry.AddFirst(new XElement("ROUNDTYPE", "Normal Rounding"));
		ledgerEntry.Add(new XElement("ROUNDLIMIT", " 1"));
		return ledgerEntry;
	}

	private XElement CreateInventoryEntry(
		TallyInventoryLine line,
		string orderNo,
		string tallyDueDate,
		string salesLedgerName,
		string godownName,
		string batchName,
		XNamespace udf)
	{
		var amount = FormatMoney(line.Amount);
		var quantity = FormatQuantity(line.Item.Quantity, line.Unit);

		return new XElement("ALLINVENTORYENTRIES.LIST",
			new XElement("STOCKITEMNAME", line.StockItemName),
			new XElement("GSTOVRDNTAXABILITY", "Taxable"),
			new XElement("GSTSOURCETYPE", "Stock Item"),
			new XElement("GSTITEMSOURCE", line.StockItemName),
			new XElement("HSNSOURCETYPE", "Stock Item"),
			new XElement("HSNITEMSOURCE", line.StockItemName),
			new XElement("GSTOVRDNTYPEOFSUPPLY", "Goods"),
			new XElement("GSTRATEINFERAPPLICABILITY", "As per Masters/Company"),
			new XElement("ISDEEMEDPOSITIVE", "No"),
			new XElement("ISLASTDEEMEDPOSITIVE", "No"),
			new XElement("RATE", $"{FormatMoney(line.BaseRate)}/{line.Unit}"),
			new XElement("AMOUNT", amount),
			new XElement("ACTUALQTY", quantity),
			new XElement("BILLEDQTY", quantity),
			new XElement("INCLVATRATE", $"{FormatMoney(line.InclusiveRate)}/{line.Unit}"),
			new XElement("BATCHALLOCATIONS.LIST",
				new XElement("GODOWNNAME", godownName),
				new XElement("BATCHNAME", batchName),
				new XElement("INDENTNO", "Not Applicable"),
				new XElement("ORDERNO", orderNo),
				new XElement("TRACKINGNUMBER", "Not Applicable"),
				new XElement("AMOUNT", amount),
				new XElement("ACTUALQTY", quantity),
				new XElement("BILLEDQTY", quantity),
				new XElement("INCLVATRATE", $"{FormatMoney(line.InclusiveRate)}/{line.Unit}"),
				new XElement("ORDERDUEDATE", new XAttribute("P", tallyDueDate), tallyDueDate)),
			new XElement("ACCOUNTINGALLOCATIONS.LIST",
				new XElement("LEDGERNAME", salesLedgerName),
				new XElement("GSTCLASS", "Not Applicable"),
				new XElement("ISDEEMEDPOSITIVE", "No"),
				new XElement("LEDGERFROMITEM", "No"),
				new XElement("ISPARTYLEDGER", "No"),
				new XElement("ISLASTDEEMEDPOSITIVE", "No"),
				new XElement("AMOUNT", amount)),
			new XElement(udf + "ITEMCODEINVCH.LIST",
				new XAttribute("DESC", "`ItemCodeinVch`"),
				new XAttribute("ISLIST", "YES"),
				new XAttribute("TYPE", "String"),
				new XAttribute("INDEX", "550"),
				new XElement(udf + "ITEMCODEINVCH", new XAttribute("DESC", "`ItemCodeinVch`"), line.Item.Sku)));
	}

	private static XElement? CreateAddressList(string listElementName, string childElementName, ResellerAddress? address)
	{
		if (address == null)
			return null;

		var lines = new string?[]
			{
				address.Line1,
				address.Line2,
				JoinAddressParts(address.City, address.State),
				address.Pincode > 0 ? address.Pincode.ToString(CultureInfo.InvariantCulture) : string.Empty,
				address.ContactNo > 0 ? address.ContactNo.ToString(CultureInfo.InvariantCulture) : string.Empty
			}
			.Where(line => !string.IsNullOrWhiteSpace(line))
			.Select(line => new XElement(childElementName, line!.Trim()))
			.ToList();

		return lines.Count == 0
			? null
			: new XElement(listElementName, new XAttribute("TYPE", "String"), lines);
	}

	private static string JoinAddressParts(params string[] parts)
	{
		return string.Join(", ", parts.Where(part => !string.IsNullOrWhiteSpace(part)).Select(part => part.Trim()));
	}

	private static DateTime ParseResellerOrderDate(string orderDate)
	{
		return DateTime.TryParseExact(orderDate, "dd/MM/yyyy", CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsedDate)
			? parsedDate
			: DateTime.Today;
	}

	private void ValidateSalesOrder(ResellerPendingOrder order)
	{
		ArgumentNullException.ThrowIfNull(order);

		if (string.IsNullOrWhiteSpace(order.OrderNo))
			throw new InvalidOperationException("Cannot push to Tally because the reseller order number is missing.");

		if (order.Items == null || order.Items.Count == 0)
			throw new InvalidOperationException($"Cannot push order {order.OrderNo} to Tally because it has no items.");

		for (var index = 0; index < order.Items.Count; index++)
		{
			var item = order.Items[index];
			var displayIndex = index + 1;

			if (string.IsNullOrWhiteSpace(item.Sku) && string.IsNullOrWhiteSpace(item.StockItemName))
				throw new InvalidOperationException($"Cannot push order {order.OrderNo} to Tally because item {displayIndex} has no SKU or stock item name.");

			if (item.Quantity <= 0)
				throw new InvalidOperationException($"Cannot push order {order.OrderNo} to Tally because item {item.Sku} has invalid quantity {item.Quantity}.");

			if (item.Rate < 0)
				throw new InvalidOperationException($"Cannot push order {order.OrderNo} to Tally because item {item.Sku} has a negative rate.");
		}
	}

	private void EnsureTallyImportSucceeded(string responseContent)
	{
		if (string.IsNullOrWhiteSpace(responseContent))
			throw new InvalidOperationException("Tally returned an empty response.");

		XDocument responseXml;
		try
		{
			responseXml = XDocument.Parse(RemoveInvalidCharacters(responseContent));
		}
		catch (XmlException ex)
		{
			throw new InvalidOperationException($"Tally returned a non-XML response: {responseContent}", ex);
		}

		var lineErrors = responseXml
			.Descendants()
			.Where(element => string.Equals(element.Name.LocalName, "LINEERROR", StringComparison.OrdinalIgnoreCase))
			.Select(element => element.Value.Trim())
			.Where(value => !string.IsNullOrWhiteSpace(value))
			.ToList();

		var importResult = responseXml.Descendants().FirstOrDefault(element =>
				string.Equals(element.Name.LocalName, "IMPORTRESULT", StringComparison.OrdinalIgnoreCase) ||
				string.Equals(element.Name.LocalName, "RESPONSE", StringComparison.OrdinalIgnoreCase))
			?? responseXml.Root;

		var created = ReadTallyImportValue(importResult, "CREATED");
		var altered = ReadTallyImportValue(importResult, "ALTERED");
		var ignored = ReadTallyImportValue(importResult, "IGNORED");
		var errors = ReadTallyImportValue(importResult, "ERRORS");
		var hasImportCounters = created.HasValue || altered.HasValue || ignored.HasValue || errors.HasValue;

		if (lineErrors.Count > 0 || errors.GetValueOrDefault() > 0)
		{
			var details = lineErrors.Count > 0
				? string.Join("; ", lineErrors)
				: $"Tally reported {errors.GetValueOrDefault()} error(s).";

			throw new InvalidOperationException($"Tally import failed: {details}. Response: {responseContent}");
		}

		if (ignored.GetValueOrDefault() > 0)
			throw new InvalidOperationException($"Tally ignored the voucher import. Response: {responseContent}");

		if (hasImportCounters && created.GetValueOrDefault() + altered.GetValueOrDefault() == 0)
			throw new InvalidOperationException($"Tally did not create or alter the voucher. Response: {responseContent}");
	}

	private static int? ReadTallyImportValue(XElement? parent, string elementName)
	{
		var value = parent?
			.Elements()
			.FirstOrDefault(element => string.Equals(element.Name.LocalName, elementName, StringComparison.OrdinalIgnoreCase))
			?.Value;

		return int.TryParse(value, NumberStyles.Integer, CultureInfo.InvariantCulture, out var number)
			? number
			: null;
	}

	private string GetTallySetting(string key, string fallback)
	{
		return NormalizeConfigValue(_configuration[$"TallySettings:{key}"], fallback);
	}

	private string GetVoucherTypeName(ResellerPendingOrder order)
	{
		var configuredVoucherType = NormalizeOptionalValue(_configuration["TallySettings:VoucherTypeName"]);

		if (!string.IsNullOrWhiteSpace(configuredVoucherType))
			return configuredVoucherType;

		var apiVoucherType = NormalizeConfigValue(order.VoucherType, "SO-Online");
		return string.Equals(apiVoucherType, "SO Online", StringComparison.OrdinalIgnoreCase)
			? "SO-Online"
			: apiVoucherType;
	}

	private string NormalizeTallyUnit(string? unit)
	{
		var defaultUnit = NormalizeConfigValue(_configuration["TallySettings:DefaultUnit"], "pcs");
		var useProductUnit = _configuration.GetValue("TallySettings:UseProductUnitForResellerOrders", false);
		var normalized = NormalizeConfigValue(useProductUnit ? unit : null, defaultUnit).Trim();

		return normalized.ToLowerInvariant() switch
		{
			"n" or "no" or "nos." or "number" or "numbers" => "nos",
			"pc" or "pcs." or "piece" or "pieces" => "pcs",
			_ => normalized
		};
	}

	private TallyPartyLedger ResolvePartyLedger(string orderNo, string partyName)
	{
		var customerLedgerPrefixes = GetStringListSetting("CustomerLedgerOrderPrefixes", "P");
		var usesCustomerLedger = _configuration.GetValue("TallySettings:AlwaysUseCustomerAsPartyLedger", false) ||
			customerLedgerPrefixes.Any(prefix => orderNo.StartsWith(prefix, StringComparison.OrdinalIgnoreCase));

		var partyLedgerName = usesCustomerLedger
			? partyName
			: GetTallySetting("DefaultPartyLedgerName", "Website Order CC Avenue - MOTO");

		var salesLedgerName = usesCustomerLedger
			? GetTallySetting("BusinessSalesLedgerName", "A SALES MH (BUSINESS)")
			: GetTallySetting("ConsumerSalesLedgerName", "A SALES MH (CONSUMER)");

		return new TallyPartyLedger(partyLedgerName, salesLedgerName, usesCustomerLedger);
	}

	private TallyAmounts CalculateTallyAmounts(ResellerPendingOrder order, string placeOfSupply, string companyStateName)
	{
		var gstRatePercent = GetDecimalSetting("GstRatePercent", 18m);
		var addGstLedgers = _configuration.GetValue("TallySettings:AddGstLedgers", true);
		var itemRatesIncludeGst = _configuration.GetValue("TallySettings:ItemRatesIncludeGst", true);
		var shippingChargesAreTaxable = _configuration.GetValue("TallySettings:ShippingChargesAreTaxable", true);
		var shippingChargesIncludeGst = _configuration.GetValue("TallySettings:ShippingChargesIncludeGst", false);
		var roundOffOrders = _configuration.GetValue("TallySettings:RoundOffResellerOrders", true);
		var gstMultiplier = 1 + (gstRatePercent / 100m);

		var lines = order.Items.Select(item =>
		{
			var unit = NormalizeTallyUnit(item.Unit);
			var inclusiveRate = itemRatesIncludeGst ? item.Rate : RoundMoney(item.Rate * gstMultiplier);
			var baseRate = itemRatesIncludeGst && gstMultiplier > 0 ? RoundMoney(item.Rate / gstMultiplier) : item.Rate;
			var amount = RoundMoney(baseRate * item.Quantity);

			return new TallyInventoryLine(
				item,
				NormalizeConfigValue(item.StockItemName, item.Sku),
				unit,
				baseRate,
				inclusiveRate,
				amount);
		}).ToList();

		var itemBaseTotal = RoundMoney(lines.Sum(line => line.Amount));
		var rawShipping = Math.Max(order.CompositeShippingCharges, 0);
		var shippingBase = shippingChargesIncludeGst && gstMultiplier > 0 ? RoundMoney(rawShipping / gstMultiplier) : rawShipping;
		var taxableAmount = itemBaseTotal + (shippingChargesAreTaxable ? shippingBase : 0);
		var totalTax = addGstLedgers ? RoundMoney(taxableAmount * gstRatePercent / 100m) : 0;
		var isIntraState = string.Equals(NormalizeKey(placeOfSupply), NormalizeKey(companyStateName), StringComparison.OrdinalIgnoreCase);
		var integratedTax = isIntraState ? 0 : totalTax;
		var centralTax = isIntraState ? RoundMoney(totalTax / 2m) : 0;
		var stateTax = isIntraState ? RoundMoney(totalTax - centralTax) : 0;
		var subtotal = RoundMoney(itemBaseTotal + shippingBase + integratedTax + centralTax + stateTax);
		var grandTotal = roundOffOrders ? Math.Round(subtotal, 0, MidpointRounding.AwayFromZero) : subtotal;
		var roundOff = RoundMoney(grandTotal - subtotal);

		return new TallyAmounts(lines, itemBaseTotal, shippingBase, integratedTax, centralTax, stateTax, roundOff, grandTotal);
	}

	private decimal GetDecimalSetting(string key, decimal fallback)
	{
		var value = _configuration[$"TallySettings:{key}"];
		return decimal.TryParse(value, NumberStyles.Number, CultureInfo.InvariantCulture, out var parsed) ? parsed : fallback;
	}

	private IEnumerable<string> GetStringListSetting(string key, string fallback)
	{
		return NormalizeConfigValue(_configuration[$"TallySettings:{key}"], fallback)
			.Split(new[] { ',', ';' }, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
	}

	private static XElement? CreateOptionalElement(string elementName, string? value)
	{
		return string.IsNullOrWhiteSpace(value) ? null : new XElement(elementName, value.Trim());
	}

	private static XElement? CreateGstRegistrationElement(string? registrationName, string? gstin)
	{
		return string.IsNullOrWhiteSpace(registrationName)
			? null
			: new XElement("GSTREGISTRATION",
				new XAttribute("TAXTYPE", "GST"),
				new XAttribute("TAXREGISTRATION", NormalizeConfigValue(gstin, registrationName.Trim())),
				registrationName.Trim());
	}

	private static string NormalizeConfigValue(string? value, string fallback)
	{
		return string.IsNullOrWhiteSpace(value) ? fallback : value.Trim();
	}

	private static string? NormalizeOptionalValue(string? value)
	{
		return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
	}

	private static string NormalizeOrderNo(string? value)
	{
		return string.IsNullOrWhiteSpace(value) ? string.Empty : value.Trim().ToUpperInvariant();
	}

	private static string NormalizeKey(string? value)
	{
		return string.IsNullOrWhiteSpace(value) ? string.Empty : value.Trim().ToUpperInvariant();
	}

	private static string FormatMoney(decimal value)
	{
		return value.ToString("0.00", CultureInfo.InvariantCulture);
	}

	private static string FormatQuantity(int quantity, string unit)
	{
		return $" {quantity.ToString("0.00", CultureInfo.InvariantCulture)} {unit}";
	}

	private static string FormatTallyDisplayDate(DateTime value)
	{
		return value.ToString("d-MMM-yy", CultureInfo.InvariantCulture);
	}

	private static decimal RoundMoney(decimal value)
	{
		return Math.Round(value, 2, MidpointRounding.AwayFromZero);
	}

	private sealed record TallyPartyLedger(string PartyLedgerName, string SalesLedgerName, bool UsesCustomerLedger);

	private sealed record TallyInventoryLine(
		ResellerOrderItem Item,
		string StockItemName,
		string Unit,
		decimal BaseRate,
		decimal InclusiveRate,
		decimal Amount);

	private sealed record TallyAmounts(
		List<TallyInventoryLine> Lines,
		decimal ItemBaseTotal,
		decimal ShippingBaseAmount,
		decimal IntegratedTaxAmount,
		decimal CentralTaxAmount,
		decimal StateTaxAmount,
		decimal RoundOffAmount,
		decimal GrandTotal);

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

	public async Task<List<StockItem>> GetStockItemsFromDefaultTemplateAsync()
	{
		var xmlFilePath = Path.Combine(_environment.ContentRootPath, "wwwroot", "TallyXML", "GetStockItem.xml");
		return await GetStockItem(xmlFilePath);
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
