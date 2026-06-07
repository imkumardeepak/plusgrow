namespace TallyERPWebApi.Model
{
	public class Voucher
	{
		public string RemoteID { get; set; } = "NA";
		public string VoucherType { get; set; }
		public string Date { get; set; }
		public string PartyName { get; set; }
		public string AccountType { get; set; }
		public string overallamount { get; set; } = "NA";
		public List<ItemDetails> Items { get; set; }  // List of items

	}
	public class ItemDetails
	{
		public string StockItemName { get; set; }
		public string Rate { get; set; }
		public string Amount { get; set; }
		public string ActualQty { get; set; }
		public string Unit { get; set; } = "NA";
	}
}
