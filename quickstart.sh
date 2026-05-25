#!/bin/bash
# Quick Start - University of Gondar Clearance System
# This script starts all services needed for testing

echo "🚀 Starting University of Gondar Clearance System"
echo "=================================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed${NC}"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

echo -e "${CYAN}Step 1: Checking dependencies${NC}"
npm --version
echo ""

echo -e "${CYAN}Step 2: Installing dependencies (if needed)${NC}"
if [ ! -d "node_modules" ]; then
    npm install
fi

if [ ! -d "web/node_modules" ]; then
    cd web
    npm install
    cd ..
fi

echo -e "${GREEN}✅ Dependencies ready${NC}"
echo ""

echo -e "${CYAN}Step 3: Starting services${NC}"
echo ""
echo "Opening 3 terminal windows (you may need to accept permission prompts):"
echo ""

# Function to open new terminal
open_terminal() {
    local cmd="$1"
    local title="$2"
    
    # Try different methods based on OS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        osascript -e "tell app \"Terminal\" to do script \"$cmd\""
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        gnome-terminal -- bash -c "$cmd; exec bash" 2>/dev/null || \
        xterm -e bash -c "$cmd; exec bash" 2>/dev/null || \
        echo "Please manually run: $cmd"
    else
        # Windows (Git Bash / WSL)
        start cmd /k "$cmd"
    fi
}

echo -e "${YELLOW}Terminal 1: MongoDB${NC}"
echo "Command: npm run dev:mongo"
echo ""
open_terminal "cd $(pwd) && npm run dev:mongo" "MongoDB"
sleep 2

echo -e "${YELLOW}Terminal 2: Backend${NC}"
echo "Command: npm run dev:backend"
echo ""
open_terminal "cd $(pwd) && npm run dev:backend" "Backend"
sleep 3

echo -e "${YELLOW}Terminal 3: Web${NC}"
echo "Command: npm run dev:web"
echo ""
open_terminal "cd $(pwd) && npm run dev:web" "Web Server"

echo ""
echo "=================================================="
echo -e "${GREEN}✅ Services started!${NC}"
echo ""
echo "📍 Access Points:"
echo "   - Web: http://localhost:3000"
echo "   - Backend API: http://localhost:8080/api/v1"
echo "   - MongoDB: localhost:27017"
echo ""
echo "🔑 Default Login:"
echo "   - Username: admin"
echo "   - Password: admin@123"
echo ""
echo "📖 Documentation:"
echo "   - Setup: SETUP_AND_TESTING.md"
echo "   - Testing: ISSUE_CHECKLIST_AND_FIXES.md"
echo "   - API Reference: AUTHENTICATION_AND_STAFF_VERIFICATION.md"
echo ""
echo "🧪 Run Tests:"
echo "   - Windows: powershell -ExecutionPolicy Bypass -File test-auth.ps1"
echo "   - macOS/Linux: bash test-auth.sh"
echo ""
echo "ℹ️  Note: If terminals don't open, run commands manually:"
echo "   1. npm run dev:mongo"
echo "   2. npm run dev:backend"
echo "   3. npm run dev:web"
echo ""
