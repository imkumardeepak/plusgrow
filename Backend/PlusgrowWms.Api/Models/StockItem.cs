namespace TallyERPWebApi.Model
{
    public class StockItem
    {
        public string name { get; set; }
        /// <summary>
        /// SKU code extracted from MAILINGNAME in Tally response.
        /// </summary>
        public string skuCode { get; set; }
        /// <summary>
        /// Closing balance (stock quantity) from Tally.
        /// </summary>
        public decimal closingBalance { get; set; }
    }
}
