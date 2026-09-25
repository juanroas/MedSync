using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MedSync.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPrescriptions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ProfessionalAddress",
                schema: "medsync",
                table: "Doctors",
                type: "text",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "MedicationCatalog",
                schema: "medsync",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    ActiveIngredient = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    TherapeuticClass = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    Source = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    ClinicId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    SearchText = table.Column<string>(type: "character varying(800)", maxLength: 800, nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MedicationCatalog", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Prescriptions",
                schema: "medsync",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ClinicId = table.Column<Guid>(type: "uuid", nullable: false),
                    AppointmentId = table.Column<Guid>(type: "uuid", nullable: false),
                    PatientId = table.Column<Guid>(type: "uuid", nullable: false),
                    DoctorId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Kind = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    PatientLocation = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    Notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    RenewedFromId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    SignedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    SignedDocumentKey = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    SignedDocumentSha256 = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Prescriptions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Prescriptions_Appointments_AppointmentId",
                        column: x => x.AppointmentId,
                        principalSchema: "medsync",
                        principalTable: "Appointments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "PrescriptionItems",
                schema: "medsync",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PrescriptionId = table.Column<Guid>(type: "uuid", nullable: false),
                    Position = table.Column<int>(type: "integer", nullable: false),
                    CatalogItemId = table.Column<Guid>(type: "uuid", nullable: true),
                    MedicationName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Dosage = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                    Instructions = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Quantity = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                    ContinuousUse = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PrescriptionItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PrescriptionItems_Prescriptions_PrescriptionId",
                        column: x => x.PrescriptionId,
                        principalSchema: "medsync",
                        principalTable: "Prescriptions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_MedicationCatalog_SearchText",
                schema: "medsync",
                table: "MedicationCatalog",
                column: "SearchText");

            migrationBuilder.CreateIndex(
                name: "IX_MedicationCatalog_Source_ClinicId",
                schema: "medsync",
                table: "MedicationCatalog",
                columns: new[] { "Source", "ClinicId" });

            migrationBuilder.CreateIndex(
                name: "IX_PrescriptionItems_PrescriptionId",
                schema: "medsync",
                table: "PrescriptionItems",
                column: "PrescriptionId");

            migrationBuilder.CreateIndex(
                name: "IX_Prescriptions_AppointmentId",
                schema: "medsync",
                table: "Prescriptions",
                column: "AppointmentId");

            migrationBuilder.CreateIndex(
                name: "IX_Prescriptions_ClinicId_PatientId_CreatedAt",
                schema: "medsync",
                table: "Prescriptions",
                columns: new[] { "ClinicId", "PatientId", "CreatedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MedicationCatalog",
                schema: "medsync");

            migrationBuilder.DropTable(
                name: "PrescriptionItems",
                schema: "medsync");

            migrationBuilder.DropTable(
                name: "Prescriptions",
                schema: "medsync");

            migrationBuilder.DropColumn(
                name: "ProfessionalAddress",
                schema: "medsync",
                table: "Doctors");
        }
    }
}
