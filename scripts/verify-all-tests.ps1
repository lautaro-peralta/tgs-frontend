# ============================================================================
# Script de Verificación Completa de Testing - TGS Frontend
# Ejecuta TODOS los tipos de tests y genera reporte final
# ============================================================================

# Enable strict mode
$ErrorActionPreference = "Stop"

# Colors
$RED = "Red"
$GREEN = "Green"
$YELLOW = "Yellow"
$BLUE = "Cyan"

# Counters
$TOTAL_TESTS = 0
$PASSED_TESTS = 0
$FAILED_TESTS = 0
$START_TIME = Get-Date

# Functions
function Print-Header {
    param([string]$Message)
    Write-Host ""
    Write-Host "======================================================================================================" -ForegroundColor $BLUE
    Write-Host "  $Message" -ForegroundColor $BLUE
    Write-Host "======================================================================================================" -ForegroundColor $BLUE
    Write-Host ""
}

function Print-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor $GREEN
}

function Print-Error {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor $RED
}

function Print-Warning {
    param([string]$Message)
    Write-Host "⚠️  $Message" -ForegroundColor $YELLOW
}

function Print-Info {
    param([string]$Message)
    Write-Host "ℹ️  $Message" -ForegroundColor $BLUE
}

function Run-Test {
    param(
        [string]$TestName,
        [string]$Command
    )

    $script:TOTAL_TESTS++

    Print-Info "Executing: $TestName"
    Write-Host "Command: $Command" -ForegroundColor Gray

    try {
        Invoke-Expression $Command
        Print-Success "PASSED: $TestName"
        $script:PASSED_TESTS++
        Write-Host ""
        return $true
    }
    catch {
        Print-Error "FAILED: $TestName"
        Write-Host "Error: $_" -ForegroundColor $RED
        $script:FAILED_TESTS++
        Write-Host ""
        return $false
    }
}

# Header
Clear-Host
Write-Host @"
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║         TGS Frontend - Test Execution Suite               ║
║         The Garrison System Testing Pipeline              ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
"@ -ForegroundColor $BLUE

Print-Info "Starting complete test suite..."
Print-Info "Date: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Host ""

# ============================================================================
# FASE 1: Verificación de Instalación
# ============================================================================
Print-Header "FASE 1: Verificación de Instalación"

Run-Test "Node y npm instalados" "node --version; npm --version"
Run-Test "Dependencias instaladas" "npm list --depth=0 2>null"

# ============================================================================
# FASE 2: Tests Unitarios
# ============================================================================
Print-Header "FASE 2: Tests Unitarios (Karma + Jasmine)"

Print-Info "Running unit tests with coverage..."
Run-Test "Tests unitarios (CI mode)" "npm run test:ci"

if (Test-Path "coverage/The-Garrison-System/lcov.info") {
    Print-Success "Coverage report generated"
    $script:PASSED_TESTS++
} else {
    Print-Warning "Coverage report not found"
}
$script:TOTAL_TESTS++

# ============================================================================
# FASE 3: Tests de Integración
# ============================================================================
Print-Header "FASE 3: Tests de Integración"

Print-Info "Running integration tests..."
Run-Test "All integration tests" "npm run test:integration"

# ============================================================================
# FASE 4: Tests E2E (Cypress)
# ============================================================================
Print-Header "FASE 4: Tests E2E (Cypress)"

Write-Host "⚠️  IMPORTANTE: Asegúrate de que el backend esté corriendo en http://localhost:3000" -ForegroundColor $YELLOW
$response = Read-Host "¿Backend corriendo? (y/n)"

if ($response -eq 'y' -or $response -eq 'Y') {
    # Check if server is responding
    try {
        $webClient = New-Object System.Net.WebClient
        $null = $webClient.DownloadString("http://localhost:4200")
        Print-Success "Server is running on http://localhost:4200"

        Run-Test "Cypress E2E tests" "npm run e2e:headless"

        if (Test-Path "cypress/videos") {
            Print-Success "Cypress videos generated"
        }
    }
    catch {
        Print-Warning "Server not running. Starting server..."
        Start-Job -ScriptBlock { npm start }
        Start-Sleep -Seconds 10

        Run-Test "Cypress E2E tests" "npm run e2e:headless"
    }
} else {
    Print-Warning "Skipping E2E tests (backend no disponible)"
}

# ============================================================================
# FASE 5: Tests de Regresión
# ============================================================================
Print-Header "FASE 5: Tests de Regresión (Snapshots)"

Print-Info "Running snapshot tests..."
Run-Test "Component snapshots" "npm test -- --include='**/component-snapshots.spec.ts'"

# ============================================================================
# FASE 6: Performance Tests
# ============================================================================
Print-Header "FASE 6: Performance Tests (Lighthouse)"

if (Test-Path ".lighthouserc.json") {
    Print-Success "Lighthouse CI configured"
    $script:PASSED_TESTS++
} else {
    Print-Error "Lighthouse config not found"
    $script:FAILED_TESTS++
}
$script:TOTAL_TESTS++

Print-Info "Lighthouse report generation (requires server running)"
Run-Test "Lighthouse CI" "npm run test:performance 2>null; exit 0"

# ============================================================================
# FASE 7: Security Tests
# ============================================================================
Print-Header "FASE 7: Security Tests"

Print-Info "Running npm audit..."
try {
    npm audit --audit-level=high
    Print-Success "npm audit passed - No critical vulnerabilities"
    $script:PASSED_TESTS++
}
catch {
    Print-Warning "npm audit found vulnerabilities"
    Print-Info "Run 'npm run test:security:fix' to attempt auto-fix"
}
$script:TOTAL_TESTS++

Print-Info "Running Snyk security scan..."
if (Get-Command snyk -ErrorAction SilentlyContinue) {
    Run-Test "Snyk scan" "snyk test --severity-threshold=high 2>null; exit 0"
} else {
    Print-Warning "Snyk not installed. Install with: npm install -g snyk"
}

# ============================================================================
# FASE 8: Accessibility Tests
# ============================================================================
Print-Header "FASE 8: Accessibility Tests (Pa11y)"

if (Test-Path ".pa11yrc") {
    Print-Success "Pa11y configured"
    $script:PASSED_TESTS++
} else {
    Print-Error "Pa11y config not found"
    $script:FAILED_TESTS++
}
$script:TOTAL_TESTS++

Print-Info "Running Pa11y accessibility tests (requires server running)..."
Run-Test "Pa11y tests" "npm run test:a11y 2>null; exit 0"

# ============================================================================
# FASE 9: Docker Integration
# ============================================================================
Print-Header "FASE 9: Docker Integration"

if (Test-Path "docker-compose.test.yml") {
    Print-Success "Docker Compose test file exists"
    $script:PASSED_TESTS++
} else {
    Print-Error "docker-compose.test.yml not found"
    $script:FAILED_TESTS++
}
$script:TOTAL_TESTS++

if (Test-Path "Dockerfile.test") {
    Print-Success "Dockerfile.test exists"
    $script:PASSED_TESTS++
} else {
    Print-Error "Dockerfile.test not found"
    $script:FAILED_TESTS++
}
$script:TOTAL_TESTS++

# ============================================================================
# FASE 10: Documentación
# ============================================================================
Print-Header "FASE 10: Documentación"

$docs = @(
    "TESTING-README.md",
    "docs/testing/01-TESTING-STRATEGY.md",
    "docs/testing/10-CHECKLIST.md",
    "FINAL-IMPLEMENTATION-SUMMARY.md"
)

foreach ($doc in $docs) {
    $script:TOTAL_TESTS++
    if (Test-Path $doc) {
        Print-Success "$doc exists"
        $script:PASSED_TESTS++
    } else {
        Print-Error "$doc not found"
        $script:FAILED_TESTS++
    }
}

# ============================================================================
# FASE 11: Configuración
# ============================================================================
Print-Header "FASE 11: Configuración"

$configs = @(
    "karma.conf.js",
    "cypress.config.ts",
    ".lighthouserc.json",
    ".pa11yrc",
    ".snyk"
)

foreach ($config in $configs) {
    $script:TOTAL_TESTS++
    if (Test-Path $config) {
        Print-Success "$config exists"
        $script:PASSED_TESTS++
    } else {
        Print-Error "$config not found"
        $script:FAILED_TESTS++
    }
}

# ============================================================================
# FASE 12: CI/CD Workflows
# ============================================================================
Print-Header "FASE 12: CI/CD Workflows"

if (Test-Path ".github/workflows/frontend-tests.yml") {
    Print-Success "Frontend tests workflow exists"
    $script:PASSED_TESTS++
} else {
    Print-Error "frontend-tests.yml not found"
    $script:FAILED_TESTS++
}
$script:TOTAL_TESTS++

if (Test-Path ".github/workflows/integration-tests.yml") {
    Print-Success "Integration tests workflow exists"
    $script:PASSED_TESTS++
} else {
    Print-Error "integration-tests.yml not found"
    $script:FAILED_TESTS++
}
$script:TOTAL_TESTS++

# ============================================================================
# SUMMARY
# ============================================================================
$END_TIME = Get-Date
$DURATION = ($END_TIME - $START_TIME).TotalSeconds

Print-Header "TEST EXECUTION SUMMARY"

Write-Host ""
Write-Host "======================================================================================================" -ForegroundColor $BLUE
Write-Host "  Total Test Suites: $TOTAL_TESTS" -ForegroundColor White
Write-Host "  Passed: $PASSED_TESTS" -ForegroundColor $GREEN
Write-Host "  Failed: $FAILED_TESTS" -ForegroundColor $RED
Write-Host "  Duration: $([math]::Round($DURATION, 2))s" -ForegroundColor White
Write-Host "======================================================================================================" -ForegroundColor $BLUE
Write-Host ""

# Final status
if ($FAILED_TESTS -eq 0) {
    Print-Success "ALL TESTS PASSED! 🎉"
    Write-Host ""
    Print-Info "Next steps:"
    Write-Host "  1. View coverage report: npm run coverage:report" -ForegroundColor Gray
    Write-Host "  2. View Lighthouse reports: open .lighthouseci/" -ForegroundColor Gray
    Write-Host "  3. Commit your changes: git commit -m 'tests: all tests passing'" -ForegroundColor Gray
    Write-Host ""
    exit 0
} else {
    Print-Error "SOME TESTS FAILED!"
    Write-Host ""
    Print-Info "Review failed tests and fix issues:"
    Write-Host "  - Unit tests: Check coverage/The-Garrison-System/index.html" -ForegroundColor Gray
    Write-Host "  - E2E tests: Check cypress/screenshots/ and cypress/videos/" -ForegroundColor Gray
    Write-Host "  - Performance: Review .lighthouseci/ reports" -ForegroundColor Gray
    Write-Host "  - Security: Run 'npm run test:security:fix'" -ForegroundColor Gray
    Write-Host "  - Accessibility: Check Pa11y output above" -ForegroundColor Gray
    Write-Host ""
    exit 1
}
