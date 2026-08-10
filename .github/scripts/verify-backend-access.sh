#!/bin/bash
#
# Script to verify backend repository accessibility
# This validates the integration-tests.yml workflow will succeed
#

set -e

echo "========================================"
echo "Backend Repository Access Verification"
echo "========================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

BACKEND_REPO="lautaro-peralta/TGS-Backend"
BACKEND_URL="https://github.com/${BACKEND_REPO}"
BACKEND_API_URL="https://api.github.com/repos/${BACKEND_REPO}"

# Test 1: Check repository accessibility via HTTP
echo "Test 1: Checking repository web accessibility..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" ${BACKEND_URL})

if [ "$HTTP_STATUS" = "200" ]; then
  echo -e "${GREEN}✅ Repository is accessible (HTTP 200)${NC}"
else
  echo -e "${RED}❌ Repository returned HTTP ${HTTP_STATUS}${NC}"
  echo "   Expected: 200"
  echo "   This will cause the workflow to fail!"
  exit 1
fi

echo ""

# Test 2: Check repository via GitHub API
echo "Test 2: Checking repository via GitHub API..."
API_RESPONSE=$(curl -s -H "Accept: application/vnd.github+json" ${BACKEND_API_URL})

# Check if response contains "id" field (indicates success)
if echo "$API_RESPONSE" | grep -q '"id"'; then
  echo -e "${GREEN}✅ Repository metadata retrieved successfully${NC}"

  # Extract and display repo info
  REPO_NAME=$(echo "$API_RESPONSE" | grep -o '"name":"[^"]*"' | head -1 | cut -d'"' -f4)
  REPO_PRIVATE=$(echo "$API_RESPONSE" | grep -o '"private":[^,]*' | head -1 | cut -d':' -f2)
  REPO_DEFAULT_BRANCH=$(echo "$API_RESPONSE" | grep -o '"default_branch":"[^"]*"' | cut -d'"' -f4)

  echo "   Repository name: ${REPO_NAME}"
  echo "   Is private: ${REPO_PRIVATE}"
  echo "   Default branch: ${REPO_DEFAULT_BRANCH}"

  if [ "$REPO_PRIVATE" = "true" ]; then
    echo -e "${YELLOW}⚠️  WARNING: Repository is PRIVATE${NC}"
    echo "   GitHub Actions will need authentication token!"
    echo "   Current workflow config does NOT include token."
  else
    echo -e "${GREEN}✅ Repository is PUBLIC - no token needed${NC}"
  fi
else
  echo -e "${RED}❌ Failed to retrieve repository metadata${NC}"
  echo "   API Response: $API_RESPONSE"
  exit 1
fi

echo ""

# Test 3: Simulate git clone (actions/checkout behavior)
echo "Test 3: Simulating GitHub Actions checkout..."
TEMP_DIR=$(mktemp -d)
trap "rm -rf ${TEMP_DIR}" EXIT

if git clone --depth 1 ${BACKEND_URL}.git ${TEMP_DIR}/backend >/dev/null 2>&1; then
  echo -e "${GREEN}✅ Git clone successful${NC}"

  # Verify directory structure
  if [ -d "${TEMP_DIR}/backend" ]; then
    echo -e "${GREEN}✅ Backend directory exists${NC}"

    # List key files
    echo ""
    echo "Key files found:"
    ls -1 ${TEMP_DIR}/backend | head -10 | while read file; do
      echo "   - $file"
    done

    # Check for package.json (required for workflow)
    if [ -f "${TEMP_DIR}/backend/package.json" ]; then
      echo -e "${GREEN}✅ package.json found (required for pnpm install)${NC}"
    else
      echo -e "${RED}❌ package.json NOT found${NC}"
      echo "   Workflow will fail at 'Install Backend Dependencies' step"
    fi
  else
    echo -e "${RED}❌ Backend directory not created${NC}"
    exit 1
  fi
else
  echo -e "${RED}❌ Git clone failed${NC}"
  echo "   This is exactly what GitHub Actions will experience"
  exit 1
fi

echo ""
echo "========================================"
echo -e "${GREEN}✅ All verification tests passed!${NC}"
echo "========================================"
echo ""
echo "The integration-tests.yml workflow should now work correctly."
echo ""
echo "Next steps:"
echo "1. Commit the changes to .github/workflows/integration-tests.yml"
echo "2. Push to trigger the workflow"
echo "3. Monitor the 'Checkout Backend' and 'Verify Backend Checkout' steps"
echo ""
