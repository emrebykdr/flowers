using System.Text.RegularExpressions;
using OurBloom.Api.Data;

namespace OurBloom.Api.Contracts;

/// <summary>Stüdyodaki seçeneklerin sunucu tarafındaki karşılığı. İstemci kataloğuyla aynı tutulmalı.</summary>
public static partial class BouquetCatalog
{
    public static readonly HashSet<string> FlowerTypes =
    [
        "rose", "tulip", "daisy", "orchid", "sunflower", "peony",
        "lily", "lavender", "hydrangea", "carnation", "hyacinth", "poppy",
    ];

    public static readonly HashSet<string> Shapes =
        ["round", "classic", "cascade", "handtied", "wild", "minimal", "grand"];

    public static readonly HashSet<string> Greenery = ["none", "light", "lush"];

    public static readonly HashSet<string> WrapMaterials = ["kraft", "white", "pink", "clear", "fabric", "none"];

    public static readonly HashSet<string> WrapShapes = ["cone", "layered", "open"];

    public static readonly HashSet<string> RibbonStyles = ["satin", "grosgrain", "twine", "none"];

    public const int MaxGroups = 24;
    public const int MaxStems = 60;
    public const int MaxPerGroup = 15;

    [GeneratedRegex("^#[0-9a-fA-F]{6}$")]
    public static partial Regex HexColor();
}

public static class BouquetDesignMapper
{
    public static Dictionary<string, string[]> Validate(SaveBouquetRequest request)
    {
        var errors = new Dictionary<string, string[]>();
        void Add(string key, string message) => errors[key] = [message];

        var name = request.Name?.Trim() ?? "";
        if (name.Length == 0) Add("name", "Buketine bir isim ver.");
        else if (name.Length > 80) Add("name", "İsim en fazla 80 karakter olabilir.");

        if (request.Note is { Length: > 600 }) Add("note", "Not en fazla 600 karakter olabilir.");

        if (request.MemoryDate is { } date && (date.Year < 1950 || date.Year > 2200))
            Add("memoryDate", "Geçerli bir tarih seç.");

        var design = request.Design;
        if (design is null)
        {
            Add("design", "Buket tasarımı eksik.");
            return errors;
        }

        if (design.Shape is null || !BouquetCatalog.Shapes.Contains(design.Shape))
            Add("design.shape", "Bilinmeyen buket şekli.");
        if (design.Greenery is null || !BouquetCatalog.Greenery.Contains(design.Greenery))
            Add("design.greenery", "Bilinmeyen yeşillik seçeneği.");

        var flowers = design.Flowers ?? [];
        if (flowers.Count == 0) Add("design.flowers", "Bukette en az bir çiçek olmalı.");
        if (flowers.Count > BouquetCatalog.MaxGroups)
            Add("design.flowers", $"En fazla {BouquetCatalog.MaxGroups} çiçek grubu eklenebilir.");

        var stems = 0;
        for (var i = 0; i < flowers.Count; i++)
        {
            var f = flowers[i];
            var key = $"design.flowers[{i}]";
            if (f.Type is null || !BouquetCatalog.FlowerTypes.Contains(f.Type)) Add(key, "Bilinmeyen çiçek türü.");
            if (f.Color is null || !BouquetCatalog.HexColor().IsMatch(f.Color)) Add(key, "Renk #RRGGBB biçiminde olmalı.");
            if (f.Count is < 1 or > BouquetCatalog.MaxPerGroup) Add(key, $"Bir grupta 1-{BouquetCatalog.MaxPerGroup} dal olabilir.");
            if (!InRange(f.StemLength, 20, 70)) Add(key, "Sap uzunluğu 20-70 cm arasında olmalı.");
            if (!InRange(f.Size, 0.5, 1.6)) Add(key, "Boyut aralık dışında.");
            if (!InRange(f.Tilt, -60, 60)) Add(key, "Eğim aralık dışında.");
            if (!InRange(f.Turn, -180, 180)) Add(key, "Yön aralık dışında.");
            var p = f.Placement;
            if (p is not null)
            {
                if (p.Mode is not ("auto" or "manual")) Add(key, "Yerleşim modu auto ya da manual olmalı.");
                if (!InRange(p.Angle, 0, 360) || !InRange(p.Radius, 0, 1) || !InRange(p.Height, -15, 20))
                    Add(key, "Konum değerleri aralık dışında.");
            }
            stems += Math.Max(0, f.Count);
        }
        if (stems > BouquetCatalog.MaxStems)
            Add("design.flowers", $"Bir bukette en fazla {BouquetCatalog.MaxStems} dal olabilir.");

        var pk = design.Packaging;
        if (pk is null)
        {
            Add("design.packaging", "Ambalaj bilgisi eksik.");
        }
        else
        {
            if (pk.WrapMaterial is null || !BouquetCatalog.WrapMaterials.Contains(pk.WrapMaterial))
                Add("design.packaging.wrapMaterial", "Bilinmeyen ambalaj.");
            if (pk.WrapShape is null || !BouquetCatalog.WrapShapes.Contains(pk.WrapShape))
                Add("design.packaging.wrapShape", "Bilinmeyen ambalaj şekli.");
            if (pk.RibbonStyle is null || !BouquetCatalog.RibbonStyles.Contains(pk.RibbonStyle))
                Add("design.packaging.ribbonStyle", "Bilinmeyen kurdele tipi.");
            if (pk.WrapColor is null || !BouquetCatalog.HexColor().IsMatch(pk.WrapColor))
                Add("design.packaging.wrapColor", "Ambalaj rengi #RRGGBB biçiminde olmalı.");
            if (pk.RibbonColor is null || !BouquetCatalog.HexColor().IsMatch(pk.RibbonColor))
                Add("design.packaging.ribbonColor", "Kurdele rengi #RRGGBB biçiminde olmalı.");
        }

        return errors;
    }

    private static bool InRange(double value, double min, double max) =>
        double.IsFinite(value) && value >= min - 1e-9 && value <= max + 1e-9;

    /// <summary>Doğrulanmış isteği varlığa yazar. Çiçek grupları baştan oluşturulur.</summary>
    public static void Apply(Bouquet bouquet, SaveBouquetRequest request, DateOnly today)
    {
        var design = request.Design!;
        bouquet.Name = request.Name!.Trim();
        bouquet.Note = string.IsNullOrWhiteSpace(request.Note) ? null : request.Note.Trim();
        bouquet.MemoryDate = request.MemoryDate ?? today;
        bouquet.Shape = design.Shape!;
        bouquet.Greenery = design.Greenery!;
        bouquet.LayoutSeed = design.Seed;

        bouquet.Flowers = design.Flowers!
            .Select((f, i) => new BouquetFlower
            {
                Id = Guid.NewGuid(),
                BouquetId = bouquet.Id,
                SortOrder = i,
                FlowerType = f.Type!,
                Color = f.Color!.ToLowerInvariant(),
                Count = f.Count,
                StemLength = Math.Round(f.StemLength, 2),
                Size = Math.Round(f.Size, 3),
                Tilt = Math.Round(f.Tilt, 2),
                Turn = Math.Round(f.Turn, 2),
                ManualPlacement = f.Placement?.Mode == "manual",
                PositionAngle = Math.Round(f.Placement?.Angle ?? 0, 2),
                PositionRadius = Math.Round(f.Placement?.Radius ?? 0.5, 3),
                PositionHeight = Math.Round(f.Placement?.Height ?? 0, 2),
            })
            .ToList();

        var pk = design.Packaging!;
        bouquet.Packaging ??= new BouquetPackaging { BouquetId = bouquet.Id };
        bouquet.Packaging.WrapMaterial = pk.WrapMaterial!;
        bouquet.Packaging.WrapColor = pk.WrapColor!.ToLowerInvariant();
        bouquet.Packaging.WrapShape = pk.WrapShape!;
        bouquet.Packaging.RibbonStyle = pk.RibbonStyle!;
        bouquet.Packaging.RibbonColor = pk.RibbonColor!.ToLowerInvariant();
        bouquet.Packaging.HasBow = pk.Bow;
    }

    public static BouquetDesignDto ToDesign(Bouquet b) => new(
        b.Shape,
        b.Greenery,
        b.LayoutSeed,
        b.Flowers.OrderBy(f => f.SortOrder).Select(f => new FlowerGroupDto(
            f.Id, f.FlowerType, f.Color, f.Count, f.StemLength, f.Size, f.Tilt, f.Turn,
            new FlowerPlacementDto(f.ManualPlacement ? "manual" : "auto", f.PositionAngle, f.PositionRadius, f.PositionHeight)))
            .ToList(),
        b.Packaging is null
            ? new PackagingDto("kraft", "#c9a27e", "layered", "satin", "#efe6dc", true)
            : new PackagingDto(b.Packaging.WrapMaterial, b.Packaging.WrapColor, b.Packaging.WrapShape,
                b.Packaging.RibbonStyle, b.Packaging.RibbonColor, b.Packaging.HasBow));
}
