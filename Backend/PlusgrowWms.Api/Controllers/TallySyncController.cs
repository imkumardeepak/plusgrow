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
    }
}
