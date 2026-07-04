using System;
using System.Collections.Generic;
using System.Globalization;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using PlusgrowWms.Api.DTOs;

namespace PlusgrowWms.Api.Services
{
    public class ResellerApiClient
    {
        private readonly HttpClient _httpClient;
        private readonly IConfiguration _configuration;
        private readonly ILogger<ResellerApiClient> _logger;
        private string? _cachedToken;

        public ResellerApiClient(HttpClient httpClient, IConfiguration configuration, ILogger<ResellerApiClient> logger)
        {
            _httpClient = httpClient;
            _configuration = configuration;
            _logger = logger;
            _httpClient.BaseAddress = new Uri(_configuration["ResellerApi:BaseUrl"] ?? "https://resellers.plusgrow.org/api/wms/");
            _httpClient.DefaultRequestHeaders.Accept.Clear();
            _httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        }

        public async Task<string> LoginAsync()
        {
            var email = _configuration["ResellerApi:Email"];
            var password = _configuration["ResellerApi:Password"];

            if (string.IsNullOrEmpty(email) || string.IsNullOrEmpty(password))
            {
                throw new InvalidOperationException("Reseller API credentials are not configured in appsettings.");
            }

            var request = new ResellerLoginRequest
            {
                Email = email,
                Password = password
            };

            var response = await _httpClient.PostAsJsonAsync("login", request);
            response.EnsureSuccessStatusCode();

            var loginResponse = await response.Content.ReadFromJsonAsync<ResellerLoginResponse>();
            if (loginResponse == null || string.IsNullOrEmpty(loginResponse.AccessToken))
            {
                throw new Exception("Failed to retrieve access token from Reseller API.");
            }

            _cachedToken = loginResponse.AccessToken;
            return _cachedToken;
        }

        public async Task<List<ResellerPendingOrder>> GetPendingOrdersAsync(string? token = null)
        {
            var accessToken = token ?? _cachedToken;
            if (string.IsNullOrEmpty(accessToken))
            {
                accessToken = await LoginAsync();
            }

            var requestUri = BuildPendingOrdersRequestUri();
            var request = new HttpRequestMessage(HttpMethod.Get, requestUri);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
            request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

            var response = await _httpClient.SendAsync(request);

            if (response.StatusCode == System.Net.HttpStatusCode.Unauthorized || 
                response.StatusCode == System.Net.HttpStatusCode.Forbidden)
            {
                // Token might be expired, retry once with a new token
                _logger.LogInformation("Reseller API token expired. Retrying login...");
                accessToken = await LoginAsync();
                request = new HttpRequestMessage(HttpMethod.Get, requestUri);
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
                request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
                response = await _httpClient.SendAsync(request);
            }

            response.EnsureSuccessStatusCode();

            var content = await response.Content.ReadAsStringAsync();
            // Handle the case where the API returns an empty response for no orders
            if (string.IsNullOrWhiteSpace(content))
            {
                return new List<ResellerPendingOrder>();
            }

            var orders = JsonSerializer.Deserialize<List<ResellerPendingOrder>>(content);
            return orders ?? new List<ResellerPendingOrder>();
        }

        private static string BuildPendingOrdersRequestUri()
        {
            var currentDate = DateTime.Today.ToString("dd/MM/yyyy", CultureInfo.InvariantCulture);
            return $"orders/pending?date={currentDate}";
        }
    }
}
