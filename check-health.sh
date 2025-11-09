#!/bin/bash

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 Backend & ArifPay Health Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "📋 Checking environment variables..."
if [ -f .env ]; then
  if grep -q "ARIFPAY_API_KEY=hxsMUuBvV4j3ONdDif4SRSo2cKPrMoWY" .env; then
    echo "  ✅ ARIFPAY_API_KEY is set"
  else
    echo "  ❌ ARIFPAY_API_KEY missing or incorrect"
  fi
  
  if grep -q "EXPO_PUBLIC_API_URL=http://localhost:8081" .env; then
    echo "  ✅ EXPO_PUBLIC_API_URL is set correctly"
  else
    echo "  ⚠️  EXPO_PUBLIC_API_URL might be incorrect"
  fi
else
  echo "  ❌ .env file not found"
  exit 1
fi

echo ""
echo "🌐 Testing backend server..."

if curl -s http://localhost:8081/health > /dev/null 2>&1; then
  echo "  ✅ Backend server is running!"
  echo ""
  echo "📊 Server response:"
  curl -s http://localhost:8081/health | json_pp 2>/dev/null || curl -s http://localhost:8081/health
else
  echo "  ❌ Backend server is NOT running!"
  echo ""
  echo "  🔧 To start the backend:"
  echo "     bun backend/hono.ts"
  echo ""
  exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ All checks passed!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🚀 You're ready to test payments!"
echo ""
