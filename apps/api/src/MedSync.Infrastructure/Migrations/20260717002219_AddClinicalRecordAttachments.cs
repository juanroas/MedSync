using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MedSync.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddClinicalRecordAttachments : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ClinicalRecordAttachments",
                schema: "medsync",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ClinicId = table.Column<Guid>(type: "uuid", nullable: false),
                    AppointmentId = table.Column<Guid>(type: "uuid", nullable: false),
                    ClinicalRecordId = table.Column<Guid>(type: "uuid", nullable: true),
                    UploadedByUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    FileName = table.Column<string>(type: "character varying(180)", maxLength: 180, nullable: false),
                    StorageKey = table.Column<string>(type: "character varying(260)", maxLength: 260, nullable: false),
                    ContentType = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    SizeBytes = table.Column<long>(type: "bigint", nullable: false),
                    Sha256 = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    ReleasedToPatient = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ClinicalRecordAttachments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ClinicalRecordAttachments_Appointments_AppointmentId",
                        column: x => x.AppointmentId,
                        principalSchema: "medsync",
                        principalTable: "Appointments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ClinicalRecordAttachments_ClinicalRecords_ClinicalRecordId",
                        column: x => x.ClinicalRecordId,
                        principalSchema: "medsync",
                        principalTable: "ClinicalRecords",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ClinicalRecordAttachments_AppointmentId_CreatedAt",
                schema: "medsync",
                table: "ClinicalRecordAttachments",
                columns: new[] { "AppointmentId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_ClinicalRecordAttachments_ClinicalRecordId",
                schema: "medsync",
                table: "ClinicalRecordAttachments",
                column: "ClinicalRecordId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ClinicalRecordAttachments",
                schema: "medsync");
        }
    }
}
