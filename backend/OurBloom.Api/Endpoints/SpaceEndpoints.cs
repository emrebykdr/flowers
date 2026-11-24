using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using OurBloom.Api.Auth;
using OurBloom.Api.Contracts;
using OurBloom.Api.Data;

namespace OurBloom.Api.Endpoints;

public static class SpaceEndpoints
{
    public static void MapSpaceEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapPut("/api/space", async (UpdateSpaceRequest request, ClaimsPrincipal user, AppDbContext db, CancellationToken ct) =>
        {
            var name = request.Name?.Trim() ?? "";
            var errors = new Dictionary<string, string[]>();
            if (name.Length is < 1 or > 60) errors["name"] = ["Alan adı 1-60 karakter olmalı."];
            if (request.TogetherSince is { } since && (since.Year < 1950 || since > DateOnly.FromDateTime(DateTime.Today.AddDays(1))))
                errors["togetherSince"] = ["Başlangıç tarihi bugünden ileri olamaz."];
            if (errors.Count > 0) return Results.ValidationProblem(errors);

            var space = await db.SharedSpaces.FirstAsync(s => s.Id == user.SpaceId(), ct);
            space.Name = name;
            space.TogetherSince = request.TogetherSince;
            await db.SaveChangesAsync(ct);
            return Results.Ok(space.ToDto());
        }).RequireAuthorization();

        app.MapGet("/api/home", async (ClaimsPrincipal user, AppDbContext db, CancellationToken ct) =>
        {
            var me = user.UserId();
            var spaceId = user.SpaceId();

            var session = await AuthEndpoints.LoadSessionAsync(db, me, ct);
            if (session is null) return Results.Unauthorized();

            var latestBouquet = await db.Bouquets.AsNoTracking()
                .Include(b => b.Owner)
                .Include(b => b.Flowers)
                .AsSplitQuery()
                .Where(b => b.SharedSpaceId == spaceId)
                .OrderByDescending(b => b.CreatedAt)
                .FirstOrDefaultAsync(ct);

            var memories = await db.Memories.AsNoTracking()
                .Include(m => m.Author)
                .Include(m => m.Bouquet)
                .Where(m => m.SharedSpaceId == spaceId)
                .OrderByDescending(m => m.CreatedAt)
                .Take(3)
                .ToListAsync(ct);

            var latestFromPartner = await db.Messages.AsNoTracking()
                .Include(m => m.Sender)
                .Where(m => m.SharedSpaceId == spaceId && m.RecipientId == me)
                .OrderByDescending(m => m.CreatedAt)
                .FirstOrDefaultAsync(ct);

            var unread = await db.Messages.CountAsync(m => m.RecipientId == me && m.ReadAt == null, ct);
            var bouquetCount = await db.Bouquets.CountAsync(b => b.SharedSpaceId == spaceId, ct);
            var memoryCount = await db.Memories.CountAsync(m => m.SharedSpaceId == spaceId, ct);

            return Results.Ok(new HomeDto(
                session,
                latestBouquet?.ToSummary(me),
                memories.Select(m => m.ToDto(me)).ToList(),
                latestFromPartner?.ToDto(me),
                unread,
                bouquetCount,
                memoryCount));
        }).RequireAuthorization();
    }
}
