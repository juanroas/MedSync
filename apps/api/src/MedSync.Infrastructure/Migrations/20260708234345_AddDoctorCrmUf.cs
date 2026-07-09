using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MedSync.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddDoctorCrmUf : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CrmUf",
                schema: "medsync",
                table: "Doctors",
                type: "character varying(2)",
                maxLength: 2,
                nullable: false,
                defaultValue: "SP");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CrmUf",
                schema: "medsync",
                table: "Doctors");
        }
    }
}
