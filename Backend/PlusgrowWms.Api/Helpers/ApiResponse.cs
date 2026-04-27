using System.Text.Json.Serialization;

namespace PlusgrowWms.Api.Helpers;

/// <summary>
/// Generic API response wrapper for consistent API responses
/// </summary>
public class ApiResponse<T>
{
    [JsonPropertyName("success")]
    public bool Success { get; set; }

    [JsonPropertyName("message")]
    public string? Message { get; set; }

    [JsonPropertyName("data")]
    public T? Data { get; set; }

    [JsonPropertyName("errors")]
    public List<string>? Errors { get; set; }

    [JsonPropertyName("timestamp")]
    public DateTime Timestamp { get; set; } = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified);

    [JsonPropertyName("pagination")]
    public PaginationInfo? Pagination { get; set; }

    // Constructor
    public ApiResponse()
    {
    }

    public ApiResponse(T data, string? message = null)
    {
        Success = true;
        Data = data;
        Message = message;
    }

    // Success responses
    public static ApiResponse<T> SuccessResult(T data, string? message = null)
    {
        return new ApiResponse<T>
        {
            Success = true,
            Data = data,
            Message = message ?? "Operation completed successfully"
        };
    }

    public static ApiResponse<T> SuccessWithPagination(T data, int page, int pageSize, int total, string? message = null)
    {
        return new ApiResponse<T>
        {
            Success = true,
            Data = data,
            Message = message ?? "Operation completed successfully",
            Pagination = new PaginationInfo
            {
                Page = page,
                PageSize = pageSize,
                Total = total,
                TotalPages = (int)Math.Ceiling((double)total / pageSize)
            }
        };
    }

    // Error responses
    public static ApiResponse<T> ErrorResult(string message, List<string>? errors = null)
    {
        return new ApiResponse<T>
        {
            Success = false,
            Message = message,
            Errors = errors
        };
    }

    public static ApiResponse<T> NotFoundResult(string message = "Resource not found")
    {
        return new ApiResponse<T>
        {
            Success = false,
            Message = message
        };
    }

    public static ApiResponse<T> BadRequestResult(string message, List<string>? errors = null)
    {
        return new ApiResponse<T>
        {
            Success = false,
            Message = message,
            Errors = errors
        };
    }
}

/// <summary>
/// Pagination information
/// </summary>
public class PaginationInfo
{
    [JsonPropertyName("page")]
    public int Page { get; set; }

    [JsonPropertyName("pageSize")]
    public int PageSize { get; set; }

    [JsonPropertyName("total")]
    public int Total { get; set; }

    [JsonPropertyName("totalPages")]
    public int TotalPages { get; set; }

    [JsonPropertyName("hasNext")]
    public bool HasNext => Page < TotalPages;

    [JsonPropertyName("hasPrevious")]
    public bool HasPrevious => Page > 1;
}

/// <summary>
/// Non-generic version for void operations
/// </summary>
public class ApiResponse
{
    [JsonPropertyName("success")]
    public bool Success { get; set; }

    [JsonPropertyName("message")]
    public string? Message { get; set; }

    [JsonPropertyName("errors")]
    public List<string>? Errors { get; set; }

    [JsonPropertyName("timestamp")]
    public DateTime Timestamp { get; set; } = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified);

    public static ApiResponse Ok(string? message = null)
    {
        return new ApiResponse
        {
            Success = true,
            Message = message ?? "Operation completed successfully"
        };
    }

    public static ApiResponse Error(string message, List<string>? errors = null)
    {
        return new ApiResponse
        {
            Success = false,
            Message = message,
            Errors = errors
        };
    }
}
