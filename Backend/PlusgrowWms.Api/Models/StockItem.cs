namespace TallyERPWebApi.Model
{
    public class StockItem
    {
        public string name { get; set; }
        public string alias { get; set; }
        public string GUID { get; set; } = "NA";
        public string unit { get; set; }
        public string category { get; set; }
        public double openingrate { get; set; }
        public int openingqnty { get; set; }
        public string hsncode { get; set; }
        public string partNo { get; set; }
        /// <summary>
        /// SKU code extracted from MAILINGNAME in Tally response.
        /// Falls back to partNo if MAILINGNAME is not available.
        /// </summary>
        public string skuCode { get; set; }
    }
}
