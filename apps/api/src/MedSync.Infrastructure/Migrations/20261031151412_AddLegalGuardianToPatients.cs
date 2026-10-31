using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MedSync.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddLegalGuardianToPatients : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Patients_ClinicId_Email",
                schema: "medsync",
                table: "Patients");

            migrationBuilder.DropIndex(
                name: "IX_Patients_ClinicId_UserId",
                schema: "medsync",
                table: "Patients");

            migrationBuilder.AlterColumn<string>(
                name: "Cpf",
                schema: "medsync",
                table: "Patients",
                type: "character varying(14)",
                maxLength: 14,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(14)",
                oldMaxLength: 14);

            migrationBuilder.AddColumn<string>(
                name: "GuardianCpf",
                schema: "medsync",
                table: "Patients",
                type: "character varying(14)",
                maxLength: 14,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "GuardianName",
                schema: "medsync",
                table: "Patients",
                type: "character varying(160)",
                maxLength: 160,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "GuardianRelationship",
                schema: "medsync",
                table: "Patients",
                type: "character varying(40)",
                maxLength: 40,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Patients_ClinicId_Email",
                schema: "medsync",
                table: "Patients",
                columns: new[] { "ClinicId", "Email" },
                unique: true,
                filter: "\"GuardianName\" IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Patients_ClinicId_UserId",
                schema: "medsync",
                table: "Patients",
                columns: new[] { "ClinicId", "UserId" },
                unique: true,
                filter: "\"GuardianName\" IS NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Patients_ClinicId_Email",
                schema: "medsync",
                table: "Patients");

            migrationBuilder.DropIndex(
                name: "IX_Patients_ClinicId_UserId",
                schema: "medsync",
                table: "Patients");

            migrationBuilder.DropColumn(
                name: "GuardianCpf",
                schema: "medsync",
                table: "Patients");

            migrationBuilder.DropColumn(
                name: "GuardianName",
                schema: "medsync",
                table: "Patients");

            migrationBuilder.DropColumn(
                name: "GuardianRelationship",
                schema: "medsync",
                table: "Patients");

            migrationBuilder.AlterColumn<string>(
                name: "Cpf",
                schema: "medsync",
                table: "Patients",
                type: "character varying(14)",
                maxLength: 14,
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "character varying(14)",
                oldMaxLength: 14,
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Patients_ClinicId_Email",
                schema: "medsync",
                table: "Patients",
                columns: new[] { "ClinicId", "Email" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Patients_ClinicId_UserId",
                schema: "medsync",
                table: "Patients",
                columns: new[] { "ClinicId", "UserId" },
                unique: true);
        }
    }
}
