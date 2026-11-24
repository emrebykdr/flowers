using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using OurBloom.Api.Auth;
using OurBloom.Api.Contracts;
using OurBloom.Api.Data;
using OurBloom.Api.Storage;

namespace OurBloom.Api.Endpoints;

public static class MemoryEndpoints
{
    public static void MapMemoryEndpoints(this IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/api/memories").RequireAuthorization();

        g.MapGet("/", ListAsync);
        g.MapGet("/{id:guid}", GetAsync);
        g.MapPost("/", CreateAsync);
        g.MapPut("/{id:guid}", UpdateAsync);
        g.MapDelete("/{id:guid}", DeleteAsync);
        g.MapPut("/{id:guid}/photo", UploadPhotoAsync);
        g.MapDelete("/{id:guid}/photo", DeletePhotoAsync);
        g.MapGet("/{id:guid}/photo", GetPhotoAsync);
    }

    private static IQueryable<Memory> InSpace(AppDbContext db, ClaimsPrincipal user) =>
        db.Memories.Where(m => m.SharedSpaceId == user.SpaceId());

    private static async Task<IResult> ListAsync(
        ClaimsPrincipal user, AppDbContext db, string? q, string? sort, CancellationToken ct)
    {
        var query = InSpace(db, user).AsNoTracking()
            .Include(m => m.Author)
            .Include(m => m.Bouquet)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(q))
        {
            var pattern = "%" + q.Trim().Replace("\\", "\\\\").Replace("%", "\\%").Replace("_", "\\_") + "%";
            query = query.Where(m => EF.Functions.ILike(m.Title, pattern, "\\")
                                     || (m.Body != null && EF.Functions.ILike(m.Body, pattern, "\\")));
        }

        query = sort == "oldest"
            ? query.OrderBy(m => m.Date).ThenBy(m => m.CreatedAt)
            : query.OrderByDescending(m => m.Date).ThenByDescending(m => m.CreatedAt);

        var me = user.UserId();
        var items = await query.Take(300).ToListAsync(ct);
        return Results.Ok(items.Select(m => m.ToDto(me)));
    }

    private static async Task<IResult> GetAsync(Guid id, ClaimsPrincipal user, AppDbContext db, CancellationToken ct)
    {
        var memory = await InSpace(db, user).AsNoTracking()
            .Include(m => m.Author)
            .Include(m => m.Bouquet)
            .FirstOrDefaultAsync(m => m.Id == id, ct);
        return memory is null ? Results.NotFound() : Results.Ok(memory.ToDto(user.UserId()));
    }

    private static Dictionary<string, string[]> Validate(SaveMemoryRequest request)
    {
        var errors = new Dictionary<string, string[]>();
        var title = request.Title?.Trim() ?? "";
        if (title.Length == 0) errors["title"] = ["Anına kısa bir başlık ver."];
        else if (title.Length > 80) errors["title"] = ["Başlık en fazla 80 karakter olabilir."];
        if (request.Body is { Length: > 1500 }) errors["body"] = ["Metin en fazla 1500 karakter olabilir."];
        if (request.Date is null) errors["date"] = ["Bir tarih seç."];
        else if (request.Date.Value.Year is < 1950 or > 2200) errors["date"] = ["Geçerli bir tarih seç."];
        return errors;
    }

    private static async Task<string?> CheckBouquetAsync(SaveMemoryRequest request, ClaimsPrincipal user, AppDbContext db, CancellationToken ct)
    {
        if (request.BouquetId is null) return null;
        var exists = await db.Bouquets.AnyAsync(b => b.Id == request.BouquetId && b.SharedSpaceId == user.SpaceId(), ct);
        return exists ? null : "Seçilen buket bulunamadı.";
    }

    private static async Task<IResult> CreateAsync(
        SaveMemoryRequest request, ClaimsPrincipal user, AppDbContext db, CancellationToken ct)
    {
        var errors = Validate(request);
        if (await CheckBouquetAsync(request, user, db, ct) is { } bouquetError) errors["bouquetId"] = [bouquetError];
        if (errors.Count > 0) return Results.ValidationProblem(errors);

        var now = DateTimeOffset.UtcNow;
        var memory = new Memory
        {
            Id = Guid.NewGuid(),
            SharedSpaceId = user.SpaceId(),
            AuthorId = user.UserId(),
            Title = request.Title!.Trim(),
            Body = string.IsNullOrWhiteSpace(request.Body) ? null : request.Body.Trim(),
            Date = request.Date!.Value,
            BouquetId = request.BouquetId,
            CreatedAt = now,
            UpdatedAt = now,
        };
        db.Memories.Add(memory);
        await db.SaveChangesAsync(ct);
        return Results.Created($"/api/memories/{memory.Id}", new { id = memory.Id });
    }

    private static async Task<IResult> UpdateAsync(
        Guid id, SaveMemoryRequest request, ClaimsPrincipal user, AppDbContext db, CancellationToken ct)
    {
        var memory = await InSpace(db, user).FirstOrDefaultAsync(m => m.Id == id, ct);
        if (memory is null) return Results.NotFound();
        if (memory.AuthorId != user.UserId())
            return Results.Problem(statusCode: 403, title: "Bu anıyı yalnızca yazan kişi düzenleyebilir.");

        var errors = Validate(request);
        if (await CheckBouquetAsync(request, user, db, ct) is { } bouquetError) errors["bouquetId"] = [bouquetError];
        if (errors.Count > 0) return Results.ValidationProblem(errors);

        memory.Title = request.Title!.Trim();
        memory.Body = string.IsNullOrWhiteSpace(request.Body) ? null : request.Body.Trim();
        memory.Date = request.Date!.Value;
        memory.BouquetId = request.BouquetId;
        memory.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);
        return Results.Ok(new { id = memory.Id });
    }

    private static async Task<IResult> DeleteAsync(
        Guid id, ClaimsPrincipal user, AppDbContext db, IFileStorage storage, CancellationToken ct)
    {
        var memory = await InSpace(db, user).FirstOrDefaultAsync(m => m.Id == id, ct);
        if (memory is null) return Results.NotFound();
        if (memory.AuthorId != user.UserId())
            return Results.Problem(statusCode: 403, title: "Bu anıyı yalnızca yazan kişi silebilir.");

        var photoKey = memory.PhotoKey;
        db.Memories.Remove(memory);
        await db.SaveChangesAsync(ct);
        if (photoKey is not null) await storage.DeleteAsync(photoKey, ct);
        return Results.NoContent();
    }

    private static async Task<IResult> UploadPhotoAsync(
        Guid id, HttpRequest request, ClaimsPrincipal user, AppDbContext db, IFileStorage storage, CancellationToken ct)
    {
        var memory = await InSpace(db, user).FirstOrDefaultAsync(m => m.Id == id, ct);
        if (memory is null) return Results.NotFound();
        if (memory.AuthorId != user.UserId())
            return Results.Problem(statusCode: 403, title: "Fotoğrafı yalnızca anıyı yazan kişi değiştirebilir.");

        var upload = await ImageUpload.ReadAsync(request, ImageUpload.MaxPhotoBytes, ct);
        if (upload.Error is not null) return upload.Error;

        var key = $"photos/{memory.Id:N}{ImageUpload.Extension(upload.Kind)}";
        if (memory.PhotoKey is not null && memory.PhotoKey != key)
            await storage.DeleteAsync(memory.PhotoKey, ct);

        await storage.SaveAsync(key, upload.Bytes!, ct);
        memory.PhotoKey = key;
        memory.PhotoVersion++;
        memory.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);
        return Results.Ok(new { photoUrl = Mapping.PhotoUrl(memory) });
    }

    private static async Task<IResult> DeletePhotoAsync(
        Guid id, ClaimsPrincipal user, AppDbContext db, IFileStorage storage, CancellationToken ct)
    {
        var memory = await InSpace(db, user).FirstOrDefaultAsync(m => m.Id == id, ct);
        if (memory is null) return Results.NotFound();
        if (memory.AuthorId != user.UserId())
            return Results.Problem(statusCode: 403, title: "Fotoğrafı yalnızca anıyı yazan kişi kaldırabilir.");

        if (memory.PhotoKey is not null)
        {
            await storage.DeleteAsync(memory.PhotoKey, ct);
            memory.PhotoKey = null;
            memory.UpdatedAt = DateTimeOffset.UtcNow;
            await db.SaveChangesAsync(ct);
        }
        return Results.NoContent();
    }

    private static async Task<IResult> GetPhotoAsync(
        Guid id, ClaimsPrincipal user, AppDbContext db, IFileStorage storage, HttpContext http, CancellationToken ct)
    {
        var key = await InSpace(db, user).AsNoTracking()
            .Where(m => m.Id == id)
            .Select(m => m.PhotoKey)
            .FirstOrDefaultAsync(ct);
        return await ImageUpload.ServeAsync(storage, key, http);
    }
}
