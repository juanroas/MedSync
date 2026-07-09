param(
    [string]$ApiUrl = "http://localhost:8080",
    [Parameter(Mandatory = $true)]
    [string]$DemoPassword,
    [switch]$RequireLiveKitLifecycle
)

$ErrorActionPreference = "Stop"

function Invoke-Post($Path, $Payload, $Session) {
    $json = $Payload | ConvertTo-Json -Depth 8 -Compress
    $body = [Text.Encoding]::UTF8.GetBytes($json)
    Invoke-RestMethod `
        -Uri "$ApiUrl$Path" `
        -Method Post `
        -ContentType "application/json; charset=utf-8" `
        -Body $body `
        -WebSession $Session
}

function Invoke-Get($Path, $Session) {
    Invoke-RestMethod -Uri "$ApiUrl$Path" -Method Get -WebSession $Session
}

function Write-Pass($Message) {
    Write-Host "PASS $Message" -ForegroundColor Green
}

$health = Invoke-RestMethod "$ApiUrl/health"
if ($health.status -ne "healthy") { throw "API indisponível." }
Write-Pass "API saudável"

$admin = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$adminLogin = Invoke-Post "/auth/login" @{
    email = "admin@medsync.dev"
    password = $DemoPassword
} $admin
if ($adminLogin.user.roles -notcontains "ClinicAdmin") { throw "Perfil admin ausente." }
Write-Pass "Autenticação por cookie e perfil administrativo"

$stamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$temporaryPassword = "Auditor#$stamp" + "Aa!"
$auditorEmail = "auditor.$stamp@homolog.local"
$staff = Invoke-Post "/staff-users" @{
    name = "Auditor Homologacao"
    email = $auditorEmail
    role = "PrivacyAuditor"
    temporaryPassword = $temporaryPassword
} $admin
if ($staff.role -ne "PrivacyAuditor") { throw "Perfil auditor incorreto." }
Write-Pass "Criação de conta por menor privilégio"

$auditor = New-Object Microsoft.PowerShell.Commands.WebRequestSession
Invoke-Post "/auth/login" @{
    email = $auditorEmail
    password = $temporaryPassword
} $auditor | Out-Null
$temporaryPasswordWasBlocked = $false
try {
    Invoke-Get "/audit-events" $auditor | Out-Null
}
catch {
    $temporaryPasswordWasBlocked = $_.Exception.Response.StatusCode.value__ -eq 403
}
if (-not $temporaryPasswordWasBlocked) { throw "Senha temporária não foi bloqueada." }
Write-Pass "Troca obrigatória de senha"

$newPassword = "$temporaryPassword" + "Nova!"
Invoke-Post "/auth/change-password" @{
    currentPassword = $temporaryPassword
    newPassword = $newPassword
} $auditor | Out-Null
$auditEvents = Invoke-Get "/audit-events" $auditor
if (@($auditEvents).Count -lt 1) { throw "Trilha de auditoria vazia." }
Write-Pass "Acesso do auditor à trilha da própria clínica"

$doctors = Invoke-Get "/doctors" $admin
$patients = Invoke-Get "/patients" $admin
$doctor = $doctors | Where-Object email -eq "medico@medsync.dev" | Select-Object -First 1
$patient = $patients | Where-Object email -eq "paciente@medsync.dev" | Select-Object -First 1
if (-not $doctor -or -not $patient) { throw "Contas de demonstração ausentes." }

$appointment = Invoke-Post "/appointments" @{
    doctorId = $doctor.id
    patientId = $patient.id
    scheduledAt = [DateTime]::UtcNow.AddMinutes(5).ToString("o")
    durationMinutes = 30
    notes = "Homologacao E2EE"
    price = $null
    paymentRequired = $false
} $admin
Write-Pass "Agendamento escopado pela clínica"

$patientSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
Invoke-Post "/auth/login" @{
    email = "paciente@medsync.dev"
    password = $DemoPassword
} $patientSession | Out-Null
Invoke-Post "/appointments/$($appointment.id)/consent" @{
    accepted = $true
    termVersion = "telemedicina-2026-01"
} $patientSession | Out-Null
Write-Pass "Consentimento versionado"

$doctorSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
Invoke-Post "/auth/login" @{
    email = "medico@medsync.dev"
    password = $DemoPassword
} $doctorSession | Out-Null
Invoke-Post "/consultations/$($appointment.id)/start" @{} $doctorSession | Out-Null
$doctorAccess = Invoke-Post "/consultations/$($appointment.id)/token" @{} $doctorSession
$patientAccess = Invoke-Post "/consultations/$($appointment.id)/token" @{} $patientSession
if ([string]::IsNullOrWhiteSpace($doctorAccess.encryptionKey)) {
    throw "Chave E2EE não fornecida."
}
if ($doctorAccess.encryptionKey -ne $patientAccess.encryptionKey) {
    throw "Participantes receberam chaves E2EE diferentes."
}
if ($doctorAccess.encryptionKey -eq $doctorAccess.roomName) {
    throw "A chave E2EE é previsível."
}
Write-Pass "Tokens individuais e distribuição da chave E2EE"

try {
    Invoke-Post "/consultations/$($appointment.id)/end" @{} $doctorSession | Out-Null
    Write-Pass "Desconexão e encerramento no LiveKit"
}
catch {
    if ($RequireLiveKitLifecycle) { throw }
    Write-Warning "O Room Service do LiveKit não foi homologado; execute novamente com credenciais reais e -RequireLiveKitLifecycle."
}

Write-Host "Homologação automatizada concluída." -ForegroundColor Cyan
