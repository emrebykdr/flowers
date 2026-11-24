using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OurBloom.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "shared_spaces",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    together_since = table.Column<DateOnly>(type: "date", nullable: true),
                    sample_content_seeded = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_shared_spaces", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "users",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    username = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    display_name = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    password_hash = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: false),
                    security_stamp = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    shared_space_id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    password_changed_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    last_login_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_users", x => x.id);
                    table.ForeignKey(
                        name: "fk_users_shared_spaces_shared_space_id",
                        column: x => x.shared_space_id,
                        principalTable: "shared_spaces",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "bouquets",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    shared_space_id = table.Column<Guid>(type: "uuid", nullable: false),
                    owner_id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    note = table.Column<string>(type: "character varying(600)", maxLength: 600, nullable: true),
                    memory_date = table.Column<DateOnly>(type: "date", nullable: false),
                    shape = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    greenery = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    layout_seed = table.Column<int>(type: "integer", nullable: false),
                    preview_key = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    preview_version = table.Column<int>(type: "integer", nullable: false),
                    copied_from_id = table.Column<Guid>(type: "uuid", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_bouquets", x => x.id);
                    table.ForeignKey(
                        name: "fk_bouquets_shared_spaces_shared_space_id",
                        column: x => x.shared_space_id,
                        principalTable: "shared_spaces",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_bouquets_users_owner_id",
                        column: x => x.owner_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "messages",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    shared_space_id = table.Column<Guid>(type: "uuid", nullable: false),
                    sender_id = table.Column<Guid>(type: "uuid", nullable: false),
                    recipient_id = table.Column<Guid>(type: "uuid", nullable: false),
                    body = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    read_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_messages", x => x.id);
                    table.ForeignKey(
                        name: "fk_messages_shared_spaces_shared_space_id",
                        column: x => x.shared_space_id,
                        principalTable: "shared_spaces",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_messages_users_recipient_id",
                        column: x => x.recipient_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_messages_users_sender_id",
                        column: x => x.sender_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "bouquet_flowers",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    bouquet_id = table.Column<Guid>(type: "uuid", nullable: false),
                    sort_order = table.Column<int>(type: "integer", nullable: false),
                    flower_type = table.Column<string>(type: "character varying(24)", maxLength: 24, nullable: false),
                    color = table.Column<string>(type: "character varying(7)", maxLength: 7, nullable: false),
                    count = table.Column<int>(type: "integer", nullable: false),
                    stem_length = table.Column<double>(type: "double precision", nullable: false),
                    size = table.Column<double>(type: "double precision", nullable: false),
                    tilt = table.Column<double>(type: "double precision", nullable: false),
                    turn = table.Column<double>(type: "double precision", nullable: false),
                    manual_placement = table.Column<bool>(type: "boolean", nullable: false),
                    position_angle = table.Column<double>(type: "double precision", nullable: false),
                    position_radius = table.Column<double>(type: "double precision", nullable: false),
                    position_height = table.Column<double>(type: "double precision", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_bouquet_flowers", x => x.id);
                    table.ForeignKey(
                        name: "fk_bouquet_flowers_bouquets_bouquet_id",
                        column: x => x.bouquet_id,
                        principalTable: "bouquets",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "bouquet_packagings",
                columns: table => new
                {
                    bouquet_id = table.Column<Guid>(type: "uuid", nullable: false),
                    wrap_material = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    wrap_color = table.Column<string>(type: "character varying(7)", maxLength: 7, nullable: false),
                    wrap_shape = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    ribbon_style = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    ribbon_color = table.Column<string>(type: "character varying(7)", maxLength: 7, nullable: false),
                    has_bow = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_bouquet_packagings", x => x.bouquet_id);
                    table.ForeignKey(
                        name: "fk_bouquet_packagings_bouquets_bouquet_id",
                        column: x => x.bouquet_id,
                        principalTable: "bouquets",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "memories",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    shared_space_id = table.Column<Guid>(type: "uuid", nullable: false),
                    author_id = table.Column<Guid>(type: "uuid", nullable: false),
                    title = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    body = table.Column<string>(type: "character varying(1500)", maxLength: 1500, nullable: true),
                    date = table.Column<DateOnly>(type: "date", nullable: false),
                    photo_key = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    photo_version = table.Column<int>(type: "integer", nullable: false),
                    bouquet_id = table.Column<Guid>(type: "uuid", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_memories", x => x.id);
                    table.ForeignKey(
                        name: "fk_memories_bouquets_bouquet_id",
                        column: x => x.bouquet_id,
                        principalTable: "bouquets",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_memories_shared_spaces_shared_space_id",
                        column: x => x.shared_space_id,
                        principalTable: "shared_spaces",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_memories_users_author_id",
                        column: x => x.author_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "ix_bouquet_flowers_bouquet_id_sort_order",
                table: "bouquet_flowers",
                columns: new[] { "bouquet_id", "sort_order" });

            migrationBuilder.CreateIndex(
                name: "ix_bouquets_owner_id",
                table: "bouquets",
                column: "owner_id");

            migrationBuilder.CreateIndex(
                name: "ix_bouquets_shared_space_id_memory_date",
                table: "bouquets",
                columns: new[] { "shared_space_id", "memory_date" });

            migrationBuilder.CreateIndex(
                name: "ix_bouquets_shared_space_id_owner_id",
                table: "bouquets",
                columns: new[] { "shared_space_id", "owner_id" });

            migrationBuilder.CreateIndex(
                name: "ix_memories_author_id",
                table: "memories",
                column: "author_id");

            migrationBuilder.CreateIndex(
                name: "ix_memories_bouquet_id",
                table: "memories",
                column: "bouquet_id");

            migrationBuilder.CreateIndex(
                name: "ix_memories_shared_space_id_date",
                table: "memories",
                columns: new[] { "shared_space_id", "date" });

            migrationBuilder.CreateIndex(
                name: "ix_messages_recipient_id_read_at",
                table: "messages",
                columns: new[] { "recipient_id", "read_at" });

            migrationBuilder.CreateIndex(
                name: "ix_messages_sender_id",
                table: "messages",
                column: "sender_id");

            migrationBuilder.CreateIndex(
                name: "ix_messages_shared_space_id_created_at",
                table: "messages",
                columns: new[] { "shared_space_id", "created_at" });

            migrationBuilder.CreateIndex(
                name: "ix_users_shared_space_id",
                table: "users",
                column: "shared_space_id");

            migrationBuilder.CreateIndex(
                name: "ix_users_username",
                table: "users",
                column: "username",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "bouquet_flowers");

            migrationBuilder.DropTable(
                name: "bouquet_packagings");

            migrationBuilder.DropTable(
                name: "memories");

            migrationBuilder.DropTable(
                name: "messages");

            migrationBuilder.DropTable(
                name: "bouquets");

            migrationBuilder.DropTable(
                name: "users");

            migrationBuilder.DropTable(
                name: "shared_spaces");
        }
    }
}
