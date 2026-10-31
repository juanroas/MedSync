using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MedSync.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddConsultationClosureFollowUpAndSlotLength : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "SlotMinutes",
                schema: "medsync",
                table: "DoctorAvailabilitySlots",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ClosedAt",
                schema: "medsync",
                table: "Appointments",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ClosedByUserId",
                schema: "medsync",
                table: "Appointments",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "FollowUpDays",
                schema: "medsync",
                table: "Appointments",
                type: "integer",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SlotMinutes",
                schema: "medsync",
                table: "DoctorAvailabilitySlots");

            migrationBuilder.DropColumn(
                name: "ClosedAt",
                schema: "medsync",
                table: "Appointments");

            migrationBuilder.DropColumn(
                name: "ClosedByUserId",
                schema: "medsync",
                table: "Appointments");

            migrationBuilder.DropColumn(
                name: "FollowUpDays",
                schema: "medsync",
                table: "Appointments");
        }
    }
}
