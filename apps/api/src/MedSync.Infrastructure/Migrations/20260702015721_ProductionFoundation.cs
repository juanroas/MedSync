using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MedSync.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class ProductionFoundation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Patients_Cpf",
                schema: "medsync",
                table: "Patients");

            migrationBuilder.DropIndex(
                name: "IX_Patients_Email",
                schema: "medsync",
                table: "Patients");

            migrationBuilder.DropIndex(
                name: "IX_Patients_UserId",
                schema: "medsync",
                table: "Patients");

            migrationBuilder.DropIndex(
                name: "IX_Doctors_Crm",
                schema: "medsync",
                table: "Doctors");

            migrationBuilder.DropIndex(
                name: "IX_Doctors_Email",
                schema: "medsync",
                table: "Doctors");

            migrationBuilder.DropIndex(
                name: "IX_Doctors_UserId",
                schema: "medsync",
                table: "Doctors");

            migrationBuilder.AddColumn<bool>(
                name: "IsActive",
                schema: "medsync",
                table: "Users",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "MustChangePassword",
                schema: "medsync",
                table: "Users",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<Guid>(
                name: "ClinicId",
                schema: "medsync",
                table: "Patients",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<Guid>(
                name: "ClinicId",
                schema: "medsync",
                table: "Doctors",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<Guid>(
                name: "ClinicId",
                schema: "medsync",
                table: "ConsultationRooms",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<DateTime>(
                name: "EndedAt",
                schema: "medsync",
                table: "ConsultationRooms",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastActivityAt",
                schema: "medsync",
                table: "ConsultationRooms",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "StartedAt",
                schema: "medsync",
                table: "ConsultationRooms",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Status",
                schema: "medsync",
                table: "ConsultationRooms",
                type: "character varying(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<Guid>(
                name: "ClinicId",
                schema: "medsync",
                table: "Appointments",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<int>(
                name: "DurationMinutes",
                schema: "medsync",
                table: "Appointments",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<bool>(
                name: "PaymentRequired",
                schema: "medsync",
                table: "Appointments",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<decimal>(
                name: "Price",
                schema: "medsync",
                table: "Appointments",
                type: "numeric(12,2)",
                precision: 12,
                scale: 2,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "AuditEvents",
                schema: "medsync",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ClinicId = table.Column<Guid>(type: "uuid", nullable: true),
                    ActorUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    Action = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    ResourceType = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    ResourceId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Result = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    Reason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    IpAddress = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    UserAgent = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AuditEvents", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ClinicalRecords",
                schema: "medsync",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ClinicId = table.Column<Guid>(type: "uuid", nullable: false),
                    AppointmentId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Content = table.Column<string>(type: "text", nullable: false),
                    Version = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ClinicalRecords", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ClinicalRecords_Appointments_AppointmentId",
                        column: x => x.AppointmentId,
                        principalSchema: "medsync",
                        principalTable: "Appointments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Clinics",
                schema: "medsync",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    Slug = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Clinics", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ConsentRecords",
                schema: "medsync",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ClinicId = table.Column<Guid>(type: "uuid", nullable: false),
                    AppointmentId = table.Column<Guid>(type: "uuid", nullable: false),
                    PatientId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    TermVersion = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    TermHash = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    AcceptedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    IpAddress = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    UserAgent = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ConsentRecords", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ConsentRecords_Appointments_AppointmentId",
                        column: x => x.AppointmentId,
                        principalSchema: "medsync",
                        principalTable: "Appointments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Payments",
                schema: "medsync",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ClinicId = table.Column<Guid>(type: "uuid", nullable: false),
                    AppointmentId = table.Column<Guid>(type: "uuid", nullable: false),
                    Provider = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    ProviderPreferenceId = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                    ProviderPaymentId = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                    Amount = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    Currency = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    Status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    CheckoutUrl = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Payments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Payments_Appointments_AppointmentId",
                        column: x => x.AppointmentId,
                        principalSchema: "medsync",
                        principalTable: "Appointments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ClinicalRecordRevisions",
                schema: "medsync",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ClinicId = table.Column<Guid>(type: "uuid", nullable: false),
                    ClinicalRecordId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Content = table.Column<string>(type: "text", nullable: false),
                    Version = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ClinicalRecordRevisions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ClinicalRecordRevisions_ClinicalRecords_ClinicalRecordId",
                        column: x => x.ClinicalRecordId,
                        principalSchema: "medsync",
                        principalTable: "ClinicalRecords",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ClinicMemberships",
                schema: "medsync",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ClinicId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Role = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ClinicMemberships", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ClinicMemberships_Clinics_ClinicId",
                        column: x => x.ClinicId,
                        principalSchema: "medsync",
                        principalTable: "Clinics",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ClinicMemberships_Users_UserId",
                        column: x => x.UserId,
                        principalSchema: "medsync",
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.Sql(
                """
                DO $$
                DECLARE
                    default_clinic uuid := '01000000-0000-0000-0000-000000000001';
                BEGIN
                    IF EXISTS (SELECT 1 FROM medsync."Users") THEN
                        INSERT INTO medsync."Clinics" ("Id", "Name", "Slug", "IsActive", "CreatedAt")
                        VALUES (default_clinic, 'MedSync Clinic', 'medsync-clinic', TRUE, NOW())
                        ON CONFLICT ("Id") DO NOTHING;

                        UPDATE medsync."Users" SET "IsActive" = TRUE;
                        UPDATE medsync."Doctors" SET "ClinicId" = default_clinic;
                        UPDATE medsync."Patients" SET "ClinicId" = default_clinic;
                        UPDATE medsync."Appointments"
                        SET "ClinicId" = default_clinic, "DurationMinutes" = 60;
                        UPDATE medsync."ConsultationRooms" r
                        SET "ClinicId" = a."ClinicId", "Status" = 'Ready'
                        FROM medsync."Appointments" a
                        WHERE r."AppointmentId" = a."Id";

                        INSERT INTO medsync."ClinicMemberships"
                            ("Id", "ClinicId", "UserId", "Role", "CreatedAt")
                        SELECT md5(u."Id"::text || ':Doctor')::uuid,
                               default_clinic, u."Id", 'Doctor', NOW()
                        FROM medsync."Users" u
                        WHERE EXISTS (
                            SELECT 1 FROM medsync."Doctors" d WHERE d."UserId" = u."Id");

                        INSERT INTO medsync."ClinicMemberships"
                            ("Id", "ClinicId", "UserId", "Role", "CreatedAt")
                        SELECT md5(u."Id"::text || ':Patient')::uuid,
                               default_clinic, u."Id", 'Patient', NOW()
                        FROM medsync."Users" u
                        WHERE EXISTS (
                            SELECT 1 FROM medsync."Patients" p WHERE p."UserId" = u."Id");

                        INSERT INTO medsync."ClinicMemberships"
                            ("Id", "ClinicId", "UserId", "Role", "CreatedAt")
                        SELECT md5(u."Id"::text || ':ClinicAdmin')::uuid,
                               default_clinic, u."Id", 'ClinicAdmin', NOW()
                        FROM medsync."Users" u
                        WHERE u."Role" = 'Admin';
                    END IF;
                END $$;
                """);

            migrationBuilder.DropColumn(
                name: "Role",
                schema: "medsync",
                table: "Users");

            migrationBuilder.CreateIndex(
                name: "IX_Patients_ClinicId_Cpf",
                schema: "medsync",
                table: "Patients",
                columns: new[] { "ClinicId", "Cpf" },
                unique: true);

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

            migrationBuilder.CreateIndex(
                name: "IX_Patients_UserId",
                schema: "medsync",
                table: "Patients",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_Doctors_ClinicId_Crm",
                schema: "medsync",
                table: "Doctors",
                columns: new[] { "ClinicId", "Crm" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Doctors_ClinicId_Email",
                schema: "medsync",
                table: "Doctors",
                columns: new[] { "ClinicId", "Email" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Doctors_ClinicId_UserId",
                schema: "medsync",
                table: "Doctors",
                columns: new[] { "ClinicId", "UserId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Doctors_UserId",
                schema: "medsync",
                table: "Doctors",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_Appointments_ClinicId_ScheduledAt",
                schema: "medsync",
                table: "Appointments",
                columns: new[] { "ClinicId", "ScheduledAt" });

            migrationBuilder.CreateIndex(
                name: "IX_AuditEvents_ClinicId_CreatedAt",
                schema: "medsync",
                table: "AuditEvents",
                columns: new[] { "ClinicId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_ClinicalRecordRevisions_ClinicalRecordId_Version",
                schema: "medsync",
                table: "ClinicalRecordRevisions",
                columns: new[] { "ClinicalRecordId", "Version" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ClinicalRecords_AppointmentId",
                schema: "medsync",
                table: "ClinicalRecords",
                column: "AppointmentId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ClinicMemberships_ClinicId_UserId_Role",
                schema: "medsync",
                table: "ClinicMemberships",
                columns: new[] { "ClinicId", "UserId", "Role" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ClinicMemberships_UserId",
                schema: "medsync",
                table: "ClinicMemberships",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_Clinics_Slug",
                schema: "medsync",
                table: "Clinics",
                column: "Slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ConsentRecords_AppointmentId_PatientId_TermVersion",
                schema: "medsync",
                table: "ConsentRecords",
                columns: new[] { "AppointmentId", "PatientId", "TermVersion" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Payments_AppointmentId",
                schema: "medsync",
                table: "Payments",
                column: "AppointmentId");

            migrationBuilder.CreateIndex(
                name: "IX_Payments_ProviderPaymentId",
                schema: "medsync",
                table: "Payments",
                column: "ProviderPaymentId");

            migrationBuilder.AddForeignKey(
                name: "FK_Appointments_Clinics_ClinicId",
                schema: "medsync",
                table: "Appointments",
                column: "ClinicId",
                principalSchema: "medsync",
                principalTable: "Clinics",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Doctors_Clinics_ClinicId",
                schema: "medsync",
                table: "Doctors",
                column: "ClinicId",
                principalSchema: "medsync",
                principalTable: "Clinics",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Patients_Clinics_ClinicId",
                schema: "medsync",
                table: "Patients",
                column: "ClinicId",
                principalSchema: "medsync",
                principalTable: "Clinics",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Appointments_Clinics_ClinicId",
                schema: "medsync",
                table: "Appointments");

            migrationBuilder.DropForeignKey(
                name: "FK_Doctors_Clinics_ClinicId",
                schema: "medsync",
                table: "Doctors");

            migrationBuilder.DropForeignKey(
                name: "FK_Patients_Clinics_ClinicId",
                schema: "medsync",
                table: "Patients");

            migrationBuilder.DropTable(
                name: "AuditEvents",
                schema: "medsync");

            migrationBuilder.DropTable(
                name: "ClinicalRecordRevisions",
                schema: "medsync");

            migrationBuilder.DropTable(
                name: "ClinicMemberships",
                schema: "medsync");

            migrationBuilder.DropTable(
                name: "ConsentRecords",
                schema: "medsync");

            migrationBuilder.DropTable(
                name: "Payments",
                schema: "medsync");

            migrationBuilder.DropTable(
                name: "ClinicalRecords",
                schema: "medsync");

            migrationBuilder.DropTable(
                name: "Clinics",
                schema: "medsync");

            migrationBuilder.DropIndex(
                name: "IX_Patients_ClinicId_Cpf",
                schema: "medsync",
                table: "Patients");

            migrationBuilder.DropIndex(
                name: "IX_Patients_ClinicId_Email",
                schema: "medsync",
                table: "Patients");

            migrationBuilder.DropIndex(
                name: "IX_Patients_ClinicId_UserId",
                schema: "medsync",
                table: "Patients");

            migrationBuilder.DropIndex(
                name: "IX_Patients_UserId",
                schema: "medsync",
                table: "Patients");

            migrationBuilder.DropIndex(
                name: "IX_Doctors_ClinicId_Crm",
                schema: "medsync",
                table: "Doctors");

            migrationBuilder.DropIndex(
                name: "IX_Doctors_ClinicId_Email",
                schema: "medsync",
                table: "Doctors");

            migrationBuilder.DropIndex(
                name: "IX_Doctors_ClinicId_UserId",
                schema: "medsync",
                table: "Doctors");

            migrationBuilder.DropIndex(
                name: "IX_Doctors_UserId",
                schema: "medsync",
                table: "Doctors");

            migrationBuilder.DropIndex(
                name: "IX_Appointments_ClinicId_ScheduledAt",
                schema: "medsync",
                table: "Appointments");

            migrationBuilder.DropColumn(
                name: "IsActive",
                schema: "medsync",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "MustChangePassword",
                schema: "medsync",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "ClinicId",
                schema: "medsync",
                table: "Patients");

            migrationBuilder.DropColumn(
                name: "ClinicId",
                schema: "medsync",
                table: "Doctors");

            migrationBuilder.DropColumn(
                name: "ClinicId",
                schema: "medsync",
                table: "ConsultationRooms");

            migrationBuilder.DropColumn(
                name: "EndedAt",
                schema: "medsync",
                table: "ConsultationRooms");

            migrationBuilder.DropColumn(
                name: "LastActivityAt",
                schema: "medsync",
                table: "ConsultationRooms");

            migrationBuilder.DropColumn(
                name: "StartedAt",
                schema: "medsync",
                table: "ConsultationRooms");

            migrationBuilder.DropColumn(
                name: "Status",
                schema: "medsync",
                table: "ConsultationRooms");

            migrationBuilder.DropColumn(
                name: "ClinicId",
                schema: "medsync",
                table: "Appointments");

            migrationBuilder.DropColumn(
                name: "DurationMinutes",
                schema: "medsync",
                table: "Appointments");

            migrationBuilder.DropColumn(
                name: "PaymentRequired",
                schema: "medsync",
                table: "Appointments");

            migrationBuilder.DropColumn(
                name: "Price",
                schema: "medsync",
                table: "Appointments");

            migrationBuilder.AddColumn<string>(
                name: "Role",
                schema: "medsync",
                table: "Users",
                type: "character varying(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateIndex(
                name: "IX_Patients_Cpf",
                schema: "medsync",
                table: "Patients",
                column: "Cpf",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Patients_Email",
                schema: "medsync",
                table: "Patients",
                column: "Email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Patients_UserId",
                schema: "medsync",
                table: "Patients",
                column: "UserId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Doctors_Crm",
                schema: "medsync",
                table: "Doctors",
                column: "Crm",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Doctors_Email",
                schema: "medsync",
                table: "Doctors",
                column: "Email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Doctors_UserId",
                schema: "medsync",
                table: "Doctors",
                column: "UserId",
                unique: true);
        }
    }
}
