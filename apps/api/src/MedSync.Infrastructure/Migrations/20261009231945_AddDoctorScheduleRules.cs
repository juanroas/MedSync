using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MedSync.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddDoctorScheduleRules : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Existing doctors keep the 30-minute slots they had and get the 90-day booking window; existing windows were video only.
            migrationBuilder.AddColumn<int>(
                name: "BookingWindowDays",
                schema: "medsync",
                table: "Doctors",
                type: "integer",
                nullable: false,
                defaultValue: 90);

            migrationBuilder.AddColumn<int>(
                name: "SlotMinutes",
                schema: "medsync",
                table: "Doctors",
                type: "integer",
                nullable: false,
                defaultValue: 30);

            migrationBuilder.AddColumn<string>(
                name: "Modality",
                schema: "medsync",
                table: "DoctorAvailabilitySlots",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Online");

            migrationBuilder.CreateTable(
                name: "DoctorTimeOffs",
                schema: "medsync",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ClinicId = table.Column<Guid>(type: "uuid", nullable: false),
                    DoctorId = table.Column<Guid>(type: "uuid", nullable: false),
                    StartDate = table.Column<DateOnly>(type: "date", nullable: false),
                    EndDate = table.Column<DateOnly>(type: "date", nullable: false),
                    Reason = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DoctorTimeOffs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DoctorTimeOffs_Doctors_DoctorId",
                        column: x => x.DoctorId,
                        principalSchema: "medsync",
                        principalTable: "Doctors",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_DoctorTimeOffs_DoctorId_StartDate",
                schema: "medsync",
                table: "DoctorTimeOffs",
                columns: new[] { "DoctorId", "StartDate" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DoctorTimeOffs",
                schema: "medsync");

            migrationBuilder.DropColumn(
                name: "BookingWindowDays",
                schema: "medsync",
                table: "Doctors");

            migrationBuilder.DropColumn(
                name: "SlotMinutes",
                schema: "medsync",
                table: "Doctors");

            migrationBuilder.DropColumn(
                name: "Modality",
                schema: "medsync",
                table: "DoctorAvailabilitySlots");
        }
    }
}
