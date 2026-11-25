using Microsoft.Extensions.Options;

namespace OurBloom.Api.Storage;

public class StorageOptions
{
    /// <summary>
    /// Dosyaların yazılacağı kök klasör. Göreli verilirse uygulama klasörüne göre çözülür.
    /// Kaynak koddaki "Storage" klasörüyle karışmasın diye varsayılan "App_Data"
    /// (Windows'ta klasör adları büyük/küçük harf ayırmaz).
    /// </summary>
    public string Root { get; set; } = "App_Data";
}

/// <summary>
/// Görsel depolama soyutlaması. Şimdilik yerel disk; ileride S3/Blob gibi bir servisle
/// değiştirmek için yalnızca bu arayüzün yeni bir uygulaması yazılır.
/// </summary>
public interface IFileStorage
{
    Task SaveAsync(string key, byte[] content, CancellationToken ct);
    Task<Stream?> OpenReadAsync(string key, CancellationToken ct);
    Task DeleteAsync(string key, CancellationToken ct);
    Task CopyAsync(string sourceKey, string targetKey, CancellationToken ct);
}

public sealed class LocalFileStorage : IFileStorage
{
    private readonly string _root;

    public LocalFileStorage(IOptions<StorageOptions> options, IWebHostEnvironment env)
    {
        var configured = options.Value.Root;
        _root = Path.GetFullPath(Path.IsPathRooted(configured)
            ? configured
            : Path.Combine(env.ContentRootPath, configured));
        Directory.CreateDirectory(_root);
    }

    public string RootPath => _root;

    public async Task SaveAsync(string key, byte[] content, CancellationToken ct)
    {
        var path = Resolve(key);
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        var temp = path + ".tmp";
        await File.WriteAllBytesAsync(temp, content, ct);
        File.Move(temp, path, overwrite: true);
    }

    public Task<Stream?> OpenReadAsync(string key, CancellationToken ct)
    {
        var path = Resolve(key);
        Stream? stream = File.Exists(path)
            ? new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.Read, 64 * 1024, useAsync: true)
            : null;
        return Task.FromResult(stream);
    }

    public Task DeleteAsync(string key, CancellationToken ct)
    {
        var path = Resolve(key);
        if (File.Exists(path)) File.Delete(path);
        return Task.CompletedTask;
    }

    public Task CopyAsync(string sourceKey, string targetKey, CancellationToken ct)
    {
        var source = Resolve(sourceKey);
        if (!File.Exists(source)) return Task.CompletedTask;
        var target = Resolve(targetKey);
        Directory.CreateDirectory(Path.GetDirectoryName(target)!);
        File.Copy(source, target, overwrite: true);
        return Task.CompletedTask;
    }

    private string Resolve(string key)
    {
        if (string.IsNullOrWhiteSpace(key) || key.Contains("..") || Path.IsPathRooted(key))
            throw new ArgumentException("Geçersiz dosya anahtarı.", nameof(key));
        var full = Path.GetFullPath(Path.Combine(_root, key));
        if (!full.StartsWith(_root, StringComparison.Ordinal))
            throw new ArgumentException("Geçersiz dosya anahtarı.", nameof(key));
        return full;
    }
}

public enum ImageKind { Jpeg, Png, Webp }

public static class ImageUpload
{
    public const int MaxPreviewBytes = 4 * 1024 * 1024;
    public const int MaxPhotoBytes = 10 * 1024 * 1024;

    public sealed record Result(byte[]? Bytes, ImageKind Kind, IResult? Error);

    /// <summary>
    /// Ham gövdeyi boyut sınırıyla okur ve içerik türünü dosyanın ilk baytlarından doğrular
    /// (Content-Type başlığına güvenilmez).
    /// </summary>
    public static async Task<Result> ReadAsync(HttpRequest request, int maxBytes, CancellationToken ct)
    {
        if (request.ContentLength is > 0 and var length && length > maxBytes)
            return new Result(null, default, Results.Problem(statusCode: 413, title: "Görsel çok büyük."));

        using var buffer = new MemoryStream();
        var chunk = new byte[81920];
        int read;
        while ((read = await request.Body.ReadAsync(chunk, ct)) > 0)
        {
            if (buffer.Length + read > maxBytes)
                return new Result(null, default, Results.Problem(statusCode: 413, title: "Görsel çok büyük."));
            buffer.Write(chunk, 0, read);
        }

        var bytes = buffer.ToArray();
        var kind = Detect(bytes);
        if (kind is null)
            return new Result(null, default, Results.Problem(statusCode: 415, title: "Yalnızca JPEG, PNG veya WebP yüklenebilir."));
        return new Result(bytes, kind.Value, null);
    }

    public static ImageKind? Detect(ReadOnlySpan<byte> b)
    {
        if (b.Length >= 3 && b[0] == 0xFF && b[1] == 0xD8 && b[2] == 0xFF) return ImageKind.Jpeg;
        if (b.Length >= 8 && b[..8].SequenceEqual(new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A }))
            return ImageKind.Png;
        if (b.Length >= 12 && b[..4].SequenceEqual("RIFF"u8) && b[8..12].SequenceEqual("WEBP"u8))
            return ImageKind.Webp;
        return null;
    }

    public static string Extension(ImageKind kind) => kind switch
    {
        ImageKind.Png => ".png",
        ImageKind.Webp => ".webp",
        _ => ".jpg",
    };

    public static string ContentTypeForKey(string key) => Path.GetExtension(key) switch
    {
        ".png" => "image/png",
        ".webp" => "image/webp",
        _ => "image/jpeg",
    };

    /// <summary>Korumalı görseli döndürür; URL sürüm içerdiği için tarayıcı önbelleği güvenle uzun tutulur.</summary>
    public static async Task<IResult> ServeAsync(IFileStorage storage, string? key, HttpContext http)
    {
        if (key is null) return Results.NotFound();
        var stream = await storage.OpenReadAsync(key, http.RequestAborted);
        if (stream is null) return Results.NotFound();
        http.Response.Headers.CacheControl = "private, max-age=2592000, immutable";
        return Results.Stream(stream, ContentTypeForKey(key));
    }
}
