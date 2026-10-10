using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MedSync.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPersonIdentificationAndClinicProfile : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AddressCity",
                schema: "medsync",
                table: "Patients",
                type: "character varying(80)",
                maxLength: 80,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AddressComplement",
                schema: "medsync",
                table: "Patients",
                type: "character varying(80)",
                maxLength: 80,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AddressDistrict",
                schema: "medsync",
                table: "Patients",
                type: "character varying(80)",
                maxLength: 80,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AddressNumber",
                schema: "medsync",
                table: "Patients",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AddressState",
                schema: "medsync",
                table: "Patients",
                type: "character varying(2)",
                maxLength: 2,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AddressStreet",
                schema: "medsync",
                table: "Patients",
                type: "character varying(160)",
                maxLength: 160,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AddressZipCode",
                schema: "medsync",
                table: "Patients",
                type: "character varying(9)",
                maxLength: 9,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MotherName",
                schema: "medsync",
                table: "Patients",
                type: "character varying(160)",
                maxLength: 160,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "MotherNameUndeclared",
                schema: "medsync",
                table: "Patients",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "Sex",
                schema: "medsync",
                table: "Patients",
                type: "character varying(1)",
                maxLength: 1,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SocialName",
                schema: "medsync",
                table: "Patients",
                type: "character varying(160)",
                maxLength: 160,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TechnicalDirectorCrm",
                schema: "medsync",
                table: "Clinics",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TechnicalDirectorCrmUf",
                schema: "medsync",
                table: "Clinics",
                type: "character varying(2)",
                maxLength: 2,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TechnicalDirectorName",
                schema: "medsync",
                table: "Clinics",
                type: "character varying(160)",
                maxLength: 160,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AddressCity",
                schema: "medsync",
                table: "Patients");

            migrationBuilder.DropColumn(
                name: "AddressComplement",
                schema: "medsync",
                table: "Patients");

            migrationBuilder.DropColumn(
                name: "AddressDistrict",
                schema: "medsync",
                table: "Patients");

            migrationBuilder.DropColumn(
                name: "AddressNumber",
                schema: "medsync",
                table: "Patients");

            migrationBuilder.DropColumn(
                name: "AddressState",
                schema: "medsync",
                table: "Patients");

            migrationBuilder.DropColumn(
                name: "AddressStreet",
                schema: "medsync",
                table: "Patients");

            migrationBuilder.DropColumn(
                name: "AddressZipCode",
                schema: "medsync",
                table: "Patients");

            migrationBuilder.DropColumn(
                name: "MotherName",
                schema: "medsync",
                table: "Patients");

            migrationBuilder.DropColumn(
                name: "MotherNameUndeclared",
                schema: "medsync",
                table: "Patients");

            migrationBuilder.DropColumn(
                name: "Sex",
                schema: "medsync",
                table: "Patients");

            migrationBuilder.DropColumn(
                name: "SocialName",
                schema: "medsync",
                table: "Patients");

            migrationBuilder.DropColumn(
                name: "TechnicalDirectorCrm",
                schema: "medsync",
                table: "Clinics");

            migrationBuilder.DropColumn(
                name: "TechnicalDirectorCrmUf",
                schema: "medsync",
                table: "Clinics");

            migrationBuilder.DropColumn(
                name: "TechnicalDirectorName",
                schema: "medsync",
                table: "Clinics");
        }
    }
}
