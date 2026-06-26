using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PlusgrowWms.Api.Services;

namespace PlusgrowWms.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TallySyncController : BaseController
    {
        private readonly ITallySyncService _tallySyncService;

        public TallySyncController(ITallySyncService tallySyncService)
        {
            _tallySyncService = tallySyncService;
        }

        [HttpPost("sync-today")]
        public async Task<IActionResult> SyncToday(CancellationToken ct)
        {
            await _tallySyncService.SyncTodayVouchersAsync(ct);
            return Ok(Success<bool>(true, "Tally sync for today completed successfully."));
        }

        [HttpGet("skipped")]
        public async Task<IActionResult> GetSkippedOrders([FromQuery] bool includeResolved = false, CancellationToken ct = default)
        {
            var skipped = await _tallySyncService.GetSkippedOrdersAsync(includeResolved, ct);
            return Ok(Success(skipped));
        }

        [HttpPost("skipped/{id}/retry")]
        public async Task<IActionResult> RetrySkippedOrder(int id, CancellationToken ct)
        {
            try
            {
                var result = await _tallySyncService.RetrySkippedOrderAsync(id, ct);
                if (!result)
                    return base.BadRequest(Error<string>("Order already resolved or not found."));
                
                return Ok(Success<bool>(true, "Skipped order retried and imported successfully."));
            }
            catch (Exception ex)
            {
                return base.BadRequest(Error<string>(ex.Message));
            }
        }

        [HttpPost("skipped/{id}/dismiss")]
        public async Task<IActionResult> DismissSkippedOrder(int id, CancellationToken ct)
        {
            var result = await _tallySyncService.DismissSkippedOrderAsync(id, ct);
            if (!result)
                return base.BadRequest(Error<string>("Order already resolved or not found."));

            return Ok(Success<bool>(true, "Skipped order dismissed."));
        }
    }
}
