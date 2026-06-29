using System.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using PlusgrowWms.Api.Data;
using PlusgrowWms.Api.DTOs;
using PlusgrowWms.Api.Helpers;
using PlusgrowWms.Api.Models;

namespace PlusgrowWms.Api.Controllers;

public class ExportPathConfigsController : BaseController
{
    private static readonly HashSet<string> ValidExportTypes =
        new(StringComparer.OrdinalIgnoreCase) { "WmsStock", "SelfProducts", "TallyStock", "DatabaseBackup" };

    private readonly PlusgrowDbContext _context;
    private readonly IConfiguration _config;

    public ExportPathConfigsController(PlusgrowDbContext context, IConfiguration config)
    {
        _context = context;
        _config = config;
    }

    // GET api/exportpathconfigs
    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<ExportPathConfig>>>> GetAll()
    {
        var configs = await _context.ExportPathConfigs
            .AsNoTracking()
            .OrderBy(x => x.ExportType)
            .ToListAsync();

        return Success(configs);
    }

    // GET api/exportpathconfigs/5
    [HttpGet("{id:int}")]
    public async Task<ActionResult<ApiResponse<ExportPathConfig>>> GetById(int id)
    {
        var config = await _context.ExportPathConfigs.FindAsync(id);
        if (config == null)
            return NotFound<ExportPathConfig>("Export path config not found.");

        return Success(config);
    }

    // POST api/exportpathconfigs
    [HttpPost]
    public async Task<ActionResult<ApiResponse<ExportPathConfig>>> Create([FromBody] CreateExportPathConfigDto dto)
    {
        if (!ValidExportTypes.Contains(dto.ExportType))
            return BadRequest<ExportPathConfig>($"Invalid ExportType '{dto.ExportType}'. Valid values: WmsStock, SelfProducts, TallyStock.");

        if (string.IsNullOrWhiteSpace(dto.FolderPath))
            return BadRequest<ExportPathConfig>("FolderPath is required.");

        var config = new ExportPathConfig
        {
            ExportType = dto.ExportType,
            FolderPath = dto.FolderPath.Trim(),
            FileName = string.IsNullOrWhiteSpace(dto.FileName) ? null : dto.FileName.Trim(),
            IsEnabled = dto.IsEnabled,
            CreatedAt = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified),
        };

        _context.ExportPathConfigs.Add(config);
        await _context.SaveChangesAsync();

        return Success(config, "Export path config created successfully.");
    }

    // PUT api/exportpathconfigs/5
    [HttpPut("{id:int}")]
    public async Task<ActionResult<ApiResponse<ExportPathConfig>>> Update(int id, [FromBody] CreateExportPathConfigDto dto)
    {
        var config = await _context.ExportPathConfigs.FindAsync(id);
        if (config == null)
            return NotFound<ExportPathConfig>("Export path config not found.");

        if (!ValidExportTypes.Contains(dto.ExportType))
            return BadRequest<ExportPathConfig>($"Invalid ExportType '{dto.ExportType}'. Valid values: WmsStock, SelfProducts, TallyStock.");

        if (string.IsNullOrWhiteSpace(dto.FolderPath))
            return BadRequest<ExportPathConfig>("FolderPath is required.");

        config.ExportType = dto.ExportType;
        config.FolderPath = dto.FolderPath.Trim();
        config.FileName = string.IsNullOrWhiteSpace(dto.FileName) ? null : dto.FileName.Trim();
        config.IsEnabled = dto.IsEnabled;

        await _context.SaveChangesAsync();

        return Success(config, "Export path config updated successfully.");
    }

    // DELETE api/exportpathconfigs/5
    [HttpDelete("{id:int}")]
    public async Task<ActionResult<ApiResponse>> Delete(int id)
    {
        var config = await _context.ExportPathConfigs.FindAsync(id);
        if (config == null)
            return NotFound("Export path config not found.");

        _context.ExportPathConfigs.Remove(config);
        await _context.SaveChangesAsync();

        return Ok("Export path config deleted successfully.");
    }

    // POST api/exportpathconfigs/5/trigger-backup
    [HttpPost("{id:int}/trigger-backup")]
    public async Task<ActionResult<ApiResponse<bool>>> TriggerBackup(int id)
    {
        var config = await _context.ExportPathConfigs.FindAsync(id);
        if (config == null || config.ExportType != "DatabaseBackup")
            return NotFound<bool>("Database backup config not found.");

        if (!config.IsEnabled)
            return BadRequest<bool>("This backup configuration is disabled.");

        try
        {
            var folder = config.FolderPath.Trim();
            if (!Directory.Exists(folder))
            {
                Directory.CreateDirectory(folder);
            }

            var fileName = string.IsNullOrWhiteSpace(config.FileName) 
                ? $"backup_{DateTime.Now:yyyyMMdd_HHmmss}.sql" 
                : config.FileName;
            
            var filePath = Path.Combine(folder, fileName);

            var connString = _config.GetConnectionString("DefaultConnection");
            if (string.IsNullOrEmpty(connString))
                return Error<bool>("Database connection string not found.");

            var builder = new NpgsqlConnectionStringBuilder(connString);
            var host = builder.Host;
            var port = builder.Port > 0 ? builder.Port : 5432;
            var database = builder.Database;
            var user = builder.Username;
            var password = builder.Password;

            var startInfo = new ProcessStartInfo
            {
                FileName = "pg_dump",
                Arguments = $"-h {host} -p {port} -U {user} -d {database} -F p -f \"{filePath}\"",
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };
            
            startInfo.EnvironmentVariables["PGPASSWORD"] = password;

            using var process = Process.Start(startInfo);
            if (process == null)
                return Error<bool>("Failed to start pg_dump process.");

            await process.WaitForExitAsync();

            if (process.ExitCode != 0)
            {
                var error = await process.StandardError.ReadToEndAsync();
                return Error<bool>($"Backup failed with exit code {process.ExitCode}: {error}");
            }

            return Success(true, "Database backup completed successfully.");
        }
        catch (Exception ex)
        {
            return Error<bool>($"Error executing backup: {ex.Message}");
        }
    }
}
