using Microsoft.EntityFrameworkCore;
using OurBloom.Api.Auth;

namespace OurBloom.Api.Data;

/// <summary>
/// İlk kurulum verisi. Kullanıcı tanımı (statik) ile şifre yönetimi (kalıcı, veritabanında) ayrıdır:
/// seed yalnızca eksik hesabı oluşturur, var olan hesabın şifresine hiçbir zaman dokunmaz.
/// </summary>
public static class SeedData
{
    public static readonly Guid SpaceId = Guid.Parse("6f1c2a4e-5b7d-4e1a-9c3f-2b8d7e6a1c05");

    private sealed record SeedUser(Guid Id, string Username, string DisplayName, string InitialPasswordHash);

    // İlk şifrelerin PBKDF2 (HMAC-SHA512, 100.000 tur, kullanıcıya özel rastgele tuz) özetleri.
    // Açık metin şifre kaynak kodda yer almaz. Yeni özet üretmek için:
    //   dotnet run -- hash-password
    private static readonly SeedUser[] InitialUsers =
    [
        new(Guid.Parse("0b7e3f52-1c64-4d8a-a1f0-6e2d9c4b8a11"), "emre", "Emre",
            "AQAAAAIAAYagAAAAEA6YSLTsmTHyVRN2PkGSKHZbmG4sUeUks5lIIzZKHb2Asvc96u6PrPhkkXbCxowj4w=="),
        new(Guid.Parse("4c9a1d27-8e35-4b6f-9d02-7a1e5f3c2b22"), "gozde", "Gözde",
            "AQAAAAIAAYagAAAAELiSzqVFeTfVhdWhPZJhacVr1RkpH97mKanRcfGUhljw49igM/W6G+BA3qWThj0VxA=="),
    ];

    public static async Task RunAsync(AppDbContext db, bool sampleContent, ILogger logger, CancellationToken ct = default)
    {
        var now = DateTimeOffset.UtcNow;

        var space = await db.SharedSpaces.FirstOrDefaultAsync(s => s.Id == SpaceId, ct);
        if (space is null)
        {
            space = new SharedSpace { Id = SpaceId, Name = "Emre & Gözde", CreatedAt = now };
            db.SharedSpaces.Add(space);
            await db.SaveChangesAsync(ct);
        }

        foreach (var seed in InitialUsers)
        {
            if (await db.Users.AnyAsync(u => u.Username == seed.Username, ct)) continue;

            db.Users.Add(new User
            {
                Id = seed.Id,
                Username = seed.Username,
                DisplayName = seed.DisplayName,
                PasswordHash = seed.InitialPasswordHash,
                SecurityStamp = SecurityStamp.New(),
                SharedSpaceId = SpaceId,
                CreatedAt = now,
            });
            logger.LogInformation("Başlangıç hesabı oluşturuldu: {Username}", seed.Username);
        }
        await db.SaveChangesAsync(ct);

        if (sampleContent && !space.SampleContentSeeded)
        {
            await AddSampleContentAsync(db, space, now, ct);
            space.SampleContentSeeded = true;
            await db.SaveChangesAsync(ct);
            logger.LogInformation("Örnek içerik eklendi.");
        }
    }

    /// <summary>Boş ekran yerine ilk açılışta görünecek, silinebilir birkaç örnek.</summary>
    private static async Task AddSampleContentAsync(AppDbContext db, SharedSpace space, DateTimeOffset now, CancellationToken ct)
    {
        var emre = await db.Users.FirstOrDefaultAsync(u => u.Username == "emre", ct);
        var gozde = await db.Users.FirstOrDefaultAsync(u => u.Username == "gozde", ct);
        if (emre is null || gozde is null) return;
        if (await db.Bouquets.AnyAsync(b => b.SharedSpaceId == space.Id, ct)) return;

        var firstSpring = NewBouquet(space.Id, emre.Id, "İlk Baharım", "Sana aldığım ilk çiçekleri unutmadım.",
            new DateOnly(2026, 11, 24), "handtied", "light", 7, now.AddMinutes(-30),
            [
                ("tulip", "#f4b6c2", 5, 38),
                ("hyacinth", "#8f9be0", 3, 30),
                ("daisy", "#ffffff", 4, 32),
            ],
            new BouquetPackaging { WrapMaterial = "white", WrapColor = "#f5f1ea", WrapShape = "layered", RibbonStyle = "satin", RibbonColor = "#d8a3a6", HasBow = true });

        var sunday = NewBouquet(space.Id, gozde.Id, "Pazar kahvaltısı", "Masada dursun diye sade bir şey istedim.",
            new DateOnly(2026, 11, 15), "minimal", "light", 3, now.AddMinutes(-90),
            [
                ("lavender", "#8e7cc3", 6, 44),
                ("daisy", "#ffffff", 3, 34),
                ("poppy", "#e0442e", 2, 40),
            ],
            new BouquetPackaging { WrapMaterial = "kraft", WrapColor = "#c49a6c", WrapShape = "cone", RibbonStyle = "twine", RibbonColor = "#b89a6e", HasBow = true });

        db.Bouquets.AddRange(firstSpring, sunday);

        db.Memories.Add(new Memory
        {
            Id = Guid.NewGuid(),
            SharedSpaceId = space.Id,
            AuthorId = emre.Id,
            Title = "Bahçemizin ilk günü",
            Body = "Bugün bu küçük bahçeyi kurduk. İlk buket burada dursun.",
            Date = DateOnly.FromDateTime(now.UtcDateTime),
            BouquetId = firstSpring.Id,
            CreatedAt = now.AddMinutes(-20),
            UpdatedAt = now.AddMinutes(-20),
        });

        db.Messages.Add(new Message
        {
            Id = Guid.NewGuid(),
            SharedSpaceId = space.Id,
            SenderId = emre.Id,
            RecipientId = gozde.Id,
            Body = "Bahçemiz hazır. İlk buketi sana bıraktım.",
            CreatedAt = now.AddMinutes(-15),
        });
    }

    private static Bouquet NewBouquet(
        Guid spaceId, Guid ownerId, string name, string note, DateOnly date, string shape, string greenery, int seed,
        DateTimeOffset createdAt, (string Type, string Color, int Count, double Stem)[] flowers, BouquetPackaging packaging)
    {
        var id = Guid.NewGuid();
        packaging.BouquetId = id;
        return new Bouquet
        {
            Id = id,
            SharedSpaceId = spaceId,
            OwnerId = ownerId,
            Name = name,
            Note = note,
            MemoryDate = date,
            Shape = shape,
            Greenery = greenery,
            LayoutSeed = seed,
            CreatedAt = createdAt,
            UpdatedAt = createdAt,
            Packaging = packaging,
            Flowers = flowers.Select((f, i) => new BouquetFlower
            {
                Id = Guid.NewGuid(),
                BouquetId = id,
                SortOrder = i,
                FlowerType = f.Type,
                Color = f.Color,
                Count = f.Count,
                StemLength = f.Stem,
                Size = 1,
                PositionRadius = 0.5,
            }).ToList(),
        };
    }
}
