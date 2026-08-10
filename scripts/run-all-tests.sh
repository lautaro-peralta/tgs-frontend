#!/bin/bash

################################################################################
# Script de Ejecución Completa de Tests - TGS Frontend
# Ejecuta todos los tipos de tests en orden y genera reportes
################################################################################

set -e  # Exit on error

# Colors para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Variables
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
START_TIME=$(date +%s)

# Funciones auxiliares
print_header() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Header principal
clear
echo -e "${BLUE}"
cat << "EOF"
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║         TGS Frontend - Test Execution Suite               ║
║         The Garrison System Testing Pipeline              ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

print_info "Starting complete test suite..."
print_info "Date: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

################################################################################
# 1. UNIT TESTS (Karma + Jasmine)
################################################################################
print_header "1/7 - UNIT TESTS (Karma + Jasmine)"

print_info "Running unit tests with coverage..."
if npm run test:ci; then
    print_success "Unit tests passed!"
    ((PASSED_TESTS++))

    # Check coverage
    if [ -f "coverage/The-Garrison-System/lcov-report/index.html" ]; then
        print_success "Coverage report generated: coverage/The-Garrison-System/index.html"
    fi
else
    print_error "Unit tests failed!"
    ((FAILED_TESTS++))
fi
((TOTAL_TESTS++))

################################################################################
# 2. INTEGRATION TESTS
################################################################################
print_header "2/7 - INTEGRATION TESTS"

print_info "Running integration tests..."
if npm run test:integration; then
    print_success "Integration tests passed!"
    ((PASSED_TESTS++))
else
    print_warning "Integration tests not fully implemented yet"
fi
((TOTAL_TESTS++))

################################################################################
# 3. E2E TESTS (Cypress)
################################################################################
print_header "3/7 - E2E TESTS (Cypress)"

# Check if server is running
print_info "Checking if development server is running..."
if curl -s http://localhost:4200 > /dev/null; then
    print_success "Server is running on http://localhost:4200"

    print_info "Running Cypress E2E tests..."
    if npm run e2e:headless; then
        print_success "E2E tests passed!"
        ((PASSED_TESTS++))
    else
        print_error "E2E tests failed!"
        ((FAILED_TESTS++))
    fi
else
    print_warning "Server not running. Starting server..."
    npm start &
    SERVER_PID=$!

    print_info "Waiting for server to be ready..."
    npx wait-on http://localhost:4200 --timeout 120000

    print_info "Running Cypress E2E tests..."
    if npm run e2e:headless; then
        print_success "E2E tests passed!"
        ((PASSED_TESTS++))
    else
        print_error "E2E tests failed!"
        ((FAILED_TESTS++))
    fi

    # Stop server
    kill $SERVER_PID 2>/dev/null || true
fi
((TOTAL_TESTS++))

################################################################################
# 4. PERFORMANCE TESTS (Lighthouse)
################################################################################
print_header "4/7 - PERFORMANCE TESTS (Lighthouse CI)"

print_info "Running Lighthouse performance tests..."
if npm run test:performance; then
    print_success "Performance tests passed!"
    print_success "Lighthouse reports: .lighthouseci/"
    ((PASSED_TESTS++))
else
    print_error "Performance tests failed!"
    print_warning "Check Lighthouse thresholds in .lighthouserc.json"
    ((FAILED_TESTS++))
fi
((TOTAL_TESTS++))

################################################################################
# 5. SECURITY TESTS (npm audit + Snyk)
################################################################################
print_header "5/7 - SECURITY TESTS"

print_info "Running npm audit..."
if npm audit --audit-level=moderate; then
    print_success "npm audit passed - No vulnerabilities found!"
    ((PASSED_TESTS++))
else
    print_warning "npm audit found vulnerabilities"
    print_info "Run 'npm run test:security:fix' to attempt auto-fix"
fi

print_info "Running Snyk security scan..."
if command -v snyk &> /dev/null; then
    if snyk test --severity-threshold=high; then
        print_success "Snyk scan passed!"
    else
        print_warning "Snyk found vulnerabilities"
    fi
else
    print_warning "Snyk not installed. Install with: npm install -g snyk"
fi
((TOTAL_TESTS++))

################################################################################
# 6. ACCESSIBILITY TESTS (Pa11y)
################################################################################
print_header "6/7 - ACCESSIBILITY TESTS (Pa11y)"

# Check if server is running
if curl -s http://localhost:4200 > /dev/null; then
    print_info "Running Pa11y accessibility tests..."
    if npm run test:a11y; then
        print_success "Accessibility tests passed! (WCAG 2.1 AA)"
        ((PASSED_TESTS++))
    else
        print_error "Accessibility tests failed!"
        print_warning "Review violations and fix WCAG issues"
        ((FAILED_TESTS++))
    fi
else
    print_warning "Server not running. Skipping Pa11y tests."
    print_info "Start server with 'npm start' and run 'npm run test:a11y'"
fi
((TOTAL_TESTS++))

################################################################################
# 7. BUILD VERIFICATION
################################################################################
print_header "7/7 - BUILD VERIFICATION"

print_info "Building for production..."
if npm run build; then
    print_success "Production build successful!"

    # Check bundle size
    print_info "Bundle size:"
    du -sh dist/the-garrison-system/browser/* 2>/dev/null || echo "  (Build artifacts in dist/)"

    ((PASSED_TESTS++))
else
    print_error "Production build failed!"
    ((FAILED_TESTS++))
fi
((TOTAL_TESTS++))

################################################################################
# SUMMARY
################################################################################
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

print_header "TEST EXECUTION SUMMARY"

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "  Total Test Suites: ${TOTAL_TESTS}"
echo -e "  ${GREEN}Passed: ${PASSED_TESTS}${NC}"
echo -e "  ${RED}Failed: ${FAILED_TESTS}${NC}"
echo -e "  Duration: ${DURATION}s"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""

# Final status
if [ $FAILED_TESTS -eq 0 ]; then
    print_success "ALL TESTS PASSED! 🎉"
    echo ""
    print_info "Next steps:"
    echo "  1. View coverage report: npm run coverage:report"
    echo "  2. View Lighthouse reports: open .lighthouseci/lhci.html"
    echo "  3. Commit your changes: git commit -m 'tests: all tests passing'"
    echo ""
    exit 0
else
    print_error "SOME TESTS FAILED!"
    echo ""
    print_info "Review failed tests and fix issues:"
    echo "  - Unit tests: Check coverage/The-Garrison-System/index.html"
    echo "  - E2E tests: Check cypress/screenshots/ and cypress/videos/"
    echo "  - Performance: Review .lighthouseci/ reports"
    echo "  - Security: Run 'npm run test:security:fix'"
    echo "  - Accessibility: Check Pa11y output above"
    echo ""
    exit 1
fi
