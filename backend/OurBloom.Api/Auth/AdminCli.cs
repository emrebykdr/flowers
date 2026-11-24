using System.Text;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using OurBloom.Api.Data;

namespace OurBloom.Api.Auth;

/// <summary>
/// Sunucu üzerinde çalıştırılan yönetici komutları. Web arayüzünde "şifremi unuttum" yok;
/// şifre unutulursa sunucuya erişimi olan kişi bu komutla sıfırlar.
///   dotnet run -- reset-password emre
///   dotnet run -- hash-password
/// </summary>
public static class AdminCli
{
    private static readonly string[] Commands = ["reset-password", "hash-password"];

    public static string? Detect(string[] args) =>
        args.Length > 0 && Commands.Contains(args[0]) ? args[0] : null;

    /// <summary>Komut adı ve konum argümanları host yapılandırmasına karışmasın.</summary>
    public static string[] HostArgs(string[] args) => args.Where(a => a.StartsWith("--")).ToArray();

    public static async Task<int> RunAsync(WebApplication app, string command, string[] args)
    {
        var hasher = app.Services.GetRequiredService<IPasswordHasher<User>>();

        if (command == "hash-password")
        {
            var password = ReadSecret("Şifre: ");
            if (password.Length == 0)
            {
                Console.Error.WriteLine("Boş şifre.");
                return 1;
            }
            Console.WriteLine(hasher.HashPassword(new User(), password));
            return 0;
        }

        var username = Usernames.Normalize(args.Skip(1).FirstOrDefault(a => !a.StartsWith("--")));
        if (username.Length == 0)
        {
            Console.Error.WriteLine("Kullanım: dotnet run -- reset-password <kullanici-adi>");
            return 1;
        }

        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await db.Database.MigrateAsync();

        var user = await db.Users.FirstOrDefaultAsync(u => u.Username == username);
        if (user is null)
        {
            Console.Error.WriteLine($"'{username}' adında kullanıcı yok.");
            return 1;
        }

        var first = ReadSecret("Yeni şifre: ");
        var second = ReadSecret("Yeni şifre (tekrar): ");
        if (first != second)
        {
            Console.Error.WriteLine("Şifreler eşleşmiyor, değişiklik yapılmadı.");
            return 1;
        }
        if (PasswordRules.Check(first, user.Username) is { } error)
        {
            Console.Error.WriteLine(error);
            return 1;
        }

        user.PasswordHash = hasher.HashPassword(user, first);
        user.SecurityStamp = SecurityStamp.New();
        user.PasswordChangedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync();
        Console.WriteLine($"{user.DisplayName} için şifre güncellendi. Açık oturumlar kapatıldı.");
        return 0;
    }

    private static string ReadSecret(string prompt)
    {
        Console.Write(prompt);
        if (Console.IsInputRedirected)
        {
            var line = Console.ReadLine() ?? "";
            Console.WriteLine();
            return line;
        }

        var sb = new StringBuilder();
        while (true)
        {
            var key = Console.ReadKey(intercept: true);
            if (key.Key == ConsoleKey.Enter) break;
            if (key.Key == ConsoleKey.Backspace)
            {
                if (sb.Length > 0) sb.Length--;
                continue;
            }
            if (!char.IsControl(key.KeyChar)) sb.Append(key.KeyChar);
        }
        Console.WriteLine();
        return sb.ToString();
    }
}
