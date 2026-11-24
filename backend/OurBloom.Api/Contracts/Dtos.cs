namespace OurBloom.Api.Contracts;

public record UserDto(Guid Id, string Username, string DisplayName);

public record SpaceDto(Guid Id, string Name, DateOnly? TogetherSince);

public record SessionDto(UserDto User, UserDto? Partner, SpaceDto Space);

public record LoginRequest(string? Username, string? Password);

public record ChangePasswordRequest(string? CurrentPassword, string? NewPassword, string? ConfirmPassword);

public record UpdateProfileRequest(string? DisplayName);

public record UpdateSpaceRequest(string? Name, DateOnly? TogetherSince);

// ---- Buket tasarımı ----

public record FlowerPlacementDto(string? Mode, double Angle, double Radius, double Height);

public record FlowerGroupDto(
    Guid? Id,
    string? Type,
    string? Color,
    int Count,
    double StemLength,
    double Size,
    double Tilt,
    double Turn,
    FlowerPlacementDto? Placement);

public record PackagingDto(
    string? WrapMaterial,
    string? WrapColor,
    string? WrapShape,
    string? RibbonStyle,
    string? RibbonColor,
    bool Bow);

public record BouquetDesignDto(
    string? Shape,
    string? Greenery,
    int Seed,
    List<FlowerGroupDto>? Flowers,
    PackagingDto? Packaging);

public record SaveBouquetRequest(string? Name, string? Note, DateOnly? MemoryDate, BouquetDesignDto? Design);

public record FlowerSummaryDto(string Type, string Color, int Count);

public record BouquetSummaryDto(
    Guid Id,
    string Name,
    string? Note,
    DateOnly MemoryDate,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    UserDto Owner,
    bool IsMine,
    string? PreviewUrl,
    string Shape,
    int StemCount,
    List<FlowerSummaryDto> Flowers,
    Guid? CopiedFromId);

public record BouquetDetailDto(BouquetSummaryDto Summary, BouquetDesignDto Design);

// ---- Anılar ----

public record SaveMemoryRequest(string? Title, string? Body, DateOnly? Date, Guid? BouquetId);

public record MemoryBouquetDto(Guid Id, string Name, string? PreviewUrl);

public record MemoryDto(
    Guid Id,
    string Title,
    string? Body,
    DateOnly Date,
    DateTimeOffset CreatedAt,
    UserDto Author,
    bool IsMine,
    string? PhotoUrl,
    MemoryBouquetDto? Bouquet);

// ---- Mesajlar ----

public record SendMessageRequest(string? Body);

public record MessageDto(
    Guid Id,
    string Body,
    DateTimeOffset CreatedAt,
    DateTimeOffset? ReadAt,
    UserDto Sender,
    bool IsMine);

// ---- Ana sayfa ----

public record HomeDto(
    SessionDto Session,
    BouquetSummaryDto? LatestBouquet,
    List<MemoryDto> RecentMemories,
    MessageDto? LatestFromPartner,
    int UnreadCount,
    int BouquetCount,
    int MemoryCount);
