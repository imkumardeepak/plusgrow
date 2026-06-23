using Microsoft.AspNetCore.Mvc;
using PlusgrowWms.Api.Helpers;
using TallyERPWebApi.Model;

namespace PlusgrowWms.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class StockItemsController : BaseController
    {
        private readonly ILogger<StockItemsController> _logger;
        private readonly TallyService _tallyService;

        public StockItemsController(ILogger<StockItemsController> logger, TallyService tallyService)
        {
            _logger = logger;
            _tallyService = tallyService;
        }

        [HttpGet]
        public async Task<IActionResult> Get()
        {
            try
            {
                bool result = await _tallyService.GetTestConnection();
                if (!result)
                {
                    _logger.LogWarning("Tally Server is not running");
                    return NotFound(new ApiResponse<string>
                    {
                        Success = false,
                        Message = "Tally Server is not running!!!"
                    });
                }

                // Path to the XML file
                string xmlFilePath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "TallyXML", "GetStockItem.xml");

                // Check if the XML file exists
                if (!System.IO.File.Exists(xmlFilePath))
                {
                    _logger.LogWarning("The specified XML file does not exist: {FilePath}", xmlFilePath);
                    return NotFound(new ApiResponse<string>
                    {
                        Success = false,
                        Message = "The specified XML file does not exist."
                    });
                }
                // Get the current company from Tally
                List<StockItem> currentCompany = await _tallyService.GetStockItem(xmlFilePath);

                // Check if the result is valid
                if (currentCompany.Count == 0)
                {
                    _logger.LogWarning("The current company returned by Tally is null or empty.");
                    return NotFound(new ApiResponse<string>
                    {
                        Success = false,
                        Message = "No current company found in Tally."
                    });
                }

                _logger.LogInformation("Successfully fetched current company: {CurrentCompany}", currentCompany);

                // Return success response with company data
                return base.Ok(new ApiResponse<List<StockItem>>
                {
                    Success = true,
                    Message = "Current company fetched successfully.",
                    Data = currentCompany
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while fetching company information from Tally.");
                return StatusCode(500, new ApiResponse<string>
                {
                    Success = false,
                    Message = "An internal server error occurred. Please try again later."
                });
            }
        }
    }
}
