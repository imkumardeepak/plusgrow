using Microsoft.AspNetCore.Mvc;
using PlusgrowWms.Api.Helpers;

namespace PlusgrowWms.Api.Controllers;

/// <summary>
/// Base controller with common API response methods
/// </summary>
[ApiController]
[Route("api/[controller]")]
public abstract class BaseController : ControllerBase
{
    /// <summary>
    /// Returns success response with data
    /// </summary>
    protected ApiResponse<T> Success<T>(T data, string? message = null)
    {
        return ApiResponse<T>.SuccessResult(data, message);
    }

    /// <summary>
    /// Returns success response with pagination
    /// </summary>
    protected ApiResponse<T> Success<T>(T data, int page, int pageSize, int total, string? message = null)
    {
        return ApiResponse<T>.SuccessWithPagination(data, page, pageSize, total, message);
    }

    /// <summary>
    /// Returns error response
    /// </summary>
    protected ApiResponse<T> Error<T>(string message, List<string>? errors = null)
    {
        return ApiResponse<T>.ErrorResult(message, errors);
    }

    /// <summary>
    /// Returns not found response
    /// </summary>
    protected ApiResponse<T> NotFound<T>(string message = "Resource not found")
    {
        return ApiResponse<T>.NotFoundResult(message);
    }

    /// <summary>
    /// Returns bad request response
    /// </summary>
    protected ApiResponse<T> BadRequest<T>(string message, List<string>? errors = null)
    {
        return ApiResponse<T>.BadRequestResult(message, errors);
    }

    /// <summary>
    /// Returns ok response (non-generic)
    /// </summary>
    protected ApiResponse Ok(string? message = null)
    {
        return ApiResponse.Ok(message);
    }

    /// <summary>
    /// Returns error response (non-generic)
    /// </summary>
    protected ApiResponse Error(string message, List<string>? errors = null)
    {
        return ApiResponse.Error(message, errors);
    }
}
