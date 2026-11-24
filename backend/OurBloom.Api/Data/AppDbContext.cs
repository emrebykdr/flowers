using Microsoft.EntityFrameworkCore;

namespace OurBloom.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<SharedSpace> SharedSpaces => Set<SharedSpace>();
    public DbSet<User> Users => Set<User>();
    public DbSet<Bouquet> Bouquets => Set<Bouquet>();
    public DbSet<BouquetFlower> BouquetFlowers => Set<BouquetFlower>();
    public DbSet<BouquetPackaging> BouquetPackagings => Set<BouquetPackaging>();
    public DbSet<Memory> Memories => Set<Memory>();
    public DbSet<Message> Messages => Set<Message>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<SharedSpace>(e =>
        {
            e.Property(x => x.Name).HasMaxLength(60).IsRequired();
        });

        b.Entity<User>(e =>
        {
            e.HasIndex(x => x.Username).IsUnique();
            e.Property(x => x.Username).HasMaxLength(32).IsRequired();
            e.Property(x => x.DisplayName).HasMaxLength(40).IsRequired();
            e.Property(x => x.PasswordHash).HasMaxLength(512).IsRequired();
            e.Property(x => x.SecurityStamp).HasMaxLength(64).IsRequired();
            e.HasOne(x => x.SharedSpace)
                .WithMany(x => x.Members)
                .HasForeignKey(x => x.SharedSpaceId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        b.Entity<Bouquet>(e =>
        {
            e.Property(x => x.Name).HasMaxLength(80).IsRequired();
            e.Property(x => x.Note).HasMaxLength(600);
            e.Property(x => x.Shape).HasMaxLength(16).IsRequired();
            e.Property(x => x.Greenery).HasMaxLength(16).IsRequired();
            e.Property(x => x.PreviewKey).HasMaxLength(200);
            e.HasIndex(x => new { x.SharedSpaceId, x.MemoryDate });
            e.HasIndex(x => new { x.SharedSpaceId, x.OwnerId });
            e.HasOne<SharedSpace>()
                .WithMany()
                .HasForeignKey(x => x.SharedSpaceId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Owner)
                .WithMany()
                .HasForeignKey(x => x.OwnerId)
                .OnDelete(DeleteBehavior.Restrict);
            e.HasMany(x => x.Flowers)
                .WithOne()
                .HasForeignKey(x => x.BouquetId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Packaging)
                .WithOne()
                .HasForeignKey<BouquetPackaging>(x => x.BouquetId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<BouquetFlower>(e =>
        {
            e.Property(x => x.FlowerType).HasMaxLength(24).IsRequired();
            e.Property(x => x.Color).HasMaxLength(7).IsRequired();
            e.HasIndex(x => new { x.BouquetId, x.SortOrder });
        });

        b.Entity<BouquetPackaging>(e =>
        {
            e.HasKey(x => x.BouquetId);
            e.Property(x => x.WrapMaterial).HasMaxLength(16).IsRequired();
            e.Property(x => x.WrapColor).HasMaxLength(7).IsRequired();
            e.Property(x => x.WrapShape).HasMaxLength(16).IsRequired();
            e.Property(x => x.RibbonStyle).HasMaxLength(16).IsRequired();
            e.Property(x => x.RibbonColor).HasMaxLength(7).IsRequired();
        });

        b.Entity<Memory>(e =>
        {
            e.Property(x => x.Title).HasMaxLength(80).IsRequired();
            e.Property(x => x.Body).HasMaxLength(1500);
            e.Property(x => x.PhotoKey).HasMaxLength(200);
            e.HasIndex(x => new { x.SharedSpaceId, x.Date });
            e.HasOne<SharedSpace>()
                .WithMany()
                .HasForeignKey(x => x.SharedSpaceId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Author)
                .WithMany()
                .HasForeignKey(x => x.AuthorId)
                .OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.Bouquet)
                .WithMany()
                .HasForeignKey(x => x.BouquetId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        b.Entity<Message>(e =>
        {
            e.Property(x => x.Body).HasMaxLength(500).IsRequired();
            e.HasIndex(x => new { x.SharedSpaceId, x.CreatedAt });
            e.HasIndex(x => new { x.RecipientId, x.ReadAt });
            e.HasOne<SharedSpace>()
                .WithMany()
                .HasForeignKey(x => x.SharedSpaceId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Sender)
                .WithMany()
                .HasForeignKey(x => x.SenderId)
                .OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.Recipient)
                .WithMany()
                .HasForeignKey(x => x.RecipientId)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }
}
