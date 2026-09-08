using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OnboardingDiary.Api.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddChecklists : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ChecklistAssignmentId",
                table: "Tasks",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ChecklistItemId",
                table: "Tasks",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "ChecklistTemplates",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Name = table.Column<string>(type: "TEXT", maxLength: 120, nullable: false),
                    Description = table.Column<string>(type: "TEXT", maxLength: 1000, nullable: true),
                    DepartmentId = table.Column<int>(type: "INTEGER", nullable: true),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ChecklistTemplates", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ChecklistTemplates_Departments_DepartmentId",
                        column: x => x.DepartmentId,
                        principalTable: "Departments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ChecklistAssignments",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    UserId = table.Column<int>(type: "INTEGER", nullable: false),
                    TemplateId = table.Column<int>(type: "INTEGER", nullable: false),
                    AppliedAt = table.Column<DateTimeOffset>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ChecklistAssignments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ChecklistAssignments_ChecklistTemplates_TemplateId",
                        column: x => x.TemplateId,
                        principalTable: "ChecklistTemplates",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ChecklistAssignments_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ChecklistItems",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    TemplateId = table.Column<int>(type: "INTEGER", nullable: false),
                    Position = table.Column<int>(type: "INTEGER", nullable: false),
                    Title = table.Column<string>(type: "TEXT", maxLength: 120, nullable: false),
                    Description = table.Column<string>(type: "TEXT", maxLength: 5000, nullable: true),
                    Category = table.Column<string>(type: "TEXT", maxLength: 20, nullable: false),
                    DueOffsetDays = table.Column<int>(type: "INTEGER", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ChecklistItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ChecklistItems_ChecklistTemplates_TemplateId",
                        column: x => x.TemplateId,
                        principalTable: "ChecklistTemplates",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Tasks_ChecklistAssignmentId",
                table: "Tasks",
                column: "ChecklistAssignmentId");

            migrationBuilder.CreateIndex(
                name: "IX_ChecklistAssignments_TemplateId",
                table: "ChecklistAssignments",
                column: "TemplateId");

            migrationBuilder.CreateIndex(
                name: "IX_ChecklistAssignments_UserId_TemplateId",
                table: "ChecklistAssignments",
                columns: new[] { "UserId", "TemplateId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ChecklistItems_TemplateId_Position",
                table: "ChecklistItems",
                columns: new[] { "TemplateId", "Position" });

            migrationBuilder.CreateIndex(
                name: "IX_ChecklistTemplates_DepartmentId",
                table: "ChecklistTemplates",
                column: "DepartmentId");

            migrationBuilder.CreateIndex(
                name: "IX_ChecklistTemplates_Name",
                table: "ChecklistTemplates",
                column: "Name",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Tasks_ChecklistAssignments_ChecklistAssignmentId",
                table: "Tasks",
                column: "ChecklistAssignmentId",
                principalTable: "ChecklistAssignments",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Tasks_ChecklistAssignments_ChecklistAssignmentId",
                table: "Tasks");

            migrationBuilder.DropTable(
                name: "ChecklistAssignments");

            migrationBuilder.DropTable(
                name: "ChecklistItems");

            migrationBuilder.DropTable(
                name: "ChecklistTemplates");

            migrationBuilder.DropIndex(
                name: "IX_Tasks_ChecklistAssignmentId",
                table: "Tasks");

            migrationBuilder.DropColumn(
                name: "ChecklistAssignmentId",
                table: "Tasks");

            migrationBuilder.DropColumn(
                name: "ChecklistItemId",
                table: "Tasks");
        }
    }
}
