using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using OurBloom.Api.Auth;
using OurBloom.Api.Contracts;
using OurBloom.Api.Data;
using OurBloom.Api.Storage;

namespace OurBloom.Api.Endpoints;

public static class BouquetEndpoints
{
    public static void MapBouquetEndpoints(this IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/api/bouquets").RequireAuthorization();

        g.MapGet("/", ListAsync);
        g.MapGet("/{id:guid}", GetAsync);
        g.MapPost("/", CreateAsync);
        g.MapPut("/{id:guid}", UpdateAsync);
        g.MapDelete("/{id:guid}", DeleteAsync);
        g.MapPost("/{id:guid}/duplicate", DuplicateAsync);
        g.MapPut("/{id:guid}/preview", UploadPreviewAsync);
        g.MapGet("/{id:guid}/preview", GetPreviewAsync);
    }

    /// <summary>Yalnızca kullanıcının ortak alanındaki buketler; başka alanın verisi hiçbir sorguya girmez.</summary>
    private static IQueryable<Bouquet> InSpace(AppDbContext db, ClaimsPrincipal user) =>
        db.Bouquets.Where(b => b.SharedSpaceId == user.SpaceId());

    private static async Task<IResult> ListAsync(
        ClaimsPrincipal user, AppDbContext db, string? owner, string? q, string? sort, CancellationToken ct)
    {
        var me = user.UserId();
        var query = InSpace(db, user).AsNoTracking()
            .Include(b => b.Owner)
            .Include(b => b.Flowers)
            .AsSplitQuery();

        query = owner switch
        {
            "me" => query.Where(b => b.OwnerId == me),
            "partner" => query.Where(b => b.OwnerId != me),
            _ => query,
        };

        if (!string.IsNullOrWhiteSpace(q))
        {
            var pattern = "%" + EscapeLike(q.Trim()) + "%";
            query = query.Where(b => EF.Functions.ILike(b.Name, pattern, "\\"));
        }

        query = sort switch
        {
            "oldest" => query.OrderBy(b => b.MemoryDate).ThenBy(b => b.CreatedAt),
            "updated" => query.OrderByDescending(b => b.UpdatedAt),
            _ => query.OrderByDescending(b => b.MemoryDate).ThenByDescending(b => b.CreatedAt),
        };

        var items = await query.Take(300).ToListAsync(ct);
        return Results.Ok(items.Select(b => b.ToSummary(me)));
    }

    private static async Task<IResult> GetAsync(Guid id, ClaimsPrincipal user, AppDbContext db, CancellationToken ct)
    {
        var bouquet = await InSpace(db, user).AsNoTracking()
            .Include(b => b.Owner)
            .Include(b => b.Flowers)
            .Include(b => b.Packaging)
            .AsSplitQuery()
            .FirstOrDefaultAsync(b => b.Id == id, ct);

        return bouquet is null
            ? Results.NotFound()
            : Results.Ok(new BouquetDetailDto(bouquet.ToSummary(user.UserId()), BouquetDesignMapper.ToDesign(bouquet)));
    }

    private static async Task<IResult> CreateAsync(
        SaveBouquetRequest request, ClaimsPrincipal user, AppDbContext db, CancellationToken ct)
    {
        var errors = BouquetDesignMapper.Validate(request);
        if (errors.Count > 0) return Results.ValidationProblem(errors);

        var now = DateTimeOffset.UtcNow;
        var bouquet = new Bouquet
        {
            Id = Guid.NewGuid(),
            SharedSpaceId = user.SpaceId(),
            OwnerId = user.UserId(),
            CreatedAt = now,
            UpdatedAt = now,
        };
        BouquetDesignMapper.Apply(bouquet, request, DateOnly.FromDateTime(DateTime.Today));
        db.Bouquets.Add(bouquet);
        await db.SaveChangesAsync(ct);

        return Results.Created($"/api/bouquets/{bouquet.Id}", new { id = bouquet.Id });
    }

    private static async Task<IResult> UpdateAsync(
        Guid id, SaveBouquetRequest request, ClaimsPrincipal user, AppDbContext db, CancellationToken ct)
    {
        var bouquet = await InSpace(db, user)
            .Include(b => b.Flowers)
            .Include(b => b.Packaging)
            .AsSplitQuery()
            .FirstOrDefaultAsync(b => b.Id == id, ct);
        if (bouquet is null) return Results.NotFound();
        if (bouquet.OwnerId != user.UserId())
            return Results.Problem(statusCode: 403, title: "Bu buket sana ait değil. Kopyalayıp kendi tasarımın olarak düzenleyebilirsin.");

        var errors = BouquetDesignMapper.Validate(request);
        if (errors.Count > 0) return Results.ValidationProblem(errors);

        db.BouquetFlowers.RemoveRange(bouquet.Flowers);
        BouquetDesignMapper.Apply(bouquet, request, bouquet.MemoryDate);
        db.BouquetFlowers.AddRange(bouquet.Flowers);
        bouquet.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);

        return Results.Ok(new { id = bouquet.Id });
    }

    private static async Task<IResult> DeleteAsync(
        Guid id, ClaimsPrincipal user, AppDbContext db, IFileStorage storage, CancellationToken ct)
    {
        var bouquet = await InSpace(db, user).FirstOrDefaultAsync(b => b.Id == id, ct);
        if (bouquet is null) return Results.NotFound();
        if (bouquet.OwnerId != user.UserId())
            return Results.Problem(statusCode: 403, title: "Yalnızca kendi buketlerini silebilirsin.");

        var previewKey = bouquet.PreviewKey;
        db.Bouquets.Remove(bouquet);
        await db.SaveChangesAsync(ct);
        if (previewKey is not null) await storage.DeleteAsync(previewKey, ct);

        return Results.NoContent();
    }

    private static async Task<IResult> DuplicateAsync(
        Guid id, ClaimsPrincipal user, AppDbContext db, IFileStorage storage, CancellationToken ct)
    {
        var source = await InSpace(db, user).AsNoTracking()
            .Include(b => b.Flowers)
            .Include(b => b.Packaging)
            .AsSplitQuery()
            .FirstOrDefaultAsync(b => b.Id == id, ct);
        if (source is null) return Results.NotFound();

        var now = DateTimeOffset.UtcNow;
        var copyId = Guid.NewGuid();
        var name = source.Name.Length > 72 ? source.Name[..72] : source.Name;
        var copy = new Bouquet
        {
            Id = copyId,
            SharedSpaceId = source.SharedSpaceId,
            OwnerId = user.UserId(),
            Name = name + " (kopya)",
            Note = null,
            MemoryDate = DateOnly.FromDateTime(DateTime.Today),
            Shape = source.Shape,
            Greenery = source.Greenery,
            LayoutSeed = source.LayoutSeed,
            CopiedFromId = source.Id,
            CreatedAt = now,
            UpdatedAt = now,
            Flowers = source.Flowers.Select(f => new BouquetFlower
            {
                Id = Guid.NewGuid(),
                BouquetId = copyId,
                SortOrder = f.SortOrder,
                FlowerType = f.FlowerType,
                Color = f.Color,
                Count = f.Count,
                StemLength = f.StemLength,
                Size = f.Size,
                Tilt = f.Tilt,
                Turn = f.Turn,
                ManualPlacement = f.ManualPlacement,
                PositionAngle = f.PositionAngle,
                PositionRadius = f.PositionRadius,
                PositionHeight = f.PositionHeight,
            }).ToList(),
            Packaging = source.Packaging is null ? null : new BouquetPackaging
            {
                BouquetId = copyId,
                WrapMaterial = source.Packaging.WrapMaterial,
                WrapColor = source.Packaging.WrapColor,
                WrapShape = source.Packaging.WrapShape,
                RibbonStyle = source.Packaging.RibbonStyle,
                RibbonColor = source.Packaging.RibbonColor,
                HasBow = source.Packaging.HasBow,
            },
        };

        if (source.PreviewKey is not null)
        {
            var key = $"previews/{copyId:N}{Path.GetExtension(source.PreviewKey)}";
            await storage.CopyAsync(source.PreviewKey, key, ct);
            copy.PreviewKey = key;
            copy.PreviewVersion = 1;
        }

        db.Bouquets.Add(copy);
        await db.SaveChangesAsync(ct);
        return Results.Created($"/api/bouquets/{copyId}", new { id = copyId });
    }

    private static async Task<IResult> UploadPreviewAsync(
        Guid id, HttpRequest request, ClaimsPrincipal user, AppDbContext db, IFileStorage storage, CancellationToken ct)
    {
        var bouquet = await InSpace(db, user).FirstOrDefaultAsync(b => b.Id == id, ct);
        if (bouquet is null) return Results.NotFound();

        // Önizleme tasarımdan türetilir: sahibi her zaman günceller, eşi yalnızca eksikse üretebilir.
        if (bouquet.OwnerId != user.UserId() && bouquet.PreviewKey is not null)
            return Results.Problem(statusCode: 403, title: "Önizlemeyi yalnızca buketin sahibi değiştirebilir.");

        var upload = await ImageUpload.ReadAsync(request, ImageUpload.MaxPreviewBytes, ct);
        if (upload.Error is not null) return upload.Error;

        var key = $"previews/{bouquet.Id:N}{ImageUpload.Extension(upload.Kind)}";
        if (bouquet.PreviewKey is not null && bouquet.PreviewKey != key)
            await storage.DeleteAsync(bouquet.PreviewKey, ct);

        await storage.SaveAsync(key, upload.Bytes!, ct);
        bouquet.PreviewKey = key;
        bouquet.PreviewVersion++;
        await db.SaveChangesAsync(ct);

        return Results.Ok(new { previewUrl = Mapping.PreviewUrl(bouquet) });
    }

    private static async Task<IResult> GetPreviewAsync(
        Guid id, ClaimsPrincipal user, AppDbContext db, IFileStorage storage, HttpContext http, CancellationToken ct)
    {
        var key = await InSpace(db, user).AsNoTracking()
            .Where(b => b.Id == id)
            .Select(b => b.PreviewKey)
            .FirstOrDefaultAsync(ct);
        return await ImageUpload.ServeAsync(storage, key, http);
    }

    private static string EscapeLike(string value) =>
        value.Replace("\\", "\\\\").Replace("%", "\\%").Replace("_", "\\_");
}
