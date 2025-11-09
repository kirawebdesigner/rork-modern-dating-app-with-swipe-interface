#!/bin/bash

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 Starting Backend & Frontend"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "📦 Starting backend server on port 8081..."
bun backend/hono.ts &
BACKEND_PID=$!

sleep 3

echo "📱 Starting Expo frontend..."
bunx rork start -p 01sqivqojn0aq61khqyvn --tunnel

trap "kill $BACKEND_PID" EXIT
