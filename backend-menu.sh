#!/bin/bash

clear

cat << "EOF"
╔══════════════════════════════════════════════════════╗
║                                                      ║
║   🚀  BACKEND AUTO-START SYSTEM                     ║
║   Making your backend 100% reliable                 ║
║                                                      ║
╚══════════════════════════════════════════════════════╝
EOF

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Choose your backend startup mode:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  1) 🔧 Development Mode (with auto-reload)"
echo "     • Auto-reloads on file changes"
echo "     • Best for active development"
echo "     • Command: bun --watch backend/hono.ts"
echo ""
echo "  2) 🏃 Simple Mode (start once)"
echo "     • Just starts the backend"
echo "     • Runs until stopped"
echo "     • Command: bun backend/hono.ts"
echo ""
echo "  3) 🛡️  Production Mode (with keep-alive)"
echo "     • Auto-restarts on crashes"
echo "     • Health monitoring every 30s"
echo "     • Opens 2 terminals"
echo ""
echo "  4) 🔍 Health Check Only"
echo "     • Check if backend is running"
echo "     • No changes, just testing"
echo ""
echo "  5) 🚫 Stop All Backend Processes"
echo "     • Kills all running backend instances"
echo "     • Clean slate restart"
echo ""
echo "  6) 📖 Show Documentation"
echo "     • Quick start guide"
echo "     • Troubleshooting tips"
echo ""
echo "  0) ❌ Exit"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
read -p "Enter your choice (0-6): " choice
echo ""

case $choice in
  1)
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🔧 Starting in Development Mode..."
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "✅ Auto-reload enabled"
    echo "✅ Press Ctrl+C to stop"
    echo ""
    sleep 2
    bun --watch backend/hono.ts
    ;;
  
  2)
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🏃 Starting in Simple Mode..."
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "✅ Backend will run until stopped"
    echo "✅ Press Ctrl+C to stop"
    echo ""
    sleep 2
    bun backend/hono.ts
    ;;
  
  3)
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🛡️  Starting in Production Mode with Keep-Alive..."
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "This will open 2 terminal windows:"
    echo "  1. Backend Server"
    echo "  2. Keep-Alive Monitor"
    echo ""
    
    if command -v gnome-terminal &> /dev/null; then
      gnome-terminal -- bash -c "bun backend/hono.ts; exec bash"
      sleep 2
      gnome-terminal -- bash -c "bun backend/keep-alive.ts; exec bash"
      echo "✅ Opened in 2 GNOME Terminal windows"
    elif command -v xterm &> /dev/null; then
      xterm -e "bun backend/hono.ts" &
      sleep 2
      xterm -e "bun backend/keep-alive.ts" &
      echo "✅ Opened in 2 xterm windows"
    else
      echo "⚠️  Could not detect terminal. Running inline..."
      echo "Starting backend..."
      bun backend/hono.ts &
      BACKEND_PID=$!
      sleep 3
      echo "Starting keep-alive..."
      bun backend/keep-alive.ts
    fi
    ;;
  
  4)
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🔍 Checking Backend Health..."
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    if curl -s http://localhost:8081/health > /dev/null 2>&1; then
      echo "✅ Backend is RUNNING"
      echo ""
      echo "📊 Health Response:"
      curl -s http://localhost:8081/health | json_pp 2>/dev/null || curl -s http://localhost:8081/health
      echo ""
      echo "🌐 Endpoints Available:"
      echo "   • http://localhost:8081/ (root)"
      echo "   • http://localhost:8081/health (health check)"
      echo "   • http://localhost:8081/api/trpc (tRPC API)"
    else
      echo "❌ Backend is NOT RUNNING"
      echo ""
      echo "To start backend, choose option 1, 2, or 3"
    fi
    echo ""
    read -p "Press Enter to continue..."
    ;;
  
  5)
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🚫 Stopping All Backend Processes..."
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    # Find processes using port 8081
    if command -v lsof &> /dev/null; then
      PIDS=$(lsof -ti :8081)
      if [ -n "$PIDS" ]; then
        echo "Found processes on port 8081:"
        echo "$PIDS"
        echo ""
        read -p "Kill these processes? (y/n): " confirm
        if [ "$confirm" = "y" ]; then
          kill -9 $PIDS
          echo "✅ Killed processes on port 8081"
        else
          echo "❌ Cancelled"
        fi
      else
        echo "ℹ️  No processes found on port 8081"
      fi
    else
      echo "⚠️  lsof not available. Trying alternative..."
      pkill -f "backend/hono.ts" 2>/dev/null && echo "✅ Killed backend processes" || echo "ℹ️  No backend processes found"
      pkill -f "backend/keep-alive.ts" 2>/dev/null && echo "✅ Killed keep-alive processes" || echo "ℹ️  No keep-alive processes found"
    fi
    echo ""
    read -p "Press Enter to continue..."
    ;;
  
  6)
    clear
    cat << "DOCS"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📖  QUICK START GUIDE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 RECOMMENDED FOR DEVELOPMENT:
   bun --watch backend/hono.ts

   • Auto-reloads on file changes
   • Easiest for active development
   • Runs on port 8081

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ HOW TO VERIFY IT'S WORKING:

   1. Terminal shows: "✅ Backend server is running!"
   
   2. Test with curl:
      curl http://localhost:8081/health
   
   3. In your app (Premium page):
      • No red warning = Backend is healthy! ✅
      • Blue "Checking..." = Verifying connection
      • Red "Backend Offline" = Not running ❌

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔍 THE APP NOW AUTO-CHECKS EVERY 30 SECONDS:
   
   • Shows real-time backend status
   • Hides warning when healthy (no clutter)
   • Clear error messages when offline
   • Retry button to check immediately

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚨 TROUBLESHOOTING:

   Problem: Port 8081 already in use
   Solution: lsof -i :8081
             kill -9 <PID>

   Problem: Backend starts then stops
   Solution: Check logs for errors
             Verify env file has ARIFPAY_API_KEY
             Try: bun install

   Problem: App shows "Backend Offline"
   Solution: Verify backend is running
             Check EXPO_PUBLIC_API_URL in env
             Press "Retry" button in app

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📚 MORE DOCUMENTATION:

   • BACKEND_START_GUIDE.md - Detailed startup guide
   • BACKEND_IMPROVED.md - Technical documentation  
   • BACKEND_COMPLETE.md - Complete overview

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DOCS
    echo ""
    read -p "Press Enter to continue..."
    ;;
  
  0)
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "👋 Goodbye!"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    exit 0
    ;;
  
  *)
    echo "❌ Invalid choice. Please run the script again."
    exit 1
    ;;
esac
