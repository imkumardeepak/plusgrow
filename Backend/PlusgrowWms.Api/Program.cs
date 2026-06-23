using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Serilog;
using FluentValidation;
using FluentValidation.AspNetCore;
using AutoMapper;
using Hangfire;
using Hangfire.PostgreSql;
using PlusgrowWms.Api.Configuration;
using PlusgrowWms.Api.Data;
using PlusgrowWms.Api.Hubs;
using PlusgrowWms.Api.Mappings;
using PlusgrowWms.Api.Repositories;
using PlusgrowWms.Api.Services;
using PlusgrowWms.Api.Validators;
using Swashbuckle.AspNetCore.Newtonsoft;

var logsPath = Path.Combine(Directory.GetCurrentDirectory(), "logs");
Directory.CreateDirectory(logsPath);

Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .WriteTo.File(
        Path.Combine(logsPath, "plusgrow-wms-.txt"),
        rollingInterval: RollingInterval.Day,
        retainedFileCountLimit: 7,
        outputTemplate: "{Timestamp:yyyy-MM-dd HH:mm:ss.fff zzz} [{Level:u3}] {Message:lj}{NewLine}{Exception}")
    .CreateLogger();

var builder = WebApplication.CreateBuilder(args);

// Add Serilog
builder.Host.UseSerilog();

// Configure PostgreSQL
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")!;
var dataSourceBuilder = new Npgsql.NpgsqlDataSourceBuilder(connectionString);
dataSourceBuilder.EnableDynamicJson();
var dataSource = dataSourceBuilder.Build();

builder.Services.AddSingleton(dataSource);

builder.Services.AddDbContext<PlusgrowDbContext>((sp, options) =>
{
    options.UseNpgsql(sp.GetRequiredService<Npgsql.NpgsqlDataSource>());
});

// Add repositories
builder.Services.AddScoped(typeof(IGenericRepository<>), typeof(GenericRepository<>));
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IRoleRepository, RoleRepository>();
builder.Services.AddScoped<IProductRepository, ProductRepository>();
builder.Services.AddScoped<IManufacturerRepository, ManufacturerRepository>();
builder.Services.AddScoped<IPartyRepository, PartyRepository>();
builder.Services.AddScoped<IImporterRepository, ImporterRepository>();
builder.Services.AddScoped<ICommodityRepository, CommodityRepository>();
builder.Services.AddScoped<IDashboardRepository, DashboardRepository>();
builder.Services.AddScoped<IBinRepository, BinRepository>();

// Add HttpContextAccessor for user info extraction
builder.Services.AddHttpContextAccessor();

// Add services
builder.Services.AddScoped<IAuditLogService, AuditLogService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IDatabaseSeeder, DatabaseSeeder>();
builder.Services.AddScoped<IStickerService, StickerService>();
builder.Services.AddScoped<IProductService, ProductService>();
builder.Services.AddScoped<IManufacturerService, ManufacturerService>();
builder.Services.AddScoped<IPartyService, PartyService>();
builder.Services.AddScoped<IImporterService, ImporterService>();
builder.Services.AddScoped<ICommodityService, CommodityService>();
builder.Services.AddScoped<IDashboardService, DashboardService>();
builder.Services.AddScoped<IBinService, BinService>();

// Add HttpClient for StickerService and TallyService
builder.Services.AddHttpClient();
builder.Services.AddHttpClient<TallyService>();

// Tally sync
builder.Services.AddScoped<ITallySyncService, TallySyncService>();

// Party stock export to Dropbox (recurring job writes each enabled party's "Mapped Products"
// Excel; per-party folder/file/enabled settings live in the parties table)
builder.Services.AddScoped<IPartyStockExportService, PartyStockExportService>();

// Hangfire (recurring jobs + dashboard)
builder.Services.AddHangfire(config =>
    config
        .SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
        .UseSimpleAssemblyNameTypeSerializer()
        .UseRecommendedSerializerSettings()
        .UsePostgreSqlStorage(options =>
            options.UseNpgsqlConnection(connectionString)));
builder.Services.AddHangfireServer();

// Add AutoMapper
builder.Services.AddAutoMapper(typeof(MappingProfile));

// Add FluentValidation
builder.Services.AddFluentValidationAutoValidation();
builder.Services.AddValidatorsFromAssemblyContaining<CreateUserValidator>();

// Configure JWT Authentication
var jwtKey = builder.Configuration["Jwt:Key"] ?? "ThisIsASecretKeyForPlusgrowWms123!";
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "PlusgrowWms";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "PlusgrowWms";

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtIssuer,
            ValidAudience = jwtAudience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                var path = context.HttpContext.Request.Path;

                if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs/notifications"))
                {
                    context.Token = accessToken;
                }

                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.FallbackPolicy = new AuthorizationPolicyBuilder()
        .RequireAuthenticatedUser()
        .Build();
});
builder.Services.AddSignalR();

// Add controllers with Newtonsoft
builder.Services.AddControllers()
    .AddNewtonsoftJson();

// Configure Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddSwaggerGenNewtonsoftSupport();

// Add CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? Array.Empty<string>();

        // If wildcard is present, allow all origins
        if (allowedOrigins.Contains("*"))
        {
            policy.AllowAnyOrigin()
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .WithExposedHeaders("*");
        }
        else
        {
            // Use specific origins from configuration
            policy.WithOrigins(allowedOrigins)
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials()
                  .SetPreflightMaxAge(TimeSpan.FromHours(1))
                  .WithExposedHeaders("*");
        }
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/swagger/v1/swagger.json", "Plusgrow WMS API V1");
        options.RoutePrefix = "swagger"; // Standard route is /swagger
    });
}

app.UseSerilogRequestLogging();

// Enable CORS before other middleware
app.UseCors("AllowFrontend");

app.UseHttpsRedirection();

app.UseAuthentication();

// Hangfire Dashboard — placed before UseAuthorization so the global
// FallbackPolicy doesn't block it. Hangfire uses its own auth filter.
app.UseHangfireDashboard("/hangfire", new DashboardOptions
{
    Authorization = new[] { new HangfireAuthorizationFilter() },
    DashboardTitle = "PlusGrow WMS - Background Jobs"
});

app.UseAuthorization();

// Handle OPTIONS requests for all routes
app.MapControllers().RequireCors("AllowFrontend");
app.MapHub<NotificationHub>("/hubs/notifications").RequireCors("AllowFrontend");

using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<PlusgrowDbContext>();

    var pendingMigrations = dbContext.Database.GetPendingMigrations().ToList();

    if (pendingMigrations.Any())
    {
        Log.Information("Applying {Count} pending migrations...", pendingMigrations.Count);
        await dbContext.Database.MigrateAsync();
    }

    var seeder = scope.ServiceProvider.GetRequiredService<IDatabaseSeeder>();
    await seeder.SeedAsync();
}

Log.Information("Plusgrow WMS API starting up...");

// Register Hangfire recurring jobs
var tallySyncEnabled = builder.Configuration.GetValue("TallySettings:TallySyncEnabled", false);
// Remove the previous 2-minute job id so it does not linger in Hangfire storage after the rename.
RecurringJob.RemoveIfExists("tally-sync-every-2-min");
if (tallySyncEnabled)
{
    RecurringJob.AddOrUpdate<ITallySyncService>(
        "tally-sync-every-10-min",
        service => service.SyncTodayVouchersAsync(CancellationToken.None),
        "*/10 * * * *"); // Every 10 minutes
}
else
{
    RecurringJob.RemoveIfExists("tally-sync-every-10-min");
}

// Party stock export -> Dropbox, every 10 minutes. Which parties actually export (and to where)
// is controlled per party on the Parties page, so the job is always scheduled.
RecurringJob.AddOrUpdate<IPartyStockExportService>(
    "party-stock-export-every-10-min",
    service => service.ExportAllAsync(CancellationToken.None),
    "*/10 * * * *"); // Every 10 minutes

app.Run();
