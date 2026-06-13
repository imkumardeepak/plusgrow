namespace PlusgrowWms.Api.Services;

public class TallySyncBackgroundService : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromMinutes(2);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<TallySyncBackgroundService> _logger;

    public TallySyncBackgroundService(IServiceScopeFactory scopeFactory, ILogger<TallySyncBackgroundService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Tally background sync service started (interval: {Minutes} min).", Interval.TotalMinutes);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                // Scoped services (DbContext, TallyService) must be resolved per-iteration
                using var scope = _scopeFactory.CreateScope();
                var syncService = scope.ServiceProvider.GetRequiredService<ITallySyncService>();
                await syncService.SyncTodayVouchersAsync(stoppingToken);
            }
            catch (OperationCanceledException)
            {
                // Normal shutdown — don't log as error
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Tally background sync encountered an error.");
            }

            await Task.Delay(Interval, stoppingToken);
        }

        _logger.LogInformation("Tally background sync service stopped.");
    }
}
