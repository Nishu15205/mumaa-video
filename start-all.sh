#!/bin/bash
cd /home/z/my-project

# Kill old processes
pkill -f "socket-service" 2>/dev/null
pkill -f "realtime-service" 2>/dev/null
pkill -f "next dev" 2>/dev/null
pkill -f "next-server" 2>/dev/null
sleep 1

# Start socket service (port 3003 Socket.IO + HTTP API)
cd /home/z/my-project/mini-services/socket-service
nohup bun --hot index.ts > /tmp/socket-service.log 2>&1 &
SOCKET_PID=$!
echo "Socket service PID: $SOCKET_PID"

# Start Next.js
cd /home/z/my-project
nohup bun run dev > /tmp/nextjs.log 2>&1 &
NEXTJS_PID=$!
echo "Next.js PID: $NEXTJS_PID"

sleep 5
echo "=== Service Status ==="
ss -tlnp | grep -E "3000|3003" || echo "No ports listening!"
echo "=== Recent Logs ==="
tail -5 /tmp/socket-service.log 2>/dev/null
tail -5 /tmp/nextjs.log 2>/dev/null
