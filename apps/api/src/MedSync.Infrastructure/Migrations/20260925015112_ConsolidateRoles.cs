using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MedSync.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class ConsolidateRoles : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsPlatform",
                schema: "medsync",
                table: "Clinics",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            // ADR-0003: MedSync staff (Médico ADM, Suporte, DPO) move to one platform clinic; clinic-side
            // admin roles collapse into ClinicAdmin; company-module roles go away. Deletes run after each
            // copy so the (ClinicId, UserId, Role) unique index never conflicts.
            migrationBuilder.Sql($"""
                INSERT INTO medsync."Clinics" ("Id", "Name", "Slug", "IsActive", "IsPlatform", "ActivationStatus", "ActivatedAt", "CreatedAt")
                VALUES ('{PlatformClinicId}', 'MedSync Operação', 'medsync-operacao', true, true, 'Active', now(), now())
                ON CONFLICT ("Id") DO UPDATE SET "IsPlatform" = true;

                INSERT INTO medsync."ClinicMemberships" ("Id", "ClinicId", "UserId", "Role", "CreatedAt")
                SELECT gen_random_uuid(), m."ClinicId", m."UserId", 'ClinicAdmin', min(m."CreatedAt")
                FROM medsync."ClinicMemberships" m
                WHERE m."Role" IN ('CompanyAdmin', 'Receptionist', 'Finance', 'MedicalDirector')
                  AND m."ClinicId" <> '{PlatformClinicId}'
                GROUP BY m."ClinicId", m."UserId"
                ON CONFLICT ("ClinicId", "UserId", "Role") DO NOTHING;

                DELETE FROM medsync."ClinicMemberships"
                WHERE "Role" IN ('CompanyAdmin', 'Receptionist', 'Finance', 'MedicalDirector')
                  AND "ClinicId" <> '{PlatformClinicId}';

                INSERT INTO medsync."ClinicMemberships" ("Id", "ClinicId", "UserId", "Role", "CreatedAt")
                SELECT gen_random_uuid(), '{PlatformClinicId}', mapped."UserId", mapped."Role", min(mapped."CreatedAt")
                FROM (
                    SELECT m."UserId", m."CreatedAt",
                           CASE m."Role"
                               WHEN 'PlatformAdmin' THEN 'MedicalDirector'
                               WHEN 'Support' THEN 'Support'
                               ELSE 'DataProtectionOfficer'
                           END AS "Role"
                    FROM medsync."ClinicMemberships" m
                    WHERE m."Role" IN ('PlatformAdmin', 'Support', 'DataProtectionOfficer', 'PlatformAuditor')
                      AND m."ClinicId" <> '{PlatformClinicId}'
                ) AS mapped
                GROUP BY mapped."UserId", mapped."Role"
                ON CONFLICT ("ClinicId", "UserId", "Role") DO NOTHING;

                DELETE FROM medsync."ClinicMemberships"
                WHERE "Role" IN ('PlatformAdmin', 'Support', 'DataProtectionOfficer', 'PlatformAuditor')
                  AND "ClinicId" <> '{PlatformClinicId}';

                DELETE FROM medsync."ClinicMemberships"
                WHERE "Role" IN ('CompanyFinance', 'CompanyAuditor', 'PlatformFinance', 'OccupationalHealthAdmin', 'PrivacyAuditor', 'PlatformAdmin', 'PlatformAuditor');
                """);
        }

        // Fixed so the seed and this migration agree on the platform clinic.
        public const string PlatformClinicId = "01000000-0000-0000-0000-000000000000";

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Role consolidation is not reversible (removed roles cannot be told apart again); only the column goes.
            migrationBuilder.DropColumn(
                name: "IsPlatform",
                schema: "medsync",
                table: "Clinics");
        }
    }
}
