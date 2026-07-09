using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MedSync.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddB2BFoundation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "BenefitPlans",
                schema: "medsync",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ClinicId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    Description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    MonthlyFee = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    MonthlyConsultationLimit = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BenefitPlans", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BenefitPlans_Clinics_ClinicId",
                        column: x => x.ClinicId,
                        principalSchema: "medsync",
                        principalTable: "Clinics",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Companies",
                schema: "medsync",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ClinicId = table.Column<Guid>(type: "uuid", nullable: false),
                    LegalName = table.Column<string>(type: "character varying(180)", maxLength: 180, nullable: false),
                    TradeName = table.Column<string>(type: "character varying(180)", maxLength: 180, nullable: true),
                    TaxId = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Companies", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Companies_Clinics_ClinicId",
                        column: x => x.ClinicId,
                        principalSchema: "medsync",
                        principalTable: "Clinics",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "CompanyContracts",
                schema: "medsync",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ClinicId = table.Column<Guid>(type: "uuid", nullable: false),
                    CompanyId = table.Column<Guid>(type: "uuid", nullable: false),
                    BenefitPlanId = table.Column<Guid>(type: "uuid", nullable: false),
                    Status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    StartsAt = table.Column<DateOnly>(type: "date", nullable: false),
                    EndsAt = table.Column<DateOnly>(type: "date", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CompanyContracts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CompanyContracts_BenefitPlans_BenefitPlanId",
                        column: x => x.BenefitPlanId,
                        principalSchema: "medsync",
                        principalTable: "BenefitPlans",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_CompanyContracts_Companies_CompanyId",
                        column: x => x.CompanyId,
                        principalSchema: "medsync",
                        principalTable: "Companies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CompanyEmployees",
                schema: "medsync",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ClinicId = table.Column<Guid>(type: "uuid", nullable: false),
                    CompanyId = table.Column<Guid>(type: "uuid", nullable: false),
                    PatientId = table.Column<Guid>(type: "uuid", nullable: true),
                    Name = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    Email = table.Column<string>(type: "character varying(180)", maxLength: 180, nullable: false),
                    EmployeeCode = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CompanyEmployees", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CompanyEmployees_Companies_CompanyId",
                        column: x => x.CompanyId,
                        principalSchema: "medsync",
                        principalTable: "Companies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CompanyEmployees_Patients_PatientId",
                        column: x => x.PatientId,
                        principalSchema: "medsync",
                        principalTable: "Patients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "EmployeeEligibilities",
                schema: "medsync",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ClinicId = table.Column<Guid>(type: "uuid", nullable: false),
                    CompanyEmployeeId = table.Column<Guid>(type: "uuid", nullable: false),
                    BenefitPlanId = table.Column<Guid>(type: "uuid", nullable: false),
                    IsEligible = table.Column<bool>(type: "boolean", nullable: false),
                    EligibleFrom = table.Column<DateOnly>(type: "date", nullable: false),
                    EligibleUntil = table.Column<DateOnly>(type: "date", nullable: true),
                    Reason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EmployeeEligibilities", x => x.Id);
                    table.ForeignKey(
                        name: "FK_EmployeeEligibilities_BenefitPlans_BenefitPlanId",
                        column: x => x.BenefitPlanId,
                        principalSchema: "medsync",
                        principalTable: "BenefitPlans",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_EmployeeEligibilities_CompanyEmployees_CompanyEmployeeId",
                        column: x => x.CompanyEmployeeId,
                        principalSchema: "medsync",
                        principalTable: "CompanyEmployees",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_BenefitPlans_ClinicId_Name",
                schema: "medsync",
                table: "BenefitPlans",
                columns: new[] { "ClinicId", "Name" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Companies_ClinicId_TaxId",
                schema: "medsync",
                table: "Companies",
                columns: new[] { "ClinicId", "TaxId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CompanyContracts_BenefitPlanId",
                schema: "medsync",
                table: "CompanyContracts",
                column: "BenefitPlanId");

            migrationBuilder.CreateIndex(
                name: "IX_CompanyContracts_CompanyId_BenefitPlanId_StartsAt",
                schema: "medsync",
                table: "CompanyContracts",
                columns: new[] { "CompanyId", "BenefitPlanId", "StartsAt" });

            migrationBuilder.CreateIndex(
                name: "IX_CompanyEmployees_CompanyId_Email",
                schema: "medsync",
                table: "CompanyEmployees",
                columns: new[] { "CompanyId", "Email" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CompanyEmployees_CompanyId_EmployeeCode",
                schema: "medsync",
                table: "CompanyEmployees",
                columns: new[] { "CompanyId", "EmployeeCode" });

            migrationBuilder.CreateIndex(
                name: "IX_CompanyEmployees_PatientId",
                schema: "medsync",
                table: "CompanyEmployees",
                column: "PatientId");

            migrationBuilder.CreateIndex(
                name: "IX_EmployeeEligibilities_BenefitPlanId",
                schema: "medsync",
                table: "EmployeeEligibilities",
                column: "BenefitPlanId");

            migrationBuilder.CreateIndex(
                name: "IX_EmployeeEligibilities_CompanyEmployeeId_BenefitPlanId_Eligi~",
                schema: "medsync",
                table: "EmployeeEligibilities",
                columns: new[] { "CompanyEmployeeId", "BenefitPlanId", "EligibleFrom" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CompanyContracts",
                schema: "medsync");

            migrationBuilder.DropTable(
                name: "EmployeeEligibilities",
                schema: "medsync");

            migrationBuilder.DropTable(
                name: "BenefitPlans",
                schema: "medsync");

            migrationBuilder.DropTable(
                name: "CompanyEmployees",
                schema: "medsync");

            migrationBuilder.DropTable(
                name: "Companies",
                schema: "medsync");
        }
    }
}
