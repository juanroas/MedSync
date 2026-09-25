using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MedSync.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class MoveClinicIdentityToClinic : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "ActivatedAt",
                schema: "medsync",
                table: "Clinics",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ActivationStatus",
                schema: "medsync",
                table: "Clinics",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Active");

            migrationBuilder.AddColumn<string>(
                name: "LegalName",
                schema: "medsync",
                table: "Clinics",
                type: "character varying(180)",
                maxLength: 180,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "MonthlyFee",
                schema: "medsync",
                table: "Clinics",
                type: "numeric(12,2)",
                precision: 12,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PlanName",
                schema: "medsync",
                table: "Clinics",
                type: "character varying(120)",
                maxLength: 120,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TaxId",
                schema: "medsync",
                table: "Clinics",
                type: "character varying(14)",
                maxLength: 14,
                nullable: true);

            // Each clinic's own identity lived in its oldest Company (created by sign-up/onboarding).
            migrationBuilder.Sql("""
                UPDATE medsync."Clinics" AS c
                SET "LegalName" = src."LegalName",
                    "TaxId" = src."TaxId",
                    "ActivationStatus" = CASE WHEN src."IsActive" THEN 'Active' ELSE 'Pending' END,
                    "ActivatedAt" = CASE WHEN src."IsActive" THEN src."CreatedAt" ELSE NULL END
                FROM (
                    SELECT DISTINCT ON (co."ClinicId") co."ClinicId", co."LegalName", co."TaxId", co."IsActive", co."CreatedAt"
                    FROM medsync."Companies" co
                    ORDER BY co."ClinicId", co."CreatedAt", co."Id"
                ) AS src
                WHERE c."Id" = src."ClinicId";
                """);

            migrationBuilder.Sql("""
                UPDATE medsync."Clinics" AS c
                SET "PlanName" = src."Name",
                    "MonthlyFee" = src."MonthlyFee"
                FROM (
                    SELECT DISTINCT ON (cc."ClinicId") cc."ClinicId", bp."Name", bp."MonthlyFee"
                    FROM medsync."CompanyContracts" cc
                    JOIN medsync."BenefitPlans" bp ON bp."Id" = cc."BenefitPlanId"
                    JOIN (
                        SELECT DISTINCT ON ("ClinicId") "Id"
                        FROM medsync."Companies"
                        ORDER BY "ClinicId", "CreatedAt", "Id"
                    ) AS first_company ON first_company."Id" = cc."CompanyId"
                    ORDER BY cc."ClinicId", cc."StartsAt" DESC
                ) AS src
                WHERE c."Id" = src."ClinicId";
                """);

            // The unique index below would fail on a CNPJ reused across clinics; keep it on the oldest clinic only.
            migrationBuilder.Sql("""
                UPDATE medsync."Clinics" AS c
                SET "TaxId" = NULL
                WHERE c."TaxId" IS NOT NULL
                  AND EXISTS (
                      SELECT 1 FROM medsync."Clinics" AS o
                      WHERE o."TaxId" = c."TaxId"
                        AND (o."CreatedAt", o."Id") < (c."CreatedAt", c."Id"));
                """);

            migrationBuilder.CreateIndex(
                name: "IX_Clinics_TaxId",
                schema: "medsync",
                table: "Clinics",
                column: "TaxId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Clinics_TaxId",
                schema: "medsync",
                table: "Clinics");

            migrationBuilder.DropColumn(
                name: "ActivatedAt",
                schema: "medsync",
                table: "Clinics");

            migrationBuilder.DropColumn(
                name: "ActivationStatus",
                schema: "medsync",
                table: "Clinics");

            migrationBuilder.DropColumn(
                name: "LegalName",
                schema: "medsync",
                table: "Clinics");

            migrationBuilder.DropColumn(
                name: "MonthlyFee",
                schema: "medsync",
                table: "Clinics");

            migrationBuilder.DropColumn(
                name: "PlanName",
                schema: "medsync",
                table: "Clinics");

            migrationBuilder.DropColumn(
                name: "TaxId",
                schema: "medsync",
                table: "Clinics");
        }
    }
}
