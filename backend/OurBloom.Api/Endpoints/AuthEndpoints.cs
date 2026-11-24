using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using OurBloom.Api.Auth;
using OurBloom.Api.Contracts;
using OurBloom.Api.Data;

namespace OurBloom.Api.Endpoints;

public static class AuthEndpoints
{
    public static void MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var auth = app.MapGroup("/api/auth");

        auth.MapPost("/login", LoginAsync)
            .AllowAnonymous()
            .RequireRateLimiting(AuthConstants.LoginRateLimit);

        auth.MapPost("/logout", async (HttpContext http) =>
        {
            await http.SignOutAsync(AuthConstants.Scheme);
            return Results.NoContent();
        }).AllowAnonymous();

        auth.MapGet("/me", async (ClaimsPrincipal principal, AppDbContext db, CancellationToken ct) =>
        {
            var session = await LoadSessionAsync(db, principal.UserId(), ct);
            return session is null ? Results.Unauthorized() : Results.Ok(session);
        }).RequireAuthorization();

        var account = app.MapGroup("/api/account").RequireAuthorization();

        account.MapPost("/password", ChangePasswordAsync)
            .RequireRateLimiting(AuthConstants.SensitiveRateLimit);

        account.MapPut("/profile", async (UpdateProfileRequest request, ClaimsPrincipal principal, AppDbContext db, CancellationToken ct) =>
        {
            var name = request.DisplayName?.Trim() ?? "";
            if (name.Length is < 1 or > 40)
                return Results.ValidationProblem(new Dictionary<string, string[]>
                {
                    ["displayName"] = ["Görünen ad 1-40 karakter olmalı."],
                });

            var user = await db.Users.FirstAsync(u => u.Id == principal.UserId(), ct);
            user.DisplayName = name;
            await db.SaveChangesAsync(ct);
            return Results.Ok(user.ToDto());
        });
    }

    private static async Task<IResult> LoginAsync(
        LoginRequest request,
        AppDbContext db,
        IPasswordHasher<User> hasher,
        HttpContext http,
        ILoggerFactory loggerFactory,
        CancellationToken ct)
    {
        var username = Usernames.Normalize(request.Username);
        var password = request.Password ?? "";
        var failure = Results.Problem(statusCode: StatusCodes.Status401Unauthorized, title: "Kullanıcı adı veya şifre hatalı.");

        if (username.Length == 0 || password.Length == 0 || password.Length > PasswordRules.MaxLength)
            return failure;

        var user = await db.Users.FirstOrDefaultAsync(u => u.Username == username, ct);
        if (user is null)
        {
            // Var olmayan kullanıcıda da aynı maliyette hash hesapla; yanıt süresi kullanıcı adını ele vermesin.
            hasher.HashPassword(new User(), password);
            return failure;
        }

        var verification = hasher.VerifyHashedPassword(user, user.PasswordHash, password);
        if (verification == PasswordVerificationResult.Failed)
        {
            // Şifrenin kendisi asla loglanmaz.
            loggerFactory.CreateLogger("OurBloom.Auth").LogWarning("Başarısız giriş denemesi: {Username}", username);
            return failure;
        }

        if (verification == PasswordVerificationResult.SuccessRehashNeeded)
            user.PasswordHash = hasher.HashPassword(user, password);

        user.LastLoginAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);
        await Sessions.SignInAsync(http, user);

        var session = await LoadSessionAsync(db, user.Id, ct);
        return Results.Ok(session);
    }

    private static async Task<IResult> ChangePasswordAsync(
        ChangePasswordRequest request,
        ClaimsPrincipal principal,
        AppDbContext db,
        IPasswordHasher<User> hasher,
        HttpContext http,
        CancellationToken ct)
    {
        var user = await db.Users.FirstAsync(u => u.Id == principal.UserId(), ct);
        var errors = new Dictionary<string, string[]>();

        if (string.IsNullOrEmpty(request.CurrentPassword))
            errors["currentPassword"] = ["Mevcut şifreni gir."];

        var ruleError = PasswordRules.Check(request.NewPassword, user.Username);
        if (ruleError is not null)
            errors["newPassword"] = [ruleError];

        if (request.NewPassword != request.ConfirmPassword)
            errors["confirmPassword"] = ["Yeni şifreler birbiriyle eşleşmiyor."];

        if (errors.Count > 0)
            return Results.ValidationProblem(errors);

        if (hasher.VerifyHashedPassword(user, user.PasswordHash, request.CurrentPassword!) == PasswordVerificationResult.Failed)
            return Results.ValidationProblem(new Dictionary<string, string[]>
            {
                ["currentPassword"] = ["Mevcut şifre yanlış."],
            });

        if (hasher.VerifyHashedPassword(user, user.PasswordHash, request.NewPassword!) != PasswordVerificationResult.Failed)
            return Results.ValidationProblem(new Dictionary<string, string[]>
            {
                ["newPassword"] = ["Yeni şifre mevcut şifrenle aynı olamaz."],
            });

        user.PasswordHash = hasher.HashPassword(user, request.NewPassword!);
        user.SecurityStamp = SecurityStamp.New();
        user.PasswordChangedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);

        // Damga değişti: diğer cihazlardaki oturumlar düşer, bu cihazın çerezi yeni damgayla yenilenir.
        await Sessions.SignInAsync(http, user);
        return Results.NoContent();
    }

    public static async Task<SessionDto?> LoadSessionAsync(AppDbContext db, Guid userId, CancellationToken ct)
    {
        var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user is null) return null;

        var space = await db.SharedSpaces.AsNoTracking().FirstOrDefaultAsync(s => s.Id == user.SharedSpaceId, ct);
        if (space is null) return null;

        var partner = await db.Users.AsNoTracking()
            .Where(u => u.SharedSpaceId == user.SharedSpaceId && u.Id != user.Id)
            .OrderBy(u => u.CreatedAt)
            .FirstOrDefaultAsync(ct);
        return new SessionDto(user.ToDto(), partner?.ToDto(), space.ToDto());
    }
}
