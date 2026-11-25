using System.Threading.RateLimiting;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using OurBloom.Api.Auth;
using OurBloom.Api.Data;
using OurBloom.Api.Endpoints;
using OurBloom.Api.Infrastructure;
using OurBloom.Api.Storage;

var cliCommand = AdminCli.Detect(args);
var builder = WebApplication.CreateBuilder(cliCommand is null ? args : AdminCli.HostArgs(args));
var config = builder.Configuration;

var connectionString = config.GetConnectionString("Default")
    ?? throw new InvalidOperationException("ConnectionStrings:Default tanımlı değil (ortam değişkeni: ConnectionStrings__Default).");

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString).UseSnakeCaseNamingConvention());

builder.Services.AddSingleton<IPasswordHasher<User>, PasswordHasher<User>>();
builder.Services.Configure<StorageOptions>(config.GetSection("Storage"));
builder.Services.AddSingleton<IFileStorage, LocalFileStorage>();
builder.Services.AddProblemDetails();

var storageSetting = config["Storage:Root"] ?? "App_Data";
var storageRoot = Path.GetFullPath(Path.IsPathRooted(storageSetting)
    ? storageSetting
    : Path.Combine(builder.Environment.ContentRootPath, storageSetting));

// Çerez şifreleme anahtarları diskte kalıcı; yoksa her yeniden başlatmada iki kişi de oturumdan düşerdi.
builder.Services.AddDataProtection()
    .SetApplicationName("OurBloom")
    .PersistKeysToFileSystem(new DirectoryInfo(Path.Combine(storageRoot, "keys")));

var requireSecureCookie = config.GetValue("Auth:RequireSecureCookie", !builder.Environment.IsDevelopment());

builder.Services.AddAuthentication(AuthConstants.Scheme)
    .AddCookie(AuthConstants.Scheme, options =>
    {
        options.Cookie.Name = AuthConstants.CookieName;
        options.Cookie.HttpOnly = true;
        options.Cookie.SameSite = SameSiteMode.Strict;
        options.Cookie.SecurePolicy = requireSecureCookie ? CookieSecurePolicy.Always : CookieSecurePolicy.SameAsRequest;
        options.Cookie.IsEssential = true;
        options.ExpireTimeSpan = TimeSpan.FromDays(30);
        options.SlidingExpiration = true;
        // API istemcisi: giriş sayfasına yönlendirme yerine düz durum kodu.
        options.Events.OnRedirectToLogin = context =>
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            return Task.CompletedTask;
        };
        options.Events.OnRedirectToAccessDenied = context =>
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            return Task.CompletedTask;
        };
        options.Events.OnValidatePrincipal = Sessions.ValidatePrincipalAsync;
    });
builder.Services.AddAuthorization();

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.OnRejected = async (context, ct) =>
    {
        await context.HttpContext.Response.WriteAsJsonAsync(
            new { title = "Çok fazla deneme yapıldı. Birkaç dakika sonra tekrar dene." }, ct);
    };
    options.AddPolicy(AuthConstants.LoginRateLimit, http => RateLimitPartition.GetFixedWindowLimiter(
        http.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions { PermitLimit = 8, Window = TimeSpan.FromMinutes(5), QueueLimit = 0 }));
    options.AddPolicy(AuthConstants.SensitiveRateLimit, http => RateLimitPartition.GetFixedWindowLimiter(
        http.User.Identity?.Name ?? http.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions { PermitLimit = 6, Window = TimeSpan.FromMinutes(10), QueueLimit = 0 }));
});

var behindProxy = config.GetValue("ReverseProxy:Enabled", false);
if (behindProxy)
{
    builder.Services.Configure<ForwardedHeadersOptions>(options =>
    {
        options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
        options.KnownIPNetworks.Clear();
        options.KnownProxies.Clear();
    });
}

builder.WebHost.ConfigureKestrel(kestrel => kestrel.Limits.MaxRequestBodySize = 12 * 1024 * 1024);

// Geliştirmede yalnızca yöntem, yol ve durum kodu loglanır; gövde (şifreler dahil) asla loglanmaz.
builder.Services.AddHttpLogging(options =>
{
    options.LoggingFields = Microsoft.AspNetCore.HttpLogging.HttpLoggingFields.RequestMethod
                            | Microsoft.AspNetCore.HttpLogging.HttpLoggingFields.RequestPath
                            | Microsoft.AspNetCore.HttpLogging.HttpLoggingFields.ResponseStatusCode
                            | Microsoft.AspNetCore.HttpLogging.HttpLoggingFields.Duration;
    options.CombineLogs = true;
});

var app = builder.Build();

if (cliCommand is not null)
    return await AdminCli.RunAsync(app, cliCommand, args);

if (behindProxy) app.UseForwardedHeaders();
if (app.Environment.IsDevelopment()) app.UseHttpLogging();
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler();
    app.UseHsts();
}

app.UseSecurityHeaders(strictCsp: !app.Environment.IsDevelopment());
app.UseDefaultFiles();
app.UseStaticFiles(new StaticFileOptions
{
    OnPrepareResponse = ctx =>
    {
        var path = ctx.Context.Request.Path;
        ctx.Context.Response.Headers.CacheControl = path.StartsWithSegments("/assets")
            ? "public, max-age=31536000, immutable"
            : "no-cache";
    },
});

app.UseCsrfHeaderCheck();
app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();

app.MapGet("/api/health", () => Results.Ok(new { status = "ok" })).AllowAnonymous();
app.MapAuthEndpoints();
app.MapSpaceEndpoints();
app.MapBouquetEndpoints();
app.MapMemoryEndpoints();
app.MapMessageEndpoints();
app.Map("/api/{**rest}", () => Results.NotFound());
app.MapFallbackToFile("index.html");

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("OurBloom.Seed");
    if (config.GetValue("Database:MigrateOnStartup", true))
        await db.Database.MigrateAsync();
    await SeedData.RunAsync(db, config.GetValue("Seed:SampleContent", true), logger);
}

await app.RunAsync();
return 0;
