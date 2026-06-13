using Microsoft.EntityFrameworkCore;
using PlusgrowWms.Api.Data;
using PlusgrowWms.Api.Models;

namespace PlusgrowWms.Api.Services;

public interface ITallySyncService
{
    Task SyncTodayVouchersAsync(CancellationToken ct = default);
}

public class TallySyncService : ITallySyncService
{
    private readonly TallyService _tallyService;
    private readonly PlusgrowDbContext _context;
    private readonly ILogger<TallySyncService> _logger;

    public TallySyncService(TallyService tallyService, PlusgrowDbContext context, ILogger<TallySyncService> logger)
    {
        _tallyService = tallyService;
        _context = context;
        _logger = logger;
    }

    public async Task SyncTodayVouchersAsync(CancellationToken ct = default)
    {
        var today = DateTime.Today;
        _logger.LogInformation("Tally sync started for {Date}", today.ToString("yyyy-MM-dd"));

        // Bail early if Tally is unreachable
        bool connected = await _tallyService.GetTestConnection();
        if (!connected)
        {
            _logger.LogWarning("Tally server unreachable — sync skipped.");
            return;
        }

        var vouchers = await _tallyService.GetVoucherByDateRangeAsync(today, today);

        int added = 0, updated = 0;
        var now = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified);

        foreach (var v in vouchers)
        {
            if (string.IsNullOrWhiteSpace(v.RemoteID) || v.RemoteID == "NA")
                continue;

            var existing = await _context.TallyVouchers
                .FirstOrDefaultAsync(x => x.RemoteId == v.RemoteID, ct);

            if (existing is null)
            {
                _context.TallyVouchers.Add(new TallyVoucher
                {
                    RemoteId      = v.RemoteID,
                    VoucherType   = v.VoucherType   ?? "NA",
                    VoucherDate   = v.Date          ?? "NA",
                    PartyName     = v.PartyName     ?? "NA",
                    AccountType   = v.AccountType   ?? "NA",
                    OverallAmount = v.overallamount ?? "NA",
                    Items         = v.Items ?? [],
                    SyncedAt      = now,
                    LastUpdatedAt = now,
                });
                added++;
            }
            else
            {
                existing.VoucherType   = v.VoucherType   ?? existing.VoucherType;
                existing.PartyName     = v.PartyName     ?? existing.PartyName;
                existing.AccountType   = v.AccountType   ?? existing.AccountType;
                existing.OverallAmount = v.overallamount ?? existing.OverallAmount;
                existing.Items         = v.Items ?? [];
                existing.LastUpdatedAt = now;
                updated++;
            }
        }

        await _context.SaveChangesAsync(ct);
        _logger.LogInformation("Tally sync done — {Added} added, {Updated} updated.", added, updated);
    }
}
