using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MedSync.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddClinicalRecordAttachmentSoftDelete : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedAt",
                schema: "medsync",
                table: "ClinicalRecordAttachments",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "DeletedByUserId",
                schema: "medsync",
                table: "ClinicalRecordAttachments",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsDeleted",
                schema: "medsync",
                table: "ClinicalRecordAttachments",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DeletedAt",
                schema: "medsync",
                table: "ClinicalRecordAttachments");

            migrationBuilder.DropColumn(
                name: "DeletedByUserId",
                schema: "medsync",
                table: "ClinicalRecordAttachments");

            migrationBuilder.DropColumn(
                name: "IsDeleted",
                schema: "medsync",
                table: "ClinicalRecordAttachments");
        }
    }
}
