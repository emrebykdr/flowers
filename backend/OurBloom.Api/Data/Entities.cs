namespace OurBloom.Api.Data;

/// <summary>İki kişinin ortak alanı. Bütün içerik bir alana bağlıdır.</summary>
public class SharedSpace
{
    public Guid Id { get; set; }
    public string Name { get; set; } = "";
    /// <summary>Birlikte geçen günler sayacının başlangıcı.</summary>
    public DateOnly? TogetherSince { get; set; }
    public bool SampleContentSeeded { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public List<User> Members { get; set; } = [];
}

public class User
{
    public Guid Id { get; set; }
    public string Username { get; set; } = "";
    public string DisplayName { get; set; } = "";
    public string PasswordHash { get; set; } = "";
    /// <summary>Şifre değişince yenilenir; eski oturum çerezleri bununla geçersiz olur.</summary>
    public string SecurityStamp { get; set; } = "";
    public Guid SharedSpaceId { get; set; }
    public SharedSpace? SharedSpace { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? PasswordChangedAt { get; set; }
    public DateTimeOffset? LastLoginAt { get; set; }
}

public class Bouquet
{
    public Guid Id { get; set; }
    public Guid SharedSpaceId { get; set; }
    public Guid OwnerId { get; set; }
    public User? Owner { get; set; }

    public string Name { get; set; } = "";
    public string? Note { get; set; }
    /// <summary>Kullanıcının bukete verdiği tarih (varsayılan: tasarım günü).</summary>
    public DateOnly MemoryDate { get; set; }

    public string Shape { get; set; } = "classic";
    public string Greenery { get; set; } = "light";
    public int LayoutSeed { get; set; }

    public string? PreviewKey { get; set; }
    public int PreviewVersion { get; set; }

    public Guid? CopiedFromId { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public List<BouquetFlower> Flowers { get; set; } = [];
    public BouquetPackaging? Packaging { get; set; }
}

/// <summary>Buketteki bir çiçek grubu: aynı tür, aynı renk, aynı ayarlarla N dal.</summary>
public class BouquetFlower
{
    public Guid Id { get; set; }
    public Guid BouquetId { get; set; }
    public int SortOrder { get; set; }

    public string FlowerType { get; set; } = "";
    public string Color { get; set; } = "";
    public int Count { get; set; }
    /// <summary>Sap uzunluğu, cm.</summary>
    public double StemLength { get; set; }
    /// <summary>Çiçek başı ölçeği (1 = doğal boy).</summary>
    public double Size { get; set; }
    /// <summary>Dışa/içe eğim, derece.</summary>
    public double Tilt { get; set; }
    /// <summary>Baktığı yön için ek dönüş, derece.</summary>
    public double Turn { get; set; }

    public bool ManualPlacement { get; set; }
    /// <summary>Buket çevresindeki açı, derece (0-360).</summary>
    public double PositionAngle { get; set; }
    /// <summary>Merkezden uzaklık, 0-1.</summary>
    public double PositionRadius { get; set; }
    /// <summary>Yükseklik farkı, cm.</summary>
    public double PositionHeight { get; set; }
}

public class BouquetPackaging
{
    public Guid BouquetId { get; set; }
    public string WrapMaterial { get; set; } = "kraft";
    public string WrapColor { get; set; } = "#c9a27e";
    public string WrapShape { get; set; } = "layered";
    public string RibbonStyle { get; set; } = "satin";
    public string RibbonColor { get; set; } = "#efe6dc";
    public bool HasBow { get; set; } = true;
}

public class Memory
{
    public Guid Id { get; set; }
    public Guid SharedSpaceId { get; set; }
    public Guid AuthorId { get; set; }
    public User? Author { get; set; }

    public string Title { get; set; } = "";
    public string? Body { get; set; }
    public DateOnly Date { get; set; }

    public string? PhotoKey { get; set; }
    public int PhotoVersion { get; set; }

    public Guid? BouquetId { get; set; }
    public Bouquet? Bouquet { get; set; }

    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}

public class Message
{
    public Guid Id { get; set; }
    public Guid SharedSpaceId { get; set; }
    public Guid SenderId { get; set; }
    public User? Sender { get; set; }
    public Guid RecipientId { get; set; }
    public User? Recipient { get; set; }

    public string Body { get; set; } = "";
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? ReadAt { get; set; }
}
