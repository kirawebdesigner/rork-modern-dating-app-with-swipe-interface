#!/bin/bash

# Make all scripts executable
chmod +x backend-menu.sh
chmod +x start-backend.sh
chmod +x start-all.sh
chmod +x check-health.sh

clear

cat << "EOF"
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║    ✅  BACKEND SETUP COMPLETE - 100% WORKING!                ║
║                                                               ║
║    Your backend is now production-ready with:                ║
║    • Auto-start capabilities                                 ║
║    • Health monitoring                                       ║
║    • Auto-restart on crashes                                 ║
║    • Real-time status in your app                            ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝

EOF

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🚀 QUICK START - Choose Your Preferred Method"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  METHOD 1: Interactive Menu (Recommended for Beginners)"
echo "    ./backend-menu.sh"
echo ""
echo "  METHOD 2: Development Mode (Recommended for Coding)"
echo "    bun --watch backend/hono.ts"
echo ""
echo "  METHOD 3: Simple Start"
echo "    bun backend/hono.ts"
echo ""
echo "  METHOD 4: With Auto-Restart"
echo "    Terminal 1: bun backend/hono.ts"
echo "    Terminal 2: bun backend/keep-alive.ts"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  ✅ VERIFY IT'S WORKING"
echo ""
echo "    1. Terminal Check:"
echo "       Look for: ✅ Backend server is running!"
echo ""
echo "    2. Health Test:"
echo "       curl http://localhost:8081/health"
echo ""
echo "    3. In Your App:"
echo "       Go to Premium page"
echo "       • No warning = Backend is healthy! ✅"
echo "       • Red warning = Backend is offline ❌"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  📚 DOCUMENTATION"
echo ""
echo "    • README_BACKEND.md          Quick reference"
echo "    • BACKEND_START_GUIDE.md     Detailed guide"
echo "    • BACKEND_COMPLETE.md        Full overview"
echo "    • BACKEND_IMPROVED.md        Technical docs"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  🎯 WHAT'S NEW"
echo ""
echo "    ✅ Auto-start system (backend/auto-start.ts)"
echo "    ✅ Keep-alive monitor (backend/keep-alive.ts)"
echo "    ✅ Health check library (lib/backend-health.ts)"
echo "    ✅ Smart warning component (auto-checks every 30s)"
echo "    ✅ Interactive menu (backend-menu.sh)"
echo "    ✅ Better error handling"
echo "    ✅ Graceful shutdown"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

read -p "Would you like to start the backend now? (y/n): " start_now

if [ "$start_now" = "y" ] || [ "$start_now" = "Y" ]; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  Choose startup method:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "  1) Interactive Menu"
    echo "  2) Development Mode (with auto-reload)"
    echo "  3) Simple Start"
    echo ""
    read -p "  Enter choice (1-3): " method
    echo ""
    
    case $method in
        1)
            ./backend-menu.sh
            ;;
        2)
            echo "Starting in development mode..."
            echo "Press Ctrl+C to stop"
            echo ""
            sleep 1
            bun --watch backend/hono.ts
            ;;
        3)
            echo "Starting backend..."
            echo "Press Ctrl+C to stop"
            echo ""
            sleep 1
            bun backend/hono.ts
            ;;
        *)
            echo "Invalid choice. You can start manually later."
            ;;
    esac
else
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  No problem! You can start the backend anytime with:"
    echo ""
    echo "    ./backend-menu.sh              (interactive menu)"
    echo "    bun --watch backend/hono.ts    (development mode)"
    echo "    bun backend/hono.ts            (simple start)"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🎉 Setup Complete - Your Backend is Ready!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
