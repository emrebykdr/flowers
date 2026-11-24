using OurBloom.Api.Data;

namespace OurBloom.Api.Contracts;

public static class Mapping
{
    public static UserDto ToDto(this User u) => new(u.Id, u.Username, u.DisplayName);

    public static SpaceDto ToDto(this SharedSpace s) => new(s.Id, s.Name, s.TogetherSince);

    public static string? PreviewUrl(Bouquet b) =>
        b.PreviewKey is null ? null : $"/api/bouquets/{b.Id}/preview?v={b.PreviewVersion}";

    public static string? PhotoUrl(Memory m) =>
        m.PhotoKey is null ? null : $"/api/memories/{m.Id}/photo?v={m.PhotoVersion}";

    /// <summary>Owner ve Flowers yüklenmiş olmalı.</summary>
    public static BouquetSummaryDto ToSummary(this Bouquet b, Guid currentUserId) => new(
        b.Id,
        b.Name,
        b.Note,
        b.MemoryDate,
        b.CreatedAt,
        b.UpdatedAt,
        b.Owner!.ToDto(),
        b.OwnerId == currentUserId,
        PreviewUrl(b),
        b.Shape,
        b.Flowers.Sum(f => f.Count),
        b.Flowers.OrderBy(f => f.SortOrder).Select(f => new FlowerSummaryDto(f.FlowerType, f.Color, f.Count)).ToList(),
        b.CopiedFromId);

    /// <summary>Author ve (varsa) Bouquet yüklenmiş olmalı.</summary>
    public static MemoryDto ToDto(this Memory m, Guid currentUserId) => new(
        m.Id,
        m.Title,
        m.Body,
        m.Date,
        m.CreatedAt,
        m.Author!.ToDto(),
        m.AuthorId == currentUserId,
        PhotoUrl(m),
        m.Bouquet is null ? null : new MemoryBouquetDto(m.Bouquet.Id, m.Bouquet.Name, PreviewUrl(m.Bouquet)));

    /// <summary>Sender yüklenmiş olmalı.</summary>
    public static MessageDto ToDto(this Message m, Guid currentUserId) => new(
        m.Id,
        m.Body,
        m.CreatedAt,
        m.ReadAt,
        m.Sender!.ToDto(),
        m.SenderId == currentUserId);
}
