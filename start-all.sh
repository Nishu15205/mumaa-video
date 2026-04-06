#!/bin/bash
cd /home/z/my-project

# Kill old processes
pkill -f "socket-service" 2>/dev/null
pkill -f "realtime-service" 2>/dev/null
pkill -f "next dev" 2>/dev/null
pkill -f "next-server" 2>/dev/null
sleep 1

# Start realtime/socket service (port 3003 Socket.IO + port 3004 REST)
cd /home/z/my-project/mini-services/realtime-service
nohup bun index.ts > /tmp/realtime-service.log 2>&1 &
REALTIME_PID=$!
echo "Realtime service PID: $REALTIME_PID"

# Start Next.js
cd /home/z/my-project
nohup bun run dev > /tmp/nextjs.log 2>&1 &
NEXTJS_PID=$!
echo "Next.js PID: $NEXTJS_PID"

sleep 5
echo "=== Service Status ==="
ss -tlnp | grep -E "3000|3003|3004" || echo "No ports listening!"
echo "=== Recent Logs ==="
tail -5 /tmp/realtime-service.log 2>/dev/null
tail -5 /tmp/nextjs.log 2>/dev/null
