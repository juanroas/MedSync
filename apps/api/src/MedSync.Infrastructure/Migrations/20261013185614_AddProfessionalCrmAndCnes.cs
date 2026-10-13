using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MedSync.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddProfessionalCrmAndCnes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ProfessionalCrm",
                schema: "medsync",
                table: "Users",
                type: "character varying(10)",
                maxLength: 10,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ProfessionalCrmUf",
                schema: "medsync",
                table: "Users",
                type: "character varying(2)",
                maxLength: 2,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Cnes",
                schema: "medsync",
                table: "Clinics",
                type: "character varying(7)",
                maxLength: 7,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ActorCrm",
                schema: "medsync",
                table: "ClinicalAccessGrants",
                type: "character varying(40)",
                maxLength: 40,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddForeignKey(
                name: "FK_ClinicalAccessGrants_Users_ActorUserId",
                schema: "medsync",
                table: "ClinicalAccessGrants",
                column: "ActorUserId",
                principalSchema: "medsync",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ClinicalAccessGrants_Users_ActorUserId",
                schema: "medsync",
                table: "ClinicalAccessGrants");

            migrationBuilder.DropColumn(
                name: "ProfessionalCrm",
                schema: "medsync",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "ProfessionalCrmUf",
                schema: "medsync",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "Cnes",
                schema: "medsync",
                table: "Clinics");

            migrationBuilder.DropColumn(
                name: "ActorCrm",
                schema: "medsync",
                table: "ClinicalAccessGrants");
        }
    }
}
