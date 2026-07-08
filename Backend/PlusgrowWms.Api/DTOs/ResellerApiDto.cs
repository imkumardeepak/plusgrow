using System;
using System.Collections.Generic;
using System.Globalization;
using System.Text.Json;
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
        [JsonConverter(typeof(FlexibleStringJsonConverter))]
        public string OrderNo { get; set; } = string.Empty;

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
        [JsonConverter(typeof(FlexibleDecimalJsonConverter))]
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
        [JsonConverter(typeof(FlexibleLongJsonConverter))]
        public long Pincode { get; set; }

        [JsonPropertyName("contactNo")]
        [JsonConverter(typeof(FlexibleLongJsonConverter))]
        public long ContactNo { get; set; }
    }

    public class ResellerOrderItem
    {
        [JsonPropertyName("sku")]
        public string Sku { get; set; } = string.Empty;

        [JsonPropertyName("stockItemName")]
        public string StockItemName { get; set; } = string.Empty;

        [JsonPropertyName("unit")]
        public string Unit { get; set; } = string.Empty;

        [JsonPropertyName("quantity")]
        [JsonConverter(typeof(FlexibleIntJsonConverter))]
        public int Quantity { get; set; }

        [JsonPropertyName("rate")]
        [JsonConverter(typeof(FlexibleDecimalJsonConverter))]
        public decimal Rate { get; set; }
    }

    public class FlexibleStringJsonConverter : JsonConverter<string>
    {
        public override string Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            if (reader.TokenType == JsonTokenType.String)
            {
                return reader.GetString()?.Trim() ?? string.Empty;
            }

            if (reader.TokenType == JsonTokenType.Number)
            {
                if (reader.TryGetInt64(out var longValue))
                {
                    return longValue.ToString(CultureInfo.InvariantCulture);
                }

                if (reader.TryGetDecimal(out var decimalValue))
                {
                    return decimalValue.ToString("0.#############################", CultureInfo.InvariantCulture);
                }
            }

            return string.Empty;
        }

        public override void Write(Utf8JsonWriter writer, string value, JsonSerializerOptions options)
        {
            writer.WriteStringValue(value);
        }
    }

    public class FlexibleLongJsonConverter : JsonConverter<long>
    {
        public override long Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            if (reader.TokenType == JsonTokenType.Number)
            {
                if (reader.TryGetInt64(out var longValue))
                {
                    return longValue;
                }

                if (reader.TryGetDecimal(out var decimalValue))
                {
                    return ToLongOrDefault(decimalValue);
                }
            }

            if (reader.TokenType == JsonTokenType.String)
            {
                return ParseLongOrDefault(reader.GetString());
            }

            return 0;
        }

        public override void Write(Utf8JsonWriter writer, long value, JsonSerializerOptions options)
        {
            writer.WriteNumberValue(value);
        }

        private static long ParseLongOrDefault(string? value)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return 0;
            }

            var trimmed = value.Trim();
            if (long.TryParse(trimmed, NumberStyles.Integer | NumberStyles.AllowThousands, CultureInfo.InvariantCulture, out var longValue))
            {
                return longValue;
            }

            if (decimal.TryParse(trimmed, NumberStyles.Number, CultureInfo.InvariantCulture, out var decimalValue))
            {
                return ToLongOrDefault(decimalValue);
            }

            return 0;
        }

        private static long ToLongOrDefault(decimal value)
        {
            if (value < long.MinValue || value > long.MaxValue)
            {
                return 0;
            }

            return decimal.ToInt64(decimal.Truncate(value));
        }
    }

    public class FlexibleIntJsonConverter : JsonConverter<int>
    {
        public override int Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            var value = new FlexibleLongJsonConverter().Read(ref reader, typeof(long), options);
            return value is < int.MinValue or > int.MaxValue ? 0 : (int)value;
        }

        public override void Write(Utf8JsonWriter writer, int value, JsonSerializerOptions options)
        {
            writer.WriteNumberValue(value);
        }
    }

    public class FlexibleDecimalJsonConverter : JsonConverter<decimal>
    {
        public override decimal Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            if (reader.TokenType == JsonTokenType.Number && reader.TryGetDecimal(out var decimalValue))
            {
                return decimalValue;
            }

            if (reader.TokenType == JsonTokenType.String)
            {
                var value = reader.GetString();
                if (!string.IsNullOrWhiteSpace(value) &&
                    decimal.TryParse(value.Trim(), NumberStyles.Number, CultureInfo.InvariantCulture, out decimalValue))
                {
                    return decimalValue;
                }
            }

            return 0;
        }

        public override void Write(Utf8JsonWriter writer, decimal value, JsonSerializerOptions options)
        {
            writer.WriteNumberValue(value);
        }
    }
}
