using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace PlusgrowWms.Api.DTOs
{
    public class ResellerLoginRequest
    {
        [JsonPropertyName("email")]
        public string Email { get; set; } = string.Empty;

        [JsonPropertyName("password")]
        public string Password { get; set; } = string.Empty;
    }

    public class ResellerLoginResponse
    {
        [JsonPropertyName("message")]
        public string Message { get; set; } = string.Empty;

        [JsonPropertyName("token_type")]
        public string TokenType { get; set; } = string.Empty;

        [JsonPropertyName("access_token")]
        public string AccessToken { get; set; } = string.Empty;

        [JsonPropertyName("user")]
        public ResellerUser? User { get; set; }
    }

    public class ResellerUser
    {
        [JsonPropertyName("id")]
        public int Id { get; set; }

        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("email")]
        public string Email { get; set; } = string.Empty;
    }

    public class ResellerPendingOrder
    {
        [JsonPropertyName("orderNo")]
        public long OrderNo { get; set; }

        [JsonPropertyName("orderDate")]
        public string OrderDate { get; set; } = string.Empty; // DD/MM/YYYY

        [JsonPropertyName("voucherType")]
        public string VoucherType { get; set; } = string.Empty;

        [JsonPropertyName("commonCostCentre")]
        public string CommonCostCentre { get; set; } = string.Empty;

        [JsonPropertyName("billingAddress")]
        public ResellerAddress? BillingAddress { get; set; }

        [JsonPropertyName("shippingAddress")]
        public ResellerAddress? ShippingAddress { get; set; }

        [JsonPropertyName("compositeShippingCharges")]
        public decimal CompositeShippingCharges { get; set; }

        [JsonPropertyName("items")]
        public List<ResellerOrderItem> Items { get; set; } = new List<ResellerOrderItem>();
    }

    public class ResellerAddress
    {
        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("line1")]
        public string Line1 { get; set; } = string.Empty;

        [JsonPropertyName("line2")]
        public string Line2 { get; set; } = string.Empty;

        [JsonPropertyName("city")]
        public string City { get; set; } = string.Empty;

        [JsonPropertyName("state")]
        public string State { get; set; } = string.Empty;

        [JsonPropertyName("pincode")]
        public long Pincode { get; set; }

        [JsonPropertyName("contactNo")]
        public long ContactNo { get; set; }
    }

    public class ResellerOrderItem
    {
        [JsonPropertyName("sku")]
        public string Sku { get; set; } = string.Empty;

        [JsonPropertyName("quantity")]
        public int Quantity { get; set; }

        [JsonPropertyName("rate")]
        public decimal Rate { get; set; }
    }
}
