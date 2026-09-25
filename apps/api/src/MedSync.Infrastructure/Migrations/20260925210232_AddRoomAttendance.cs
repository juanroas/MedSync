using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MedSync.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddRoomAttendance : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "DoctorJoinedAt",
                schema: "medsync",
                table: "ConsultationRooms",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "PatientJoinedAt",
                schema: "medsync",
                table: "ConsultationRooms",
                type: "timestamp with time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DoctorJoinedAt",
                schema: "medsync",
                table: "ConsultationRooms");

            migrationBuilder.DropColumn(
                name: "PatientJoinedAt",
                schema: "medsync",
                table: "ConsultationRooms");
        }
    }
}
