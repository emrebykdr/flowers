using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using OurBloom.Api.Auth;
using OurBloom.Api.Contracts;
using OurBloom.Api.Data;

namespace OurBloom.Api.Endpoints;

public static class MessageEndpoints
{
    public const int MaxLength = 500;

    public static void MapMessageEndpoints(this IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/api/messages").RequireAuthorization();

        g.MapGet("/", ListAsync);
        g.MapPost("/", SendAsync);
        g.MapPost("/read", MarkReadAsync);
        g.MapGet("/unread-count", async (ClaimsPrincipal user, AppDbContext db, CancellationToken ct) =>
        {
            var me = user.UserId();
            var count = await db.Messages.CountAsync(m => m.RecipientId == me && m.ReadAt == null, ct);
            return Results.Ok(new { count });
        });
        g.MapDelete("/{id:guid}", DeleteAsync);
    }

    private static async Task<IResult> ListAsync(
        ClaimsPrincipal user, AppDbContext db, DateTimeOffset? before, int? limit, CancellationToken ct)
    {
        var take = Math.Clamp(limit ?? 40, 1, 100);
        var query = db.Messages.AsNoTracking()
            .Include(m => m.Sender)
            .Where(m => m.SharedSpaceId == user.SpaceId());
        if (before is not null) query = query.Where(m => m.CreatedAt < before);

        var me = user.UserId();
        var items = await query.OrderByDescending(m => m.CreatedAt).Take(take + 1).ToListAsync(ct);
        var hasMore = items.Count > take;
        return Results.Ok(new
        {
            items = items.Take(take).Select(m => m.ToDto(me)),
            hasMore,
        });
    }

    private static async Task<IResult> SendAsync(
        SendMessageRequest request, ClaimsPrincipal user, AppDbContext db, CancellationToken ct)
    {
        var body = request.Body?.Trim() ?? "";
        if (body.Length == 0)
            return Results.ValidationProblem(new Dictionary<string, string[]> { ["body"] = ["Boş not gönderilemez."] });
        if (body.Length > MaxLength)
            return Results.ValidationProblem(new Dictionary<string, string[]> { ["body"] = [$"Not en fazla {MaxLength} karakter olabilir."] });

        var me = user.UserId();
        var spaceId = user.SpaceId();
        var partnerId = await db.Users
            .Where(u => u.SharedSpaceId == spaceId && u.Id != me)
            .Select(u => (Guid?)u.Id)
            .FirstOrDefaultAsync(ct);
        if (partnerId is null)
            return Results.Problem(statusCode: 409, title: "Ortak alanda not gönderilecek ikinci kişi yok.");

        var message = new Message
        {
            Id = Guid.NewGuid(),
            SharedSpaceId = spaceId,
            SenderId = me,
            RecipientId = partnerId.Value,
            Body = body,
            CreatedAt = DateTimeOffset.UtcNow,
        };
        db.Messages.Add(message);
        await db.SaveChangesAsync(ct);

        await db.Entry(message).Reference(m => m.Sender).LoadAsync(ct);
        return Results.Created($"/api/messages/{message.Id}", message.ToDto(me));
    }

    /// <summary>Bana gelen okunmamış notları okundu yapar. Okundu bilgisini yalnızca alıcı oluşturabilir.</summary>
    private static async Task<IResult> MarkReadAsync(ClaimsPrincipal user, AppDbContext db, CancellationToken ct)
    {
        var me = user.UserId();
        var now = DateTimeOffset.UtcNow;
        var updated = await db.Messages
            .Where(m => m.RecipientId == me && m.SharedSpaceId == user.SpaceId() && m.ReadAt == null)
            .ExecuteUpdateAsync(s => s.SetProperty(m => m.ReadAt, now), ct);
        return Results.Ok(new { updated });
    }

    private static async Task<IResult> DeleteAsync(Guid id, ClaimsPrincipal user, AppDbContext db, CancellationToken ct)
    {
        var message = await db.Messages.FirstOrDefaultAsync(m => m.Id == id && m.SharedSpaceId == user.SpaceId(), ct);
        if (message is null) return Results.NotFound();
        if (message.SenderId != user.UserId())
            return Results.Problem(statusCode: 403, title: "Yalnızca kendi notlarını silebilirsin.");

        db.Messages.Remove(message);
        await db.SaveChangesAsync(ct);
        return Results.NoContent();
    }
}
