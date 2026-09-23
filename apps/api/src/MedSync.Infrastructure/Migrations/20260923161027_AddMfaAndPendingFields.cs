using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MedSync.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddMfaAndPendingFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "MfaEnabled",
                schema: "medsync",
                table: "Users",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "MfaSecret",
                schema: "medsync",
                table: "Users",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ContinuousMedications",
                schema: "medsync",
                table: "Patients",
                type: "character varying(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "DoctorAvailabilitySlots",
                schema: "medsync",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ClinicId = table.Column<Guid>(type: "uuid", nullable: false),
                    DoctorId = table.Column<Guid>(type: "uuid", nullable: false),
                    DayOfWeek = table.Column<int>(type: "integer", nullable: false),
                    StartTime = table.Column<TimeOnly>(type: "time without time zone", nullable: false),
                    EndTime = table.Column<TimeOnly>(type: "time without time zone", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DoctorAvailabilitySlots", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DoctorAvailabilitySlots_Clinics_ClinicId",
                        column: x => x.ClinicId,
                        principalSchema: "medsync",
                        principalTable: "Clinics",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_DoctorAvailabilitySlots_Doctors_DoctorId",
                        column: x => x.DoctorId,
                        principalSchema: "medsync",
                        principalTable: "Doctors",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_DoctorAvailabilitySlots_ClinicId",
                schema: "medsync",
                table: "DoctorAvailabilitySlots",
                column: "ClinicId");

            migrationBuilder.CreateIndex(
                name: "IX_DoctorAvailabilitySlots_DoctorId_DayOfWeek",
                schema: "medsync",
                table: "DoctorAvailabilitySlots",
                columns: new[] { "DoctorId", "DayOfWeek" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DoctorAvailabilitySlots",
                schema: "medsync");

            migrationBuilder.DropColumn(
                name: "MfaEnabled",
                schema: "medsync",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "MfaSecret",
                schema: "medsync",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "ContinuousMedications",
                schema: "medsync",
                table: "Patients");
        }
    }
}
