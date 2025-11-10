#!/bin/bash

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 Starting Backend Server"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if ! command -v bun &> /dev/null; then
    echo "❌ Bun is not installed"
    echo "Please install Bun: curl -fsSL https://bun.sh/install | bash"
    exit 1
fi

if [ ! -f "env" ]; then
    echo "⚠️  Warning: env file not found"
    echo "Using default configuration"
fi

echo "🔍 Checking if backend is already running..."
if curl -s http://localhost:8081/health > /dev/null 2>&1; then
    echo "✅ Backend is already running!"
    echo "🌐 URL: http://localhost:8081"
    exit 0
fi

echo "⏳ Starting backend server..."
echo ""

export PORT=8081
bun backend/hono.ts

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Backend server started successfully"
else
    echo ""
    echo "❌ Failed to start backend server"
    exit 1
fi
