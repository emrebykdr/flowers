using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.EntityFrameworkCore;
using OurBloom.Api.Data;

namespace OurBloom.Api.Auth;

public static class AuthConstants
{
    public const string Scheme = CookieAuthenticationDefaults.AuthenticationScheme;
    public const string CookieName = "ourbloom.session";
    public const string SpaceClaim = "space";
    public const string StampClaim = "stamp";
    public const string LoginRateLimit = "login";
    public const string SensitiveRateLimit = "sensitive";
}

public static class SecurityStamp
{
    public static string New() => Convert.ToHexString(RandomNumberGenerator.GetBytes(20));
}

public static class Sessions
{
    public static ClaimsPrincipal CreatePrincipal(User user)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Name, user.Username),
            new(AuthConstants.SpaceClaim, user.SharedSpaceId.ToString()),
            new(AuthConstants.StampClaim, user.SecurityStamp),
        };
        return new ClaimsPrincipal(new ClaimsIdentity(claims, AuthConstants.Scheme));
    }

    public static Task SignInAsync(HttpContext http, User user) =>
        http.SignInAsync(
            AuthConstants.Scheme,
            CreatePrincipal(user),
            new AuthenticationProperties { IsPersistent = true, AllowRefresh = true });

    /// <summary>
    /// Her istekte çerezdeki güvenlik damgasını veritabanıyla karşılaştırır.
    /// Şifre değişince damga yenilendiği için diğer cihazlardaki oturumlar düşer.
    /// </summary>
    public static async Task ValidatePrincipalAsync(CookieValidatePrincipalContext context)
    {
        var principal = context.Principal;
        var idValue = principal?.FindFirstValue(ClaimTypes.NameIdentifier);
        var stamp = principal?.FindFirstValue(AuthConstants.StampClaim);
        var space = principal?.FindFirstValue(AuthConstants.SpaceClaim);

        if (!Guid.TryParse(idValue, out var userId) || string.IsNullOrEmpty(stamp) || string.IsNullOrEmpty(space))
        {
            await RejectAsync(context);
            return;
        }

        var db = context.HttpContext.RequestServices.GetRequiredService<AppDbContext>();
        var current = await db.Users.AsNoTracking()
            .Where(u => u.Id == userId)
            .Select(u => new { u.SecurityStamp, u.SharedSpaceId })
            .FirstOrDefaultAsync(context.HttpContext.RequestAborted);

        if (current is null
            || !FixedTimeEquals(current.SecurityStamp, stamp)
            || current.SharedSpaceId.ToString() != space)
        {
            await RejectAsync(context);
        }
    }

    private static async Task RejectAsync(CookieValidatePrincipalContext context)
    {
        context.RejectPrincipal();
        await context.HttpContext.SignOutAsync(AuthConstants.Scheme);
    }

    private static bool FixedTimeEquals(string a, string b) =>
        CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(a), Encoding.UTF8.GetBytes(b));
}

public static class ClaimsPrincipalExtensions
{
    public static Guid UserId(this ClaimsPrincipal principal) =>
        Guid.Parse(principal.FindFirstValue(ClaimTypes.NameIdentifier)
                   ?? throw new InvalidOperationException("Oturumda kullanıcı yok."));

    public static Guid SpaceId(this ClaimsPrincipal principal) =>
        Guid.Parse(principal.FindFirstValue(AuthConstants.SpaceClaim)
                   ?? throw new InvalidOperationException("Oturumda ortak alan yok."));
}

public static class Usernames
{
    /// <summary>"Gözde" ya da " EMRE " gibi girişleri sistemdeki kullanıcı adına çevirir.</summary>
    public static string Normalize(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return "";
        var sb = new StringBuilder(value.Length);
        foreach (var ch in value.Trim())
        {
            sb.Append(ch switch
            {
                'ç' or 'Ç' => 'c',
                'ğ' or 'Ğ' => 'g',
                'ı' or 'I' or 'İ' => 'i',
                'ö' or 'Ö' => 'o',
                'ş' or 'Ş' => 's',
                'ü' or 'Ü' => 'u',
                _ => char.ToLowerInvariant(ch),
            });
        }
        return sb.ToString();
    }
}

public static class PasswordRules
{
    public const int MinLength = 8;
    public const int MaxLength = 128;

    private static readonly HashSet<string> Common = new(StringComparer.OrdinalIgnoreCase)
    {
        "12345678", "123456789", "1234567890", "87654321", "11111111", "00000000",
        "password", "password1", "qwertyuı", "qwertyui", "asdfghjk", "abcd1234",
        "sifre123", "şifre123", "parola12", "ourbloom", "iloveyou", "seniseviyorum",
    };

    /// <summary>Yeni şifre için sunucu tarafı kurallar. Hata yoksa null döner.</summary>
    public static string? Check(string? password, string username)
    {
        if (string.IsNullOrEmpty(password) || password.Length < MinLength)
            return $"Yeni şifre en az {MinLength} karakter olmalı.";
        if (password.Length > MaxLength)
            return $"Yeni şifre en fazla {MaxLength} karakter olabilir.";
        if (string.IsNullOrWhiteSpace(password))
            return "Şifre yalnızca boşluktan oluşamaz.";
        if (password.Distinct().Count() < 4)
            return "Şifre çok tekrarlı görünüyor, biraz daha karıştır.";
        if (Common.Contains(password))
            return "Bu şifre çok yaygın, başka bir şey seç.";
        if (username.Length > 0 && password.Contains(username, StringComparison.OrdinalIgnoreCase))
            return "Şifre kullanıcı adını içermemeli.";
        return null;
    }
}
