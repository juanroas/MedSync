using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MedSync.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddAppointmentModalityAndClinicAddress : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Every appointment before this migration was a video consultation.
            migrationBuilder.AddColumn<string>(
                name: "AddressCity",
                schema: "medsync",
                table: "Clinics",
                type: "character varying(80)",
                maxLength: 80,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AddressComplement",
                schema: "medsync",
                table: "Clinics",
                type: "character varying(80)",
                maxLength: 80,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AddressDistrict",
                schema: "medsync",
                table: "Clinics",
                type: "character varying(80)",
                maxLength: 80,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AddressNumber",
                schema: "medsync",
                table: "Clinics",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AddressState",
                schema: "medsync",
                table: "Clinics",
                type: "character varying(2)",
                maxLength: 2,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AddressStreet",
                schema: "medsync",
                table: "Clinics",
                type: "character varying(160)",
                maxLength: 160,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AddressZipCode",
                schema: "medsync",
                table: "Clinics",
                type: "character varying(9)",
                maxLength: 9,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Phone",
                schema: "medsync",
                table: "Clinics",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Location",
                schema: "medsync",
                table: "Appointments",
                type: "character varying(300)",
                maxLength: 300,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Modality",
                schema: "medsync",
                table: "Appointments",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Online");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AddressCity",
                schema: "medsync",
                table: "Clinics");

            migrationBuilder.DropColumn(
                name: "AddressComplement",
                schema: "medsync",
                table: "Clinics");

            migrationBuilder.DropColumn(
                name: "AddressDistrict",
                schema: "medsync",
                table: "Clinics");

            migrationBuilder.DropColumn(
                name: "AddressNumber",
                schema: "medsync",
                table: "Clinics");

            migrationBuilder.DropColumn(
                name: "AddressState",
                schema: "medsync",
                table: "Clinics");

            migrationBuilder.DropColumn(
                name: "AddressStreet",
                schema: "medsync",
                table: "Clinics");

            migrationBuilder.DropColumn(
                name: "AddressZipCode",
                schema: "medsync",
                table: "Clinics");

            migrationBuilder.DropColumn(
                name: "Phone",
                schema: "medsync",
                table: "Clinics");

            migrationBuilder.DropColumn(
                name: "Location",
                schema: "medsync",
                table: "Appointments");

            migrationBuilder.DropColumn(
                name: "Modality",
                schema: "medsync",
                table: "Appointments");
        }
    }
}
